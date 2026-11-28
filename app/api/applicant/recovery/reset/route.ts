import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { recoveryResetSchema } from "@/lib/validations";
import { consumeAuthGrant } from "@/lib/auth/grants";
import { revokeAllSessionsForSubject } from "@/lib/auth/session-store";
import { getRequestIp, getRequestUserAgent, logAuthEvent } from "@/lib/auth/audit-log";
import { accessCodeResetConfirmationEmail, sendAndRecordImmediateEmail } from "@/lib/email";
import { rateLimitPersistent } from "@/lib/rate-limit";
import { privateJson } from "@/lib/security/cache-policy";

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const userAgent = getRequestUserAgent(req);

  const ipLimit = await rateLimitPersistent(`recovery-reset-ip:${ip}`, 10, 10 * 60_000);
  if (!ipLimit.ok) {
    return privateJson({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = recoveryResetSchema.safeParse(body);
  if (!parsed.success) {
    return privateJson(
      { error: parsed.error.issues[0]?.message || "Invalid access code format." },
      { status: 400 }
    );
  }

  const grant = await consumeAuthGrant(parsed.data.recoveryToken, "RECOVERY");
  if (!grant || !grant.subjectIds.includes(parsed.data.applicantId)) {
    return privateJson(
      { error: "Verification session expired. Please request a new reset code." },
      { status: 401 }
    );
  }

  const applicant = await prisma.applicant.findUnique({
    where: { id: parsed.data.applicantId },
    select: { id: true, publicId: true, name: true, email: true, disabledAt: true },
  });
  if (!applicant || applicant.disabledAt) {
    return privateJson({ error: "Account not found." }, { status: 404 });
  }

  const accessCodeHash = await bcrypt.hash(parsed.data.newAccessCode.trim().toUpperCase(), 12);

  await prisma.$transaction(async (tx) => {
    await tx.applicant.update({
      where: { id: applicant.id },
      data: {
        accessCodeHash,
        sessionVersion: { increment: 1 },
      },
    });
    // Invalidate any lingering recovery OTPs for this email
    if (applicant.email) {
      await tx.emailOtp.updateMany({
        where: {
          email: applicant.email.trim().toLowerCase(),
          purpose: "RECOVERY",
          consumedAt: null,
          invalidatedAt: null,
        },
        data: { invalidatedAt: new Date() },
      });
    }
  });

  // Revoke all existing authenticated applicant sessions after credential replacement
  const revokedCount = await revokeAllSessionsForSubject("APPLICANT", applicant.id, "ACCESS_CODE_RESET");

  await logAuthEvent({
    eventType: "ACCESS_CODE_RECOVERY_COMPLETED",
    actorType: "APPLICANT",
    actorId: applicant.id,
    ip,
    userAgent,
    metadata: { publicId: applicant.publicId, revokedSessions: revokedCount },
  });

  if (applicant.email) {
    const template = accessCodeResetConfirmationEmail({ publicId: applicant.publicId });
    await sendAndRecordImmediateEmail({
      dedupeKey: `reset-confirm:${applicant.id}:${Date.now()}`,
      kind: "ACCESS_CODE_RESET",
      toEmail: applicant.email.trim().toLowerCase(),
      recipientName: applicant.name,
      subject: template.subject,
      htmlBody: template.html,
      textBody: template.text,
      applicantId: applicant.id,
    }).catch((err) => console.error("[email] reset confirmation failed:", err));
  }

  return privateJson({ ok: true, publicId: applicant.publicId });
}
