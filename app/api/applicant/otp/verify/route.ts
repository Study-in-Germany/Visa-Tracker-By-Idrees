import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { TEAM_PUBLIC_ID } from "@/lib/listings";
import { rateLimitPersistent } from "@/lib/rate-limit";
import { otpVerifySchema } from "@/lib/validations";
import { normalizeOtpEmail, verifyOtp } from "@/lib/otp";
import {
  APPLICANT_SESSION_COOKIE_NAME,
  applicantSessionCookieOptions,
  createApplicantSession,
  revokeServerSessionByToken,
} from "@/lib/auth";
import { createAuthGrant } from "@/lib/auth/grants";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { privateJson } from "@/lib/security/cache-policy";

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  const ipLimit = await rateLimitPersistent(`otp-verify-ip:${ip}`, 20, 10 * 60_000);
  if (!ipLimit.ok) {
    return privateJson(
      { error: "Too many verification attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = otpVerifySchema.safeParse(body);
  if (!parsed.success) {
    return privateJson(
      { error: parsed.error.issues[0]?.message || "Invalid verification code." },
      { status: 400 }
    );
  }

  const raw = parsed.data.identifier.trim();
  const normalized = normalizeOtpEmail(raw);
  const purpose = parsed.data.purpose;

  const isEmail = raw.includes("@");
  const matches = isEmail
    ? await prisma.applicant.findMany({
        where: {
          publicId: { not: TEAM_PUBLIC_ID },
          disabledAt: null,
          email: { equals: normalized, mode: "insensitive" },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          publicId: true,
          email: true,
          emailVerifiedAt: true,
          unsubscribeToken: true,
          consulate: true,
          university: true,
        },
        take: 10,
      })
    : await prisma.applicant.findMany({
        where: {
          publicId: raw.toUpperCase(),
          disabledAt: null,
          NOT: { publicId: TEAM_PUBLIC_ID },
        },
        select: {
          id: true,
          publicId: true,
          email: true,
          emailVerifiedAt: true,
          unsubscribeToken: true,
          consulate: true,
          university: true,
        },
        take: 1,
      });

  const resolvedEmail = matches.find((m) => !!m.email?.trim())?.email;
  if (!resolvedEmail) {
    return privateJson({ error: "Invalid or expired verification code." }, { status: 401 });
  }

  const check = await verifyOtp({
    email: resolvedEmail,
    purpose,
    code: parsed.data.code,
    consume: true,
  });

  if (!check.ok) {
    await logAuthEvent({
      eventType: "OTP_VERIFY_FAILED",
      actorType: "GUEST",
      ip,
      userAgent,
      metadata: { purpose, reason: check.reason },
    });
    const msg =
      check.reason === "EXPIRED"
        ? "That code has expired. Request a new verification code."
        : check.reason === "TOO_MANY_ATTEMPTS"
          ? "Too many incorrect attempts. Request a new verification code."
          : "Invalid or expired verification code.";
    return privateJson({ error: msg }, { status: 401 });
  }

  // Mark matched email as verified on all matched records owned by this verified email
  const now = new Date();
  await Promise.all(
    matches.map((m) =>
      !m.emailVerifiedAt || !m.unsubscribeToken
        ? prisma.applicant.update({
            where: { id: m.id },
            data: {
              emailVerifiedAt: m.emailVerifiedAt ?? now,
              unsubscribeToken: m.unsubscribeToken ?? randomBytes(24).toString("hex"),
            },
          })
        : Promise.resolve()
    )
  );

  if (purpose === "RECOVERY") {
    const grant = await createAuthGrant({
      purpose: "RECOVERY",
      email: normalizeOtpEmail(resolvedEmail),
      subjectIds: matches.map((m) => m.id),
      ttlMs: 10 * 60 * 1000,
    });
    await logAuthEvent({
      eventType: "RECOVERY_GRANT_ISSUED",
      actorType: "APPLICANT",
      actorId: matches.length === 1 ? matches[0].id : null,
      ip,
      userAgent,
      metadata: { matchCount: matches.length },
    });
    return privateJson({
      ok: true,
      recoveryToken: grant.rawToken,
      accounts: matches.map((m) => ({
        id: m.id,
        publicId: m.publicId,
        consulate: m.consulate,
        university: m.university,
      })),
    });
  }

  // LOGIN flow
  if (matches.length === 1) {
    const target = matches[0];
    const priorToken = req.cookies.get(APPLICANT_SESSION_COOKIE_NAME)?.value;
    if (priorToken) {
      await revokeServerSessionByToken(priorToken, "SESSION_ROTATED").catch(() => {});
    }

    const { rawToken, sessionId } = await createApplicantSession({
      applicantId: target.id,
      authMethod: "email_otp",
      ip,
      userAgent,
    });

    await logAuthEvent({
      eventType: "APPLICANT_LOGIN_SUCCESS",
      actorType: "APPLICANT",
      actorId: target.id,
      ip,
      userAgent,
      metadata: { publicId: target.publicId, method: "email_otp", sessionId },
    });

    const res = privateJson({ ok: true, publicId: target.publicId });
    const opts = applicantSessionCookieOptions();
    res.cookies.set(opts.name, rawToken, opts);
    return res;
  }

  // Multiple entries share this verified email — issue single-use DB selection grant
  const grant = await createAuthGrant({
    purpose: "OTP_SELECT",
    email: normalizeOtpEmail(resolvedEmail),
    subjectIds: matches.map((m) => m.id),
    ttlMs: 5 * 60 * 1000,
  });

  return privateJson({
    ok: true,
    needsAccountSelection: true,
    selectionToken: grant.rawToken,
    accounts: matches.map((m) => ({
      id: m.id,
      publicId: m.publicId,
      consulate: m.consulate,
      university: m.university,
    })),
  });
}
