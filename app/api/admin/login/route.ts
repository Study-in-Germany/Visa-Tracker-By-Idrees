import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations";
import { rateLimitPersistent } from "@/lib/rate-limit";
import { createAuthGrant } from "@/lib/auth/grants";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { privateJson } from "@/lib/security/cache-policy";

const DUMMY_BCRYPT_HASH = "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  const ipLimit = await rateLimitPersistent(`admin-login-ip:${ip}`, 15, 10 * 60_000);
  if (!ipLimit.ok) {
    await logAuthEvent({
      eventType: "ADMIN_LOGIN_RATE_LIMITED",
      actorType: "GUEST",
      ip,
      userAgent,
      metadata: { scope: "ip" },
    });
    return privateJson(
      { error: "Too many sign-in attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return privateJson({ error: "Invalid input" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  const emailLimit = await rateLimitPersistent(`admin-login-email:${email}`, 8, 10 * 60_000);
  if (!emailLimit.ok) {
    await logAuthEvent({
      eventType: "ADMIN_LOGIN_RATE_LIMITED",
      actorType: "GUEST",
      ip,
      userAgent,
      metadata: { scope: "email", email },
    });
    return privateJson(
      { error: "Too many sign-in attempts for this account. Try again later." },
      { status: 429 }
    );
  }

  const user = await prisma.adminUser.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      disabledAt: true,
      totpEnabledAt: true,
      totpSecretEnc: true,
    },
  });

  if (!user || user.disabledAt) {
    await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
    await logAuthEvent({
      eventType: "ADMIN_LOGIN_FAILED",
      actorType: "GUEST",
      ip,
      userAgent,
      metadata: { email, reason: user?.disabledAt ? "disabled" : "not_found" },
    });
    return privateJson({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await logAuthEvent({
      eventType: "ADMIN_LOGIN_FAILED",
      actorType: "ADMIN",
      actorId: user.id,
      ip,
      userAgent,
      metadata: { email: user.email, reason: "wrong_password" },
    });
    return privateJson({ error: "Invalid credentials" }, { status: 401 });
  }

  // Mandatory MFA gate: never issue an authenticated admin cookie on password alone
  if (user.totpEnabledAt && user.totpSecretEnc) {
    const grant = await createAuthGrant({
      purpose: "ADMIN_MFA_CHALLENGE",
      email: user.email,
      subjectIds: [user.id],
      adminUserId: user.id,
      ttlMs: 5 * 60 * 1000,
    });
    await logAuthEvent({
      eventType: "ADMIN_MFA_CHALLENGE_ISSUED",
      actorType: "ADMIN",
      actorId: user.id,
      ip,
      userAgent,
    });
    return privateJson({
      ok: true,
      mfaRequired: true,
      challengeToken: grant.rawToken,
    });
  }

  // First-time / un-enrolled admin must complete TOTP enrollment before receiving a full admin session
  const enrollGrant = await createAuthGrant({
    purpose: "ADMIN_MFA_ENROLL",
    email: user.email,
    subjectIds: [user.id],
    adminUserId: user.id,
    ttlMs: 10 * 60 * 1000,
  });
  await logAuthEvent({
    eventType: "ADMIN_MFA_ENROLL_REQUIRED",
    actorType: "ADMIN",
    actorId: user.id,
    ip,
    userAgent,
  });
  return privateJson({
    ok: true,
    mfaEnrollmentRequired: true,
    enrollmentToken: enrollGrant.rawToken,
  });
}
