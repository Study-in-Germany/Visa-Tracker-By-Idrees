import { VISA_STATUS_LABELS } from "@/lib/constants";
import type { ApplicantRow } from "@/lib/types";

/** Four headline stages, filled from the dates an applicant has recorded. */
export const STAGES = [
  { key: "waitingListDate", label: "Waiting list" },
  { key: "documentSubmissionDate", label: "Documents" },
  { key: "appointmentDate", label: "Appointment" },
  { key: "decisionDate", label: "Decision" },
] as const;

export const DONE_STATUSES = new Set(["VISA_ISSUED", "VISA_REJECTED", "WITHDRAWN"]);

/** Guards against typo'd dates (year 0002 etc.) leaking into the UI. */
export function plausible(v?: string | null) {
  if (!v) return false;
  const y = new Date(v).getUTCFullYear();
  return y >= 2000 && y <= 2100;
}

export function stageProgress(a: ApplicantRow) {
  if (DONE_STATUSES.has(a.visaStatus)) return { done: 4, label: VISA_STATUS_LABELS[a.visaStatus] };
  let done = 0;
  STAGES.forEach((st, i) => { if (plausible((a as any)[st.key])) done = i + 1; });
  done = Math.max(done, 1);
  return { done, label: STAGES[done - 1].label };
}

export function waitingFor(a: ApplicantRow) {
  if (DONE_STATUSES.has(a.visaStatus) || !plausible(a.waitingListDate)) return null;
  const days = Math.floor((Date.now() - new Date(a.waitingListDate as string).getTime()) / 86400000);
  if (days < 0) return null;
  if (days < 60) return `${days} ${days === 1 ? "day" : "days"}`;
  const months = Math.floor(days / 30.4);
  return months < 24 ? `${months} months` : `${(months / 12).toFixed(1)} years`;
}
