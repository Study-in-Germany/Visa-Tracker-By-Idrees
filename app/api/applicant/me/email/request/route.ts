import { NextRequest } from "next/server";
import { requireApplicant } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db";
import { rateLimitPersistent } from "@/lib/rate-limit";
import { emailVerificationRequestSchema } from "@/lib/validations";
import { invalidateOtpById, issueOtp, normalizeOtpEmail } from "@/lib/otp";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import {
  emailVerificationOtpEmail,
  isSmtpConfigured,
  sendMailWithRetry,
} from "@/lib/email";
import { privateJson } from "@/lib/security/cache-policy";

export async function POST(req: NextRequest) {
  const auth = await requireApplicant();
  if (!auth.ok) return auth.response;

  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  const rl = await rateLimitPersistent(`email-ver-req:${auth.session.applicantId}:${ip}`, 8, 10 * 60_000);
  if (!rl.ok) {
    return privateJson(
      { error: "Too many verification attempts. Please wait a few minutes." },
      { status: 429 }
    );
  }

  if (!isSmtpConfigured()) {
    return privateJson({ error: "Email service is not configured right now." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = emailVerificationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return privateJson(
      { error: parsed.error.issues[0]?.message || "Enter a valid email address." },
      { status: 400 }
    );
  }

  const applicant = await prisma.applicant.findUnique({
    where: { id: auth.session.applicantId },
    select: { id: true, name: true },
  });
  if (!applicant) return privateJson({ error: "Not found" }, { status: 404 });

  const email = normalizeOtpEmail(parsed.data.email);
  const issued = await issueOtp({
    email,
    purpose: "EMAIL_VERIFY",
    applicantId: applicant.id,
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
      { error: "Too many verification requests. Please wait 15 minutes before trying again." },
      { status: 429 }
    );
  }

  const template = emailVerificationOtpEmail({ code: issued.code, expiresMinutes: 5 });

  try {
    await sendMailWithRetry({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    await logAuthEvent({
      eventType: "EMAIL_VERIFY_OTP_SENT",
      actorType: "APPLICANT",
      actorId: applicant.id,
      ip,
      userAgent,
    });
  } catch {
    await invalidateOtpById(issued.otpId);
    return privateJson(
      { error: "Could not send verification email right now. Please try again." },
      { status: 502 }
    );
  }

  return privateJson({ ok: true, message: "Verification code sent." });
}
