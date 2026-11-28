import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { TEAM_PUBLIC_ID } from "@/lib/listings";
import { VISA_STATUS_LABELS } from "@/lib/constants";
import {
  announcementEmail,
  approvalNotificationEmail,
  statusUpdateEmail,
  submissionConfirmationEmail,
} from "./templates";
import { isSmtpConfigured, sendMailWithRetry } from "./transporter";

const RETRY_MINUTES = [1, 5, 15, 60];

function getSiteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

function buildUnsubscribeUrl(token: string): string {
  return `${getSiteUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export async function enqueueEmailJob(input: {
  dedupeKey: string;
  kind: string;
  toEmail: string;
  recipientName?: string | null;
  subject: string;
  htmlBody: string;
  textBody: string;
  applicantId?: string | null;
  announcementId?: string | null;
}) {
  try {
    return await prisma.emailJob.create({
      data: {
        dedupeKey: input.dedupeKey,
        kind: input.kind,
        toEmail: input.toEmail,
        recipientName: input.recipientName ?? null,
        subject: input.subject,
        htmlBody: input.htmlBody,
        textBody: input.textBody,
        applicantId: input.applicantId ?? null,
        announcementId: input.announcementId ?? null,
        status: "PENDING",
      },
    });
  } catch (err: unknown) {
    // Idempotent duplicate protection via unique dedupeKey (P2002)
    if (err && typeof err === "object" && (err as { code?: string }).code === "P2002") {
      return null;
    }
    throw err;
  }
}

export async function sendAndRecordImmediateEmail(input: {
  dedupeKey: string;
  kind: string;
  toEmail: string;
  recipientName?: string | null;
  subject: string;
  htmlBody: string;
  textBody: string;
  applicantId?: string | null;
  announcementId?: string | null;
}): Promise<{ delivered: boolean; queued: boolean; error?: string }> {
  const job = await enqueueEmailJob(input);
  if (!job) return { delivered: false, queued: false };

  if (!isSmtpConfigured()) {
    return { delivered: false, queued: true, error: "SMTP not configured" };
  }

  try {
    const res = await sendMailWithRetry({
      to: job.toEmail,
      subject: job.subject,
      html: job.htmlBody,
      text: job.textBody,
    });
    await prisma.emailJob.update({
      where: { id: job.id },
      data: {
        status: "SENT",
        attempts: 1,
        messageId: res.messageId || null,
        sentAt: new Date(),
        lastError: null,
      },
    });
    return { delivered: true, queued: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    await prisma.emailJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        attempts: 1,
        lastError: message.slice(0, 500),
        nextAttemptAt: new Date(Date.now() + RETRY_MINUTES[0] * 60_000),
      },
    });
    return { delivered: false, queued: true, error: message };
  }
}

export async function enqueueAnnouncementEmails(announcement: {
  id: string;
  title: string;
  body: string;
  consulate: string | null;
}): Promise<{ queuedCount: number }> {
  const candidates = await prisma.applicant.findMany({
    where: {
      publicId: { not: TEAM_PUBLIC_ID },
      approval: { not: "REJECTED" },
      email: { not: null },
      emailVerifiedAt: { not: null },
      notifyAnnouncements: true,
      ...(announcement.consulate ? { consulate: announcement.consulate } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      unsubscribeToken: true,
    },
  });

  if (candidates.length === 0) return { queuedCount: 0 };

  // Ensure unsubscribe tokens exist for all eligible recipients before composing links
  const missingTokens = candidates.filter((c) => !c.unsubscribeToken);
  if (missingTokens.length > 0) {
    await Promise.all(
      missingTokens.map((c) => {
        const token = randomBytes(24).toString("hex");
        c.unsubscribeToken = token;
        return prisma.applicant.update({
          where: { id: c.id },
          data: { unsubscribeToken: token },
        });
      })
    );
  }

  // Deduplicate recipients per announcement by email address as well as applicant id
  const seenEmails = new Set<string>();
  const rows: {
    dedupeKey: string;
    kind: string;
    toEmail: string;
    recipientName: string | null;
    subject: string;
    htmlBody: string;
    textBody: string;
    applicantId: string;
    announcementId: string;
    status: "PENDING";
  }[] = [];

  for (const c of candidates) {
    const email = (c.email || "").trim().toLowerCase();
    if (!email || seenEmails.has(email)) continue;
    seenEmails.add(email);

    const payload = announcementEmail({
      title: announcement.title,
      body: announcement.body,
      consulate: announcement.consulate,
      unsubscribeUrl: c.unsubscribeToken ? buildUnsubscribeUrl(c.unsubscribeToken) : undefined,
    });

    rows.push({
      dedupeKey: `announcement:${announcement.id}:${email}`,
      kind: "ANNOUNCEMENT",
      toEmail: email,
      recipientName: c.name,
      subject: payload.subject,
      htmlBody: payload.html,
      textBody: payload.text,
      applicantId: c.id,
      announcementId: announcement.id,
      status: "PENDING",
    });
  }

  if (rows.length === 0) return { queuedCount: 0 };

  const created = await prisma.emailJob.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return { queuedCount: created.count };
}

export async function processEmailQueue(opts?: { limit?: number; maxDurationMs?: number }) {
  const limit = opts?.limit ?? 15;
  const maxDurationMs = opts?.maxDurationMs ?? 12_000;
  const started = Date.now();

  if (!isSmtpConfigured()) {
    return { processed: 0, sent: 0, failed: 0, skipped: "SMTP not configured" };
  }

  const now = new Date();
  const due = await prisma.emailJob.findMany({
    where: {
      nextAttemptAt: { lte: now },
      OR: [
        { status: "PENDING" },
        { status: "FAILED" },
      ],
    },
    orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const job of due) {
    if (Date.now() - started >= maxDurationMs) break;
    if (job.attempts >= job.maxAttempts) continue;

    // Optimistic claim so concurrent workers don't double-send
    const claimed = await prisma.emailJob.updateMany({
      where: {
        id: job.id,
        status: { in: ["PENDING", "FAILED"] },
        attempts: job.attempts,
      },
      data: {
        status: "PROCESSING",
        attempts: job.attempts + 1,
      },
    });
    if (claimed.count === 0) continue;

    processed++;
    const nextAttemptNumber = job.attempts + 1;

    try {
      const res = await sendMailWithRetry({
        to: job.toEmail,
        subject: job.subject,
        html: job.htmlBody,
        text: job.textBody,
      });
      await prisma.emailJob.update({
        where: { id: job.id },
        data: {
          status: "SENT",
          messageId: res.messageId || null,
          sentAt: new Date(),
          lastError: null,
        },
      });
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Email send failed";
      const delayMin = RETRY_MINUTES[Math.min(nextAttemptNumber - 1, RETRY_MINUTES.length - 1)];
      await prisma.emailJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          lastError: msg.slice(0, 500),
          nextAttemptAt: new Date(Date.now() + delayMin * 60_000),
        },
      });
      failed++;
    }
  }

  return { processed, sent, failed };
}

export async function notifyApplicantSubmission(applicant: {
  id: string;
  publicId: string;
  name: string;
  email: string | null;
  consulate: string;
}): Promise<{ delivered: boolean; queued: boolean }> {
  const email = applicant.email?.trim().toLowerCase();
  if (!email) return { delivered: false, queued: false };

  const payload = submissionConfirmationEmail({
    name: applicant.name,
    publicId: applicant.publicId,
    consulate: applicant.consulate,
  });

  try {
    const res = await sendAndRecordImmediateEmail({
      dedupeKey: `submission:${applicant.id}`,
      kind: "SUBMISSION_CONFIRMATION",
      toEmail: email,
      recipientName: applicant.name,
      subject: payload.subject,
      htmlBody: payload.html,
      textBody: payload.text,
      applicantId: applicant.id,
    });
    return { delivered: res.delivered, queued: res.queued };
  } catch (err) {
    console.error("[email] submission notification failed:", err);
    return { delivered: false, queued: false };
  }
}

export async function notifyApplicantApproval(applicant: {
  id: string;
  publicId: string;
  name: string;
  email: string | null;
  approval: "APPROVED" | "REJECTED";
}) {
  const email = applicant.email?.trim().toLowerCase();
  if (!email) return;

  const payload = approvalNotificationEmail({
    name: applicant.name,
    publicId: applicant.publicId,
    approved: applicant.approval === "APPROVED",
  });

  await sendAndRecordImmediateEmail({
    dedupeKey: `approval:${applicant.id}:${applicant.approval}:${Date.now()}`,
    kind: "APPROVAL_UPDATE",
    toEmail: email,
    recipientName: applicant.name,
    subject: payload.subject,
    htmlBody: payload.html,
    textBody: payload.text,
    applicantId: applicant.id,
  }).catch((err) => console.error("[email] approval notification failed:", err));
}

export async function notifyApplicantStatusUpdate(opts: {
  applicantId: string;
  publicId: string;
  to: string | null | undefined;
  name: string;
  visaStatus: string;
  note?: string | null;
  notifyStatusUpdates?: boolean;
  unsubscribeToken?: string | null;
}) {
  const email = opts.to?.trim().toLowerCase();
  if (!email || opts.notifyStatusUpdates === false) return;

  let token = opts.unsubscribeToken ?? null;
  if (!token) {
    token = randomBytes(24).toString("hex");
    await prisma.applicant
      .update({ where: { id: opts.applicantId }, data: { unsubscribeToken: token } })
      .catch(() => null);
  }

  const label = VISA_STATUS_LABELS[opts.visaStatus] || opts.visaStatus;
  const payload = statusUpdateEmail({
    name: opts.name,
    publicId: opts.publicId,
    visaStatusLabel: label,
    note: opts.note,
    unsubscribeUrl: token ? buildUnsubscribeUrl(token) : undefined,
  });

  await sendAndRecordImmediateEmail({
    dedupeKey: `status:${opts.applicantId}:${opts.visaStatus}:${Date.now()}`,
    kind: "STATUS_UPDATE",
    toEmail: email,
    recipientName: opts.name,
    subject: payload.subject,
    htmlBody: payload.html,
    textBody: payload.text,
    applicantId: opts.applicantId,
  }).catch((err) => console.error("[email] status update failed:", err));
}
