import { fmtDate } from "@/lib/format";

export type SubmissionMilestoneKey =
  | "waitingListDate"
  | "submissionInviteDate"
  | "documentSubmissionDate"
  | "correctionRequestDate"
  | "correctionSubmittedDate"
  | "appointmentDate"
  | "interviewDate"
  | "decisionDate";

export type SubmissionMilestoneValues = Record<SubmissionMilestoneKey, string>;

export interface SubmissionStationMeta {
  key: SubmissionMilestoneKey;
  label: string;
  shortLabel: string;
  allowFuture: boolean;
}

export const CORE_SUBMISSION_STATIONS: SubmissionStationMeta[] = [
  {
    key: "waitingListDate",
    label: "Waiting-list registration",
    shortLabel: "Waiting list",
    allowFuture: false,
  },
  {
    key: "submissionInviteDate",
    label: "Submission invitation",
    shortLabel: "Invitation",
    allowFuture: false,
  },
  {
    key: "documentSubmissionDate",
    label: "Documents submitted",
    shortLabel: "Submitted",
    allowFuture: false,
  },
  {
    key: "appointmentDate",
    label: "Appointment booked",
    shortLabel: "Appt. booked",
    allowFuture: true,
  },
  {
    key: "interviewDate",
    label: "Physical interview",
    shortLabel: "Interview",
    allowFuture: true,
  },
  {
    key: "decisionDate",
    label: "Visa decision",
    shortLabel: "Decision",
    allowFuture: false,
  },
];

export const CORRECTION_SUBMISSION_STATIONS: SubmissionStationMeta[] = [
  {
    key: "correctionRequestDate",
    label: "Correction requested",
    shortLabel: "Correction req.",
    allowFuture: false,
  },
  {
    key: "correctionSubmittedDate",
    label: "Correction submitted",
    shortLabel: "Correction sent",
    allowFuture: false,
  },
];

export const ALL_SUBMISSION_MILESTONES: SubmissionStationMeta[] = [
  CORE_SUBMISSION_STATIONS[0],
  CORE_SUBMISSION_STATIONS[1],
  CORE_SUBMISSION_STATIONS[2],
  CORRECTION_SUBMISSION_STATIONS[0],
  CORRECTION_SUBMISSION_STATIONS[1],
  CORE_SUBMISSION_STATIONS[3],
  CORE_SUBMISSION_STATIONS[4],
  CORE_SUBMISSION_STATIONS[5],
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function getTodayIsoLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getMaxPlausibleDate(todayIso = getTodayIsoLocal()): string {
  const [y, m, d] = todayIso.split("-").map(Number);
  const max = new Date(Date.UTC(y + 1, (m || 1) - 1, d || 1));
  return max.toISOString().slice(0, 10);
}

function isValidCalendarDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function isFutureScheduledDate(value: string | undefined | null, todayIso = getTodayIsoLocal()): boolean {
  if (!value || !DATE_RE.test(value)) return false;
  return value > todayIso;
}

/**
 * Validates all submission milestone dates for format, bounds, future restrictions,
 * and chronological ordering without fabricating or altering any missing optional dates.
 */
export function validateSubmissionJourneyDates(
  values: Partial<SubmissionMilestoneValues>,
  todayIso = getTodayIsoLocal()
): Partial<Record<SubmissionMilestoneKey, string>> {
  const errors: Partial<Record<SubmissionMilestoneKey, string>> = {};
  const maxPlausible = getMaxPlausibleDate(todayIso);

  // 1. Individual format, lower bound, and future-date checks
  for (const meta of ALL_SUBMISSION_MILESTONES) {
    const raw = (values[meta.key] ?? "").trim();
    if (!raw) continue;
    if (!isValidCalendarDate(raw)) {
      errors[meta.key] = "Enter a valid YYYY-MM-DD date.";
      continue;
    }
    if (raw < "2018-01-01") {
      errors[meta.key] = "Date must be in 2018 or later.";
      continue;
    }
    if (!meta.allowFuture && raw > todayIso) {
      errors[meta.key] = `${meta.label} cannot be in the future.`;
      continue;
    }
    if (meta.allowFuture && raw > maxPlausible) {
      errors[meta.key] = "Date cannot be more than 1 year in the future.";
    }
  }

  // 2. Chronological checks on the core 6-station chain (skipping missing optional dates)
  for (let i = 0; i < CORE_SUBMISSION_STATIONS.length; i++) {
    const curMeta = CORE_SUBMISSION_STATIONS[i];
    const cur = (values[curMeta.key] ?? "").trim();
    if (!cur || errors[curMeta.key]) continue;

    for (let j = i - 1; j >= 0; j--) {
      const prevMeta = CORE_SUBMISSION_STATIONS[j];
      const prev = (values[prevMeta.key] ?? "").trim();
      if (!prev || errors[prevMeta.key]) continue;
      if (cur < prev) {
        errors[curMeta.key] = `${curMeta.label} cannot be earlier than ${prevMeta.label.toLowerCase()} (${fmtDate(prev)}).`;
      }
      break;
    }
  }

  // 3. Correction request / submission ordering against documents submitted, each other, and post-submission stages
  const docSub = (values.documentSubmissionDate ?? "").trim();
  const corrReq = (values.correctionRequestDate ?? "").trim();
  const corrSub = (values.correctionSubmittedDate ?? "").trim();
  const interview = (values.interviewDate ?? "").trim();
  const decision = (values.decisionDate ?? "").trim();

  if (corrReq && !errors.correctionRequestDate) {
    if (docSub && !errors.documentSubmissionDate && corrReq < docSub) {
      errors.correctionRequestDate = `Correction requested cannot be earlier than documents submitted (${fmtDate(docSub)}).`;
    } else if (decision && !errors.decisionDate && corrReq > decision) {
      errors.correctionRequestDate = `Correction requested cannot be after visa decision (${fmtDate(decision)}).`;
    }
  }

  if (corrSub && !errors.correctionSubmittedDate) {
    if (corrReq && !errors.correctionRequestDate && corrSub < corrReq) {
      errors.correctionSubmittedDate = `Correction submitted cannot be earlier than correction requested (${fmtDate(corrReq)}).`;
    } else if (docSub && !errors.documentSubmissionDate && corrSub < docSub) {
      errors.correctionSubmittedDate = `Correction submitted cannot be earlier than documents submitted (${fmtDate(docSub)}).`;
    } else if (interview && !errors.interviewDate && corrSub > interview) {
      errors.correctionSubmittedDate = `Correction submitted cannot be after physical interview (${fmtDate(interview)}).`;
    } else if (decision && !errors.decisionDate && corrSub > decision) {
      errors.correctionSubmittedDate = `Correction submitted cannot be after visa decision (${fmtDate(decision)}).`;
    }
  }

  return errors;
}
