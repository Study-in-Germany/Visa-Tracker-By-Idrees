export {
  isSmtpConfigured,
  verifySmtpConnection,
  sendMailWithRetry,
} from "./email/transporter";

export {
  enqueueEmailJob,
  sendAndRecordImmediateEmail,
  enqueueAnnouncementEmails,
  processEmailQueue,
  notifyApplicantSubmission,
  notifyApplicantApproval,
  notifyApplicantStatusUpdate,
} from "./email/queue";

export {
  loginOtpEmail,
  recoveryOtpEmail,
  emailVerificationOtpEmail,
  accessCodeResetConfirmationEmail,
  emailChangedSecurityAlertEmail,
  submissionConfirmationEmail,
  approvalNotificationEmail,
  statusUpdateEmail,
  announcementEmail,
} from "./email/templates";

import { notifyApplicantStatusUpdate } from "./email/queue";

/** Backward-compatible helper used by existing applicant PATCH endpoints. */
export async function sendStatusUpdateEmail(opts: {
  applicantId?: string;
  publicId?: string;
  to: string | null | undefined;
  name: string;
  visaStatus: string;
  note?: string | null;
  notifyStatusUpdates?: boolean;
  unsubscribeToken?: string | null;
}) {
  if (!opts.to || opts.notifyStatusUpdates === false) return;
  if (opts.applicantId && opts.publicId) {
    await notifyApplicantStatusUpdate({
      applicantId: opts.applicantId,
      publicId: opts.publicId,
      to: opts.to,
      name: opts.name,
      visaStatus: opts.visaStatus,
      note: opts.note,
      notifyStatusUpdates: opts.notifyStatusUpdates,
      unsubscribeToken: opts.unsubscribeToken,
    });
  }
}
