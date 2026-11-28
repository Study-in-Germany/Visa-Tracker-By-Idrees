import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE_NAME,
  createAdminSession,
  revokeServerSessionByToken,
  sessionCookieOptions,
} from "@/lib/auth";
import { consumeAuthGrant, peekAuthGrant } from "@/lib/auth/grants";
import {
  decryptTotpSecret,
  generateAdminRecoveryCodes,
  hashRecoveryCode,
  verifyTotpCode,
} from "@/lib/auth/totp";
import { rateLimitPersistent } from "@/lib/rate-limit";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { privateJson } from "@/lib/security/cache-policy";

const schema = z.object({
  enrollmentToken: z.string().min(10).max(200),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit authenticator code"),
});

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return privateJson(
      { error: parsed.error.issues[0]?.message || "Enter the 6-digit authenticator code." },
      { status: 400 }
    );
  }

  const grant = await peekAuthGrant(parsed.data.enrollmentToken, "ADMIN_MFA_ENROLL");
  if (!grant || !grant.adminUserId) {
    return privateJson(
      { error: "MFA enrollment session expired. Please sign in again." },
      { status: 401 }
    );
  }

  const rl = await rateLimitPersistent(`admin-mfa-enroll:${grant.id}`, 6, 10 * 60_000);
  if (!rl.ok) {
    return privateJson(
      { error: "Too many verification attempts. Please sign in again to restart enrollment." },
      { status: 429 }
    );
  }

  const payload = (grant.payload ?? {}) as { pendingSecretEnc?: string };
  if (!payload.pendingSecretEnc) {
    return privateJson(
      { error: "Authenticator setup has not started. Refresh and try again." },
      { status: 400 }
    );
  }

  let secret: string;
  try {
    secret = decryptTotpSecret(payload.pendingSecretEnc);
  } catch {
    return privateJson({ error: "Invalid enrollment state. Please sign in again." }, { status: 400 });
  }

  if (!verifyTotpCode(secret, parsed.data.code)) {
    await logAuthEvent({
      eventType: "ADMIN_MFA_ENROLL_FAILED",
      actorType: "ADMIN",
      actorId: grant.adminUserId,
      ip,
      userAgent,
    });
    return privateJson(
      { error: "That 6-digit code did not match. Check your device clock and try again." },
      { status: 401 }
    );
  }

  const consumed = await consumeAuthGrant(parsed.data.enrollmentToken, "ADMIN_MFA_ENROLL");
  if (!consumed || !consumed.adminUserId) {
    return privateJson(
      { error: "MFA enrollment session expired. Please sign in again." },
      { status: 401 }
    );
  }

  const recoveryCodes = generateAdminRecoveryCodes(10);
  const hashedCodes = await Promise.all(recoveryCodes.map((c) => hashRecoveryCode(c)));
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.adminUser.update({
      where: { id: consumed.adminUserId! },
      data: {
        totpSecretEnc: payload.pendingSecretEnc,
        totpEnabledAt: now,
        mfaUpdatedAt: now,
        tokenVersion: { increment: 1 },
      },
    });
    await tx.adminRecoveryCode.deleteMany({
      where: { adminUserId: consumed.adminUserId! },
    });
    await tx.adminRecoveryCode.createMany({
      data: hashedCodes.map((codeHash) => ({
        adminUserId: consumed.adminUserId!,
        codeHash,
      })),
    });
  });

  const priorToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (priorToken) {
    await revokeServerSessionByToken(priorToken, "SESSION_ROTATED").catch(() => {});
  }

  const { rawToken, sessionId } = await createAdminSession({
    adminUserId: consumed.adminUserId,
    authMethod: "password+totp",
    mfaVerifiedAt: now,
    amr: ["pwd", "totp"],
    ip,
    userAgent,
  });

  await logAuthEvent({
    eventType: "ADMIN_MFA_ENROLLED",
    actorType: "ADMIN",
    actorId: consumed.adminUserId,
    ip,
    userAgent,
    metadata: { sessionId },
  });

  const res = privateJson({ ok: true, recoveryCodes });
  const opts = sessionCookieOptions();
  res.cookies.set(opts.name, rawToken, opts);
  return res;
}
