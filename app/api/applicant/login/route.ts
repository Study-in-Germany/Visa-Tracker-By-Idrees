import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { applicantLoginSchema } from "@/lib/validations";
import {
  APPLICANT_SESSION_COOKIE_NAME,
  applicantSessionCookieOptions,
  createApplicantSession,
  revokeServerSessionByToken,
} from "@/lib/auth";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { rateLimitPersistent } from "@/lib/rate-limit";
import { privateJson } from "@/lib/security/cache-policy";

// Precomputed dummy bcrypt hash so unknown Tracking IDs still execute bcrypt.compare (constant-time mitigation)
const DUMMY_BCRYPT_HASH = "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  const ipLimit = await rateLimitPersistent(`applicant-login-ip:${ip}`, 20, 10 * 60_000);
  if (!ipLimit.ok) {
    await logAuthEvent({
      eventType: "APPLICANT_LOGIN_RATE_LIMITED",
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
  const parsed = applicantLoginSchema.safeParse(body);
  if (!parsed.success) {
    return privateJson({ error: "Invalid input" }, { status: 400 });
  }

  const publicId = parsed.data.publicId.trim().toUpperCase();
  const accessCode = parsed.data.accessCode.trim().toUpperCase();

  // Production safeguard: never allow development demo account authentication in production
  if (process.env.NODE_ENV === "production" && publicId.startsWith("DEMO-")) {
    await logAuthEvent({
      eventType: "DEMO_LOGIN_BLOCKED_IN_PROD",
      actorType: "GUEST",
      ip,
      userAgent,
      metadata: { publicId },
    });
    return privateJson({ error: "Invalid Tracking ID or Access Code" }, { status: 401 });
  }

  const idLimit = await rateLimitPersistent(`applicant-login-id:${publicId}`, 10, 10 * 60_000);
  if (!idLimit.ok) {
    await logAuthEvent({
      eventType: "APPLICANT_LOGIN_RATE_LIMITED",
      actorType: "GUEST",
      ip,
      userAgent,
      metadata: { scope: "publicId", publicId },
    });
    return privateJson(
      { error: "Too many sign-in attempts for this Tracking ID. Try again later or use Email OTP." },
      { status: 429 }
    );
  }

  const applicant = await prisma.applicant.findUnique({
    where: { publicId },
    select: { id: true, publicId: true, accessCodeHash: true, disabledAt: true },
  });

  if (!applicant || applicant.disabledAt) {
    await bcrypt.compare(accessCode, DUMMY_BCRYPT_HASH);
    await logAuthEvent({
      eventType: "APPLICANT_LOGIN_FAILED",
      actorType: "GUEST",
      ip,
      userAgent,
      metadata: { publicId, reason: applicant?.disabledAt ? "disabled" : "not_found" },
    });
    return privateJson({ error: "Invalid Tracking ID or Access Code" }, { status: 401 });
  }

  const ok = await bcrypt.compare(accessCode, applicant.accessCodeHash);
  if (!ok) {
    await logAuthEvent({
      eventType: "APPLICANT_LOGIN_FAILED",
      actorType: "APPLICANT",
      actorId: applicant.id,
      ip,
      userAgent,
      metadata: { publicId, reason: "wrong_code" },
    });
    return privateJson({ error: "Invalid Tracking ID or Access Code" }, { status: 401 });
  }

  // Transparently upgrade legacy cost-10 bcrypt hashes to cost-12 without breaking existing credentials
  if (applicant.accessCodeHash.startsWith("$2a$10$") || applicant.accessCodeHash.startsWith("$2b$10$")) {
    const upgraded = await bcrypt.hash(accessCode, 12);
    await prisma.applicant
      .update({ where: { id: applicant.id }, data: { accessCodeHash: upgraded } })
      .catch(() => {});
  }

  // Rotate: revoke any pre-existing applicant session held by this browser before issuing a new one
  const priorToken = req.cookies.get(APPLICANT_SESSION_COOKIE_NAME)?.value;
  if (priorToken) {
    await revokeServerSessionByToken(priorToken, "SESSION_ROTATED").catch(() => {});
  }

  const { rawToken, sessionId } = await createApplicantSession({
    applicantId: applicant.id,
    authMethod: "access_code",
    ip,
    userAgent,
  });

  await logAuthEvent({
    eventType: "APPLICANT_LOGIN_SUCCESS",
    actorType: "APPLICANT",
    actorId: applicant.id,
    ip,
    userAgent,
    metadata: { publicId: applicant.publicId, method: "access_code", sessionId },
  });

  const res = privateJson({ ok: true, publicId: applicant.publicId });
  const opts = applicantSessionCookieOptions();
  res.cookies.set(opts.name, rawToken, opts);
  return res;
}
