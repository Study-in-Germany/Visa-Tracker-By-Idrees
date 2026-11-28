import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { requireApplicant } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db";
import { emailVerificationConfirmSchema } from "@/lib/validations";
import { normalizeOtpEmail, verifyOtp } from "@/lib/otp";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { emailChangedSecurityAlertEmail, sendAndRecordImmediateEmail } from "@/lib/email";
import { privateJson } from "@/lib/security/cache-policy";

export async function POST(req: NextRequest) {
  const auth = await requireApplicant();
  if (!auth.ok) return auth.response;

  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  const body = await req.json().catch(() => null);
  const parsed = emailVerificationConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return privateJson(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const email = normalizeOtpEmail(parsed.data.email);
  const check = await verifyOtp({
    email,
    purpose: "EMAIL_VERIFY",
    code: parsed.data.code,
    consume: true,
  });

  if (!check.ok || (check.applicantId && check.applicantId !== auth.session.applicantId)) {
    const msg =
      !check.ok && check.reason === "EXPIRED"
        ? "That code has expired. Request a new code."
        : !check.ok && check.reason === "TOO_MANY_ATTEMPTS"
          ? "Too many incorrect attempts. Request a new code."
          : "Invalid verification code.";
    return privateJson({ error: msg }, { status: 400 });
  }

  const existing = await prisma.applicant.findUnique({
    where: { id: auth.session.applicantId },
    select: {
      publicId: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
      unsubscribeToken: true,
    },
  });
  if (!existing) return privateJson({ error: "Not found" }, { status: 404 });

  const previousEmail =
    existing.email && existing.emailVerifiedAt ? normalizeOtpEmail(existing.email) : null;

  const updated = await prisma.applicant.update({
    where: { id: auth.session.applicantId },
    data: {
      email,
      emailVerifiedAt: new Date(),
      unsubscribeToken: existing.unsubscribeToken ?? randomBytes(24).toString("hex"),
    },
    select: {
      email: true,
      emailVerifiedAt: true,
      notifyAnnouncements: true,
      notifyStatusUpdates: true,
    },
  });

  await logAuthEvent({
    eventType: "APPLICANT_EMAIL_VERIFIED",
    actorType: "APPLICANT",
    actorId: auth.session.applicantId,
    ip,
    userAgent,
    metadata: { changedFromPrevious: Boolean(previousEmail && previousEmail !== email) },
  });

  // Notify previous verified email address when replacing a verified email
  if (previousEmail && previousEmail !== email) {
    const alert = emailChangedSecurityAlertEmail({ publicId: existing.publicId });
    await sendAndRecordImmediateEmail({
      dedupeKey: `email-changed:${auth.session.applicantId}:${Date.now()}`,
      kind: "EMAIL_CHANGED_ALERT",
      toEmail: previousEmail,
      recipientName: existing.name,
      subject: alert.subject,
      htmlBody: alert.html,
      textBody: alert.text,
      applicantId: auth.session.applicantId,
    }).catch(() => {});
  }

  return privateJson({ ok: true, ...updated });
}
