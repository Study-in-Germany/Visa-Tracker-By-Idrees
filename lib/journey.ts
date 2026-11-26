import type { VisaStatus } from "@prisma/client";
import type { ApplicantRow } from "@/lib/types";
import { isPlausibleDate, TERMINAL_STATUSES, VISA_STATUS_STAGE } from "@/lib/status";

/** Four headline stages, aligned with canonical visa status progression. */
export const STAGES = [
  { key: "waitingListDate", label: "Waiting list" },
  { key: "documentSubmissionDate", label: "Documents" },
  { key: "appointmentDate", label: "Appointment" },
  { key: "decisionDate", label: "Decision" },
] as const;

export const DONE_STATUSES = new Set<string>(["VISA_ISSUED", "VISA_REJECTED", "WITHDRAWN"]);

/** Guards against typo'd dates (year 0002 etc.) leaking into the UI. */
export function plausible(v?: string | null) {
  return isPlausibleDate(v);
}

/**
 * Derive stage progress directly from `a.visaStatus` so progress indicators,
 * status badges, detail pages, and aggregate statistics never contradict each other.
 */
export function stageProgress(a: Pick<ApplicantRow, "visaStatus">) {
  const info = VISA_STATUS_STAGE[(a.visaStatus as VisaStatus) || "WAITING_LIST"] ?? VISA_STATUS_STAGE.WAITING_LIST;
  return {
    done: info.step,
    total: info.total,
    label: info.label,
    isTerminal: TERMINAL_STATUSES.has(a.visaStatus as VisaStatus),
  };
}

export function waitingFor(a: Pick<ApplicantRow, "visaStatus" | "waitingListDate">) {
  if (DONE_STATUSES.has(a.visaStatus) || !plausible(a.waitingListDate)) return null;
  const days = Math.floor((Date.now() - new Date(a.waitingListDate as string).getTime()) / 86400000);
  if (days < 0) return null;
  if (days < 60) return `${days} ${days === 1 ? "day" : "days"}`;
  const months = Math.floor(days / 30.4);
  return months < 24 ? `${months} months` : `${(months / 12).toFixed(1)} years`;
}

export type JourneyMilestoneKey =
  | "waitingListDate"
  | "submissionInviteDate"
  | "documentSubmissionDate"
  | "correctionRequestDate"
  | "correctionSubmittedDate"
  | "appointmentDate"
  | "interviewDate"
  | "decisionDate";

export type JourneyStep = {
  key: JourneyMilestoneKey;
  label: string;
  date: string | null;
  completed: boolean;
  isNext: boolean;
  optional: boolean;
  gapDays: number | null;
};

export type ApplicantJourney = {
  steps: JourneyStep[];
  completedCount: number;
  totalCount: number;
  percent: number;
  nextStep: JourneyStep | null;
  hasCorrection: boolean;
  canAddCorrection: boolean;
  isTerminal: boolean;
};

export type JourneyInput = {
  visaStatus: string;
  waitingListDate?: string | null;
  submissionInviteDate?: string | null;
  documentSubmissionDate?: string | null;
  correctionRequestDate?: string | null;
  correctionSubmittedDate?: string | null;
  appointmentDate?: string | null;
  interviewDate?: string | null;
  decisionDate?: string | null;
};

/**
 * Builds the applicant's contextual personal journey.
 * Standard path: Waiting List -> Submission Invitation -> Documents Submitted -> Appointment Scheduled -> Processing / Interview -> Visa Decision.
 * Conditional correction stages are included ONLY if corrections apply to this applicant.
 */
export function buildApplicantJourney(a: JourneyInput): ApplicantJourney {
  const isTerminal = DONE_STATUSES.has(a.visaStatus);
  const hasCorrection =
    plausible(a.correctionRequestDate) ||
    plausible(a.correctionSubmittedDate) ||
    a.visaStatus === "UNDER_CORRECTION";

  const rawList: { key: JourneyMilestoneKey; label: string; optional: boolean }[] = [
    { key: "waitingListDate", label: "Waiting list registration", optional: false },
    { key: "submissionInviteDate", label: "Submission invitation", optional: false },
    { key: "documentSubmissionDate", label: "Documents submitted", optional: false },
  ];

  if (hasCorrection) {
    rawList.push(
      { key: "correctionRequestDate", label: "Correction requested", optional: true },
      { key: "correctionSubmittedDate", label: "Correction submitted", optional: true },
    );
  }

  rawList.push(
    { key: "appointmentDate", label: "Appointment scheduled", optional: false },
    { key: "interviewDate", label: "Processing / Interview", optional: false },
    { key: "decisionDate", label: "Visa decision", optional: false },
  );

  // Determine completion of each applicable step consistently with visaStatus and recorded dates
  const completedFlags = rawList.map((item) => {
    const rawDate = a[item.key] ?? null;
    if (plausible(rawDate)) return true;
    if (item.key === "interviewDate") {
      return a.visaStatus === "PROCESSING" || isTerminal || plausible(a.decisionDate);
    }
    if (item.key === "decisionDate") {
      return isTerminal;
    }
    return false;
  });

  // Backfill earlier required steps if status/dates have strictly passed them (without fabricating dates)
  let highestDone = -1;
  for (let i = 0; i < completedFlags.length; i++) {
    if (completedFlags[i]) highestDone = i;
  }

  // Only advance nextStep strictly AFTER the highest reached milestone
  let nextIdx = -1;
  if (!isTerminal) {
    for (let i = highestDone + 1; i < rawList.length; i++) {
      if (!completedFlags[i]) {
        nextIdx = i;
        break;
      }
    }
  }

  let prevDateMs: number | null = null;
  const steps: JourneyStep[] = rawList.map((item, idx) => {
    const rawDate = a[item.key] ?? null;
    const validDate = plausible(rawDate) ? (rawDate as string) : null;
    let gapDays: number | null = null;
    if (validDate) {
      const ms = new Date(validDate).getTime();
      if (prevDateMs !== null) {
        const diff = Math.round((ms - prevDateMs) / 86_400_000);
        if (diff >= 0 && diff <= 730) gapDays = diff;
      }
      prevDateMs = ms;
    }

    return {
      key: item.key,
      label: item.label,
      date: validDate,
      completed: completedFlags[idx],
      isNext: idx === nextIdx,
      optional: item.optional,
      gapDays,
    };
  });

  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  return {
    steps,
    completedCount,
    totalCount,
    percent,
    nextStep: nextIdx >= 0 ? steps[nextIdx] : null,
    hasCorrection,
    canAddCorrection: !hasCorrection && !isTerminal,
    isTerminal,
  };
}
