import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { TEAM_PUBLIC_ID } from "@/lib/listings";
import { rateLimitPersistent } from "@/lib/rate-limit";
import { otpRequestSchema } from "@/lib/validations";
import { invalidateOtpById, issueOtp, normalizeOtpEmail } from "@/lib/otp";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import {
  isSmtpConfigured,
  loginOtpEmail,
  recoveryOtpEmail,
  sendMailWithRetry,
} from "@/lib/email";
import { privateJson } from "@/lib/security/cache-policy";

const GENERIC_OK = {
  ok: true,
  message: "If an eligible account matches your details, a 6-digit verification code has been sent to its registered email address.",
};

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  const ipLimit = await rateLimitPersistent(`otp-req-ip:${ip}`, 12, 10 * 60_000);
  if (!ipLimit.ok) {
    await logAuthEvent({
      eventType: "OTP_RATE_LIMITED",
      actorType: "GUEST",
      ip,
      userAgent,
      metadata: { scope: "ip" },
    });
    return privateJson(
      { error: "Too many verification requests. Please wait a few minutes before trying again." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = otpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return privateJson(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const raw = parsed.data.identifier.trim();
  const normalized = normalizeOtpEmail(raw);
  const purpose = parsed.data.purpose;

  if (process.env.NODE_ENV === "production" && !raw.includes("@") && raw.toUpperCase().startsWith("DEMO-")) {
    return privateJson(GENERIC_OK);
  }

  const idLimit = await rateLimitPersistent(`otp-req-id:${purpose}:${normalized}`, 6, 15 * 60_000);
  if (!idLimit.ok) {
    await logAuthEvent({
      eventType: "OTP_RATE_LIMITED",
      actorType: "GUEST",
      ip,
      userAgent,
      metadata: { scope: "identifier", purpose },
    });
    return privateJson(
      { error: "Too many requests for this account. Please wait a few minutes before trying again." },
      { status: 429 }
    );
  }

  if (!isSmtpConfigured()) {
    return privateJson(
      { error: "Email verification is temporarily unavailable. Use your Tracking ID and access code instead." },
      { status: 503 }
    );
  }

  // Resolve either by email or by exact uppercase publicId (excluding TEAM_PUBLIC_ID & disabled accounts)
  const isEmail = raw.includes("@");
  const matches = isEmail
    ? await prisma.applicant.findMany({
        where: {
          publicId: { not: TEAM_PUBLIC_ID },
          disabledAt: null,
          email: { equals: normalized, mode: "insensitive" },
        },
        select: { id: true, email: true },
        take: 10,
      })
    : await prisma.applicant.findMany({
        where: {
          publicId: raw.toUpperCase(),
          disabledAt: null,
          NOT: { publicId: TEAM_PUBLIC_ID },
        },
        select: { id: true, email: true },
        take: 1,
      });

  const target = matches.find((m) => !!m.email?.trim());
  if (!target || !target.email) {
    await logAuthEvent({
      eventType: "OTP_REQUESTED_NO_MATCH",
      actorType: "GUEST",
      ip,
      userAgent,
      metadata: { purpose },
    });
    return privateJson(GENERIC_OK);
  }

  const resolvedEmail = normalizeOtpEmail(target.email);
  const issued = await issueOtp({
    email: resolvedEmail,
    purpose,
    applicantId: matches.length === 1 ? target.id : null,
    requestIp: ip,
  });

  if (!issued.ok) {
    if (issued.reason === "COOLDOWN") {
      return privateJson(
        {
          error: `Please wait ${issued.retryAfterSeconds}s before requesting another code.`,
          retryAfterSeconds: issued.retryAfterSeconds,
        },
        { status: 429 }
      );
    }
    return privateJson(
      { error: "Too many verification code requests. Please wait 15 minutes before trying again." },
      { status: 429 }
    );
  }

  const template =
    purpose === "RECOVERY"
      ? recoveryOtpEmail({ code: issued.code, expiresMinutes: 5 })
      : loginOtpEmail({ code: issued.code, expiresMinutes: 5 });

  // Send OTP directly over TLS SMTP without persisting plaintext OTPs in EmailJob
  try {
    await sendMailWithRetry({
      to: resolvedEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    await logAuthEvent({
      eventType: purpose === "RECOVERY" ? "RECOVERY_OTP_SENT" : "LOGIN_OTP_SENT",
      actorType: "APPLICANT",
      actorId: matches.length === 1 ? target.id : null,
      ip,
      userAgent,
      metadata: { purpose, matchCount: matches.length },
    });
  } catch (err) {
    // Invalidate the challenge immediately if delivery fails so an undelivered OTP cannot linger
    await invalidateOtpById(issued.otpId);
    console.error("[otp] immediate SMTP delivery failed:", err instanceof Error ? err.message : "unknown");
    await logAuthEvent({
      eventType: "OTP_DELIVERY_FAILED",
      actorType: "SYSTEM",
      actorId: matches.length === 1 ? target.id : null,
      ip,
      userAgent,
      metadata: { purpose },
    });
  }

  return privateJson(GENERIC_OK);
}
