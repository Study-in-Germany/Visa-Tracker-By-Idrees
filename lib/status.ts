import type { VisaStatus } from "@prisma/client";

export type StageInfo = {
  step: 1 | 2 | 3 | 4;
  total: 4;
  label: string;
  isTerminal: boolean;
};

/** Canonical mapping from VisaStatus to high-level journey step (1..4). */
export const VISA_STATUS_STAGE: Record<VisaStatus, StageInfo> = {
  WAITING_LIST: { step: 1, total: 4, label: "Waiting list", isTerminal: false },
  WAITING_FOR_SUBMISSION: { step: 2, total: 4, label: "Invited", isTerminal: false },
  SUBMISSION_RECEIVED: { step: 2, total: 4, label: "Documents submitted", isTerminal: false },
  UNDER_CORRECTION: { step: 2, total: 4, label: "Correction requested", isTerminal: false },
  APPOINTMENT_SCHEDULED: { step: 3, total: 4, label: "Appointment", isTerminal: false },
  PROCESSING: { step: 3, total: 4, label: "Processing", isTerminal: false },
  VISA_ISSUED: { step: 4, total: 4, label: "Visa issued", isTerminal: true },
  VISA_REJECTED: { step: 4, total: 4, label: "Visa rejected", isTerminal: true },
  WITHDRAWN: { step: 4, total: 4, label: "Withdrawn", isTerminal: true },
  OTHER: { step: 1, total: 4, label: "Other", isTerminal: false },
};

const STATUS_RANK: Record<VisaStatus, number> = {
  OTHER: 0,
  WAITING_LIST: 1,
  WAITING_FOR_SUBMISSION: 2,
  SUBMISSION_RECEIVED: 3,
  UNDER_CORRECTION: 4,
  APPOINTMENT_SCHEDULED: 5,
  PROCESSING: 6,
  VISA_ISSUED: 7,
  VISA_REJECTED: 7,
  WITHDRAWN: 7,
};

export const TERMINAL_STATUSES = new Set<VisaStatus>(["VISA_ISSUED", "VISA_REJECTED", "WITHDRAWN"]);

export type MilestoneDates = {
  waitingListDate?: Date | string | null;
  submissionInviteDate?: Date | string | null;
  documentSubmissionDate?: Date | string | null;
  correctionRequestDate?: Date | string | null;
  correctionSubmittedDate?: Date | string | null;
  appointmentDate?: Date | string | null;
  interviewDate?: Date | string | null;
  decisionDate?: Date | string | null;
};

function toDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Guards against typo'd dates (year 0002, far future, etc.) leaking into status/progress logic. */
export function isPlausibleDate(value?: Date | string | null): boolean {
  const d = toDate(value);
  if (!d) return false;
  const y = d.getUTCFullYear();
  return y >= 2000 && y <= 2100;
}

function isChronological(value: Date | string | null | undefined, waitingListDate: Date | null): boolean {
  const d = toDate(value);
  if (!d || !isPlausibleDate(d)) return false;
  // Ignore obvious far-future typos (> 2 years ahead)
  const maxFuture = Date.now() + 2 * 365 * 86_400_000;
  if (d.getTime() > maxFuture) return false;
  // Ignore non-chronological typos where a downstream date precedes waitingListDate
  if (waitingListDate && d.getTime() < waitingListDate.getTime()) return false;
  return true;
}

export function getStatusRank(status: string): number {
  return STATUS_RANK[status as VisaStatus] ?? 0;
}

/**
 * Single source of truth for deriving an applicant's VisaStatus from recorded milestones
 * and any explicit status.
 *
 * Rules:
 * - Explicit terminal statuses (VISA_ISSUED, VISA_REJECTED, WITHDRAWN) are always preserved.
 * - Never guesses Issued vs Rejected from decisionDate alone; maps unlabelled interview/decision dates to PROCESSING.
 * - Ignores non-chronological typo dates (downstream date < waitingListDate) or implausible years.
 * - Never downgrades an explicit status that is already at a higher progression rank than inferred.
 */
export function deriveVisaStatus(
  record: MilestoneDates,
  explicitStatus?: VisaStatus | string | null,
): VisaStatus {
  const explicit = (explicitStatus && explicitStatus in STATUS_RANK ? explicitStatus : null) as VisaStatus | null;

  if (explicit && TERMINAL_STATUSES.has(explicit)) {
    return explicit;
  }

  const wlRaw = toDate(record.waitingListDate);
  const wl = wlRaw && isPlausibleDate(wlRaw) ? wlRaw : null;

  const hasInvite = isChronological(record.submissionInviteDate, wl);
  const hasDocs = isChronological(record.documentSubmissionDate, wl);
  const hasCorrReq = isChronological(record.correctionRequestDate, wl);
  const hasCorrSub = isChronological(record.correctionSubmittedDate, wl);
  const hasAppt = isChronological(record.appointmentDate, wl);
  const hasInterview = isChronological(record.interviewDate, wl);
  const hasDecision = isChronological(record.decisionDate, wl);

  let inferred: VisaStatus = "WAITING_LIST";
  if (hasInterview || hasDecision) {
    inferred = "PROCESSING";
  } else if (hasAppt) {
    inferred = "APPOINTMENT_SCHEDULED";
  } else if (hasCorrReq && !hasCorrSub) {
    inferred = "UNDER_CORRECTION";
  } else if (hasDocs || hasCorrSub) {
    inferred = "SUBMISSION_RECEIVED";
  } else if (hasInvite) {
    inferred = "WAITING_FOR_SUBMISSION";
  }

  if (explicit && STATUS_RANK[explicit] >= STATUS_RANK[inferred]) {
    return explicit;
  }
  return inferred;
}
