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
  verifyRecoveryCodeHash,
  verifyTotpCode,
} from "@/lib/auth/totp";
import { rateLimitPersistent } from "@/lib/rate-limit";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { privateJson } from "@/lib/security/cache-policy";

const schema = z.object({
  challengeToken: z.string().min(10).max(200),
  code: z.string().trim().min(6).max(32),
  isRecoveryCode: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  const ipLimit = await rateLimitPersistent(`admin-mfa-ip:${ip}`, 20, 10 * 60_000);
  if (!ipLimit.ok) {
    return privateJson(
      { error: "Too many verification attempts. Please wait a few minutes." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return privateJson({ error: "Invalid verification code." }, { status: 400 });
  }

  const grant = await peekAuthGrant(parsed.data.challengeToken, "ADMIN_MFA_CHALLENGE");
  if (!grant || !grant.adminUserId) {
    return privateJson(
      { error: "Verification session expired. Please sign in again." },
      { status: 401 }
    );
  }

  const challengeLimit = await rateLimitPersistent(`admin-mfa-chal:${grant.id}`, 6, 10 * 60_000);
  if (!challengeLimit.ok) {
    return privateJson(
      { error: "Too many incorrect attempts. Please sign in again." },
      { status: 429 }
    );
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: grant.adminUserId },
    select: {
      id: true,
      email: true,
      disabledAt: true,
      totpEnabledAt: true,
      totpSecretEnc: true,
    },
  });
  if (!user || user.disabledAt || !user.totpEnabledAt || !user.totpSecretEnc) {
    return privateJson({ error: "Administrator account unavailable." }, { status: 401 });
  }

  const now = new Date();
  let usedRecoveryCodeId: string | null = null;

  if (parsed.data.isRecoveryCode) {
    const unusedCodes = await prisma.adminRecoveryCode.findMany({
      where: { adminUserId: user.id, usedAt: null },
      select: { id: true, codeHash: true },
    });
    for (const rc of unusedCodes) {
      if (await verifyRecoveryCodeHash(parsed.data.code, rc.codeHash)) {
        const claimed = await prisma.adminRecoveryCode.updateMany({
          where: { id: rc.id, usedAt: null },
          data: { usedAt: now },
        });
        if (claimed.count > 0) {
          usedRecoveryCodeId = rc.id;
        }
        break;
      }
    }
    if (!usedRecoveryCodeId) {
      await logAuthEvent({
        eventType: "ADMIN_MFA_FAILED",
        actorType: "ADMIN",
        actorId: user.id,
        ip,
        userAgent,
        metadata: { method: "recovery_code" },
      });
      return privateJson({ error: "Invalid or already used recovery code." }, { status: 401 });
    }
  } else {
    let secret: string;
    try {
      secret = decryptTotpSecret(user.totpSecretEnc);
    } catch {
      return privateJson({ error: "MFA configuration error." }, { status: 500 });
    }
    if (!verifyTotpCode(secret, parsed.data.code)) {
      await logAuthEvent({
        eventType: "ADMIN_MFA_FAILED",
        actorType: "ADMIN",
        actorId: user.id,
        ip,
        userAgent,
        metadata: { method: "totp" },
      });
      return privateJson({ error: "Invalid authenticator code." }, { status: 401 });
    }
  }

  const consumed = await consumeAuthGrant(parsed.data.challengeToken, "ADMIN_MFA_CHALLENGE");
  if (!consumed) {
    return privateJson(
      { error: "Verification session expired. Please sign in again." },
      { status: 401 }
    );
  }

  const priorToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (priorToken) {
    await revokeServerSessionByToken(priorToken, "SESSION_ROTATED").catch(() => {});
  }

  const authMethod = usedRecoveryCodeId ? "password+recovery_code" : "password+totp";
  const { rawToken, sessionId } = await createAdminSession({
    adminUserId: user.id,
    authMethod,
    mfaVerifiedAt: now,
    amr: ["pwd", usedRecoveryCodeId ? "recovery_code" : "totp"],
    ip,
    userAgent,
  });

  await logAuthEvent({
    eventType: usedRecoveryCodeId ? "ADMIN_RECOVERY_LOGIN_SUCCESS" : "ADMIN_LOGIN_SUCCESS",
    actorType: "ADMIN",
    actorId: user.id,
    ip,
    userAgent,
    metadata: { sessionId, authMethod, recoveryCodeId: usedRecoveryCodeId },
  });

  const res = privateJson({ ok: true, usedRecoveryCode: Boolean(usedRecoveryCodeId) });
  const opts = sessionCookieOptions();
  res.cookies.set(opts.name, rawToken, opts);
  return res;
}
