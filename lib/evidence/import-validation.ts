import type { ParsedQueueRecord, ParsedTimelineRecord } from "./observation-parser";

const DAY_MS = 86_400_000;
const MIN_PLAUSIBLE_MS = Date.UTC(2020, 0, 1);

export interface ValidationOutcome {
  status: "APPROVED" | "PENDING_REVIEW" | "CONFLICTING";
  conflictNotes: string | null;
}

/** Validates chronological ordering and date bounds on parsed community timeline records. */
export function validateTimelineObservation(obs: ParsedTimelineRecord): ValidationOutcome {
  const maxAllowedMs = Math.max(Date.now(), obs.reportPublishedAt.getTime()) + 14 * DAY_MS;
  const issues: string[] = [];

  const checkBound = (label: string, d: Date | null) => {
    if (!d) return;
    if (d.getTime() < MIN_PLAUSIBLE_MS) issues.push(`${label} before 2020`);
    if (d.getTime() > maxAllowedMs) issues.push(`${label} after report date`);
  };

  checkBound("waitingListJoinedDate", obs.waitingListJoinedDate);
  checkBound("submissionInvitedDate", obs.submissionInvitedDate);
  checkBound("documentsSubmittedDate", obs.documentsSubmittedDate);
  checkBound("appointmentInvitedDate", obs.appointmentInvitedDate);
  checkBound("appointmentAttendedDate", obs.appointmentAttendedDate);
  checkBound("decisionDate", obs.decisionDate);
  checkBound("passportReceivedDate", obs.passportReceivedDate);

  const checkOrder = (aLabel: string, a: Date | null, bLabel: string, b: Date | null, maxGapDays: number) => {
    if (!a || !b) return;
    const diffDays = (b.getTime() - a.getTime()) / DAY_MS;
    if (diffDays < -2) {
      issues.push(`${bLabel} precedes ${aLabel}`);
    } else if (diffDays > maxGapDays) {
      issues.push(`${aLabel} to ${bLabel} exceeds ${maxGapDays}d (${Math.round(diffDays)}d)`);
    }
  };

  checkOrder("waitingList", obs.waitingListJoinedDate, "submissionInvite", obs.submissionInvitedDate, 730);
  checkOrder("submissionInvite", obs.submissionInvitedDate, "documentsSubmitted", obs.documentsSubmittedDate, 180);
  checkOrder("documentsSubmitted", obs.documentsSubmittedDate, "appointmentInvite", obs.appointmentInvitedDate, 365);
  checkOrder("appointmentInvite", obs.appointmentInvitedDate, "appointmentAttended", obs.appointmentAttendedDate, 180);
  checkOrder("appointmentAttended", obs.appointmentAttendedDate, "decisionDate", obs.decisionDate, 365);
  checkOrder("decisionDate", obs.decisionDate, "passportReceived", obs.passportReceivedDate, 90);

  if (issues.length > 0) {
    return { status: "CONFLICTING", conflictNotes: issues.join("; ") };
  }

  return {
    status: obs.datePrecision === "EXACT" ? "APPROVED" : "PENDING_REVIEW",
    conflictNotes: null,
  };
}

/** Validates chronological sanity on daily or snapshot queue observations. */
export function validateQueueObservation(obs: ParsedQueueRecord): ValidationOutcome {
  const issues: string[] = [];
  const oMs = obs.observationDate.getTime();
  const fMs = obs.observedFrontierDate.getTime();

  if (oMs < MIN_PLAUSIBLE_MS || fMs < MIN_PLAUSIBLE_MS) {
    issues.push("Observation or frontier date before 2020");
  }
  if (fMs - oMs > 7 * DAY_MS) {
    issues.push("Frontier date lies after observation date");
  }
  if (oMs - fMs > 730 * DAY_MS) {
    issues.push("Frontier lag exceeds 730 days");
  }

  if (issues.length > 0) {
    return { status: "CONFLICTING", conflictNotes: issues.join("; ") };
  }
  return { status: "APPROVED", conflictNotes: null };
}
