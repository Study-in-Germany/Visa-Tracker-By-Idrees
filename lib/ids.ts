import { randomInt } from "node:crypto";
import { CONSULATE_CODES } from "@/lib/constants";

export function getPublicIdPrefix(consulate: string) {
  const code = CONSULATE_CODES[consulate] || "GEN";
  return `PK-${code}-`;
}

// Builds a public tracking code like PK-ISB-10482
export function buildPublicId(consulate: string, sequence: number | bigint) {
  return `${getPublicIdPrefix(consulate)}${String(sequence).padStart(5, "0")}`;
}

/**
 * Generates an access code like "7K4T-92XQ-M8NP" using Node's CSPRNG (`crypto.randomInt`)
 * with an unambiguous 32-character alphabet (60 bits of entropy) so applicants can read and type it reliably.
 */
export function generateAccessCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () =>
    Array.from({ length: 4 }, () => chars[randomInt(0, chars.length)]).join("");
  return `${part()}-${part()}-${part()}`;
}

/** Derives the initial VisaStatus from milestone dates submitted by the applicant. */
export function deriveInitialVisaStatus(dates: {
  waitingListDate?: string | Date | null;
  submissionInviteDate?: string | Date | null;
  documentSubmissionDate?: string | Date | null;
  correctionRequestDate?: string | Date | null;
  correctionSubmittedDate?: string | Date | null;
  appointmentDate?: string | Date | null;
  interviewDate?: string | Date | null;
  decisionDate?: string | Date | null;
}) {
  if (dates.decisionDate || dates.interviewDate) return "PROCESSING" as const;
  if (dates.appointmentDate) return "APPOINTMENT_SCHEDULED" as const;
  if (dates.correctionRequestDate && !dates.correctionSubmittedDate) return "UNDER_CORRECTION" as const;
  if (dates.documentSubmissionDate || dates.correctionSubmittedDate) return "SUBMISSION_RECEIVED" as const;
  if (dates.submissionInviteDate) return "WAITING_FOR_SUBMISSION" as const;
  return "WAITING_LIST" as const;
}
