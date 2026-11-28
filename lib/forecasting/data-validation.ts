import { createHash } from "node:crypto";
import { diffDays, parseValidUtcDay, toIsoDay } from "./date-utils";
import type { Embassy, NormalizedJourneyRecord } from "./types";

const EXCLUDED_VISA_RE = /\b(frv|family|reunion|spouse|employment|job\s*seeker|chancenkarte|opportunity|schengen|tourist|visit|business|medical)\b/i;

export function isEligibleStudentVisa(visaType: string | null | undefined): boolean {
  if (!visaType || !visaType.trim()) return true;
  return !EXCLUDED_VISA_RE.test(visaType);
}

export function normalizeEmbassy(consulate: string | null | undefined): Embassy | null {
  if (!consulate) return null;
  if (/islamabad|isl|isb/i.test(consulate)) return "Islamabad";
  if (/karachi|khi/i.test(consulate)) return "Karachi";
  return null;
}

export function plausibleDuration(start: Date | null, end: Date | null, maxDays: number): number | null {
  if (!start || !end) return null;
  const d = diffDays(start, end);
  if (d < 0 || d > maxDays) return null;
  return d;
}

export function normalizeInternalApplicant(row: {
  id: string;
  consulate: string;
  visaType?: string | null;
  visaStatus: string;
  waitingListDate?: Date | string | null;
  submissionInviteDate?: Date | string | null;
  documentSubmissionDate?: Date | string | null;
  preliminaryReviewDate?: Date | string | null;
  correctionRequestDate?: Date | string | null;
  correctionSubmittedDate?: Date | string | null;
  correctionAcceptedDate?: Date | string | null;
  appointmentInviteDate?: Date | string | null;
  appointmentDate?: Date | string | null;
  interviewDate?: Date | string | null;
  decisionDate?: Date | string | null;
  passportDispatchedDate?: Date | string | null;
  passportReceivedDate?: Date | string | null;
  lastConfirmedAt?: Date | string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
}, now: Date): NormalizedJourneyRecord | null {
  if (!isEligibleStudentVisa(row.visaType)) return null;
  const embassy = normalizeEmbassy(row.consulate);
  if (!embassy) return null;

  const maxFuture = now.getTime() + 14 * 86_400_000;
  const wl = parseValidUtcDay(row.waitingListDate, maxFuture);
  const si = parseValidUtcDay(row.submissionInviteDate, maxFuture);
  const ds = parseValidUtcDay(row.documentSubmissionDate, maxFuture);
  const pr = parseValidUtcDay(row.preliminaryReviewDate, maxFuture);
  const cr = parseValidUtcDay(row.correctionRequestDate, maxFuture);
  const cs = parseValidUtcDay(row.correctionSubmittedDate, maxFuture);
  const ca = parseValidUtcDay(row.correctionAcceptedDate, maxFuture);
  // Note: legacy records stored appointment notification/schedule in `appointmentDate` when `appointmentInviteDate` wasn't separated yet.
  const ai = parseValidUtcDay(row.appointmentInviteDate, maxFuture) ?? parseValidUtcDay(row.appointmentDate, maxFuture);
  const ab = parseValidUtcDay(row.appointmentDate, maxFuture);
  const at = parseValidUtcDay(row.interviewDate, maxFuture);
  const dc = parseValidUtcDay(row.decisionDate, maxFuture);
  const pd = parseValidUtcDay(row.passportDispatchedDate, maxFuture);
  const prc = parseValidUtcDay(row.passportReceivedDate, maxFuture);

  const decisionOutcome =
    row.visaStatus === "VISA_ISSUED"
      ? "APPROVED"
      : row.visaStatus === "VISA_REJECTED"
        ? "REJECTED"
        : row.visaStatus === "WITHDRAWN"
          ? "WITHDRAWN"
          : null;

  const updated = parseValidUtcDay(row.updatedAt) ?? now;
  const lastConfirmed = parseValidUtcDay(row.lastConfirmedAt) ?? updated;
  const created = parseValidUtcDay(row.createdAt) ?? updated;

  const fp = createHash("sha256")
    .update(`int:${embassy}|${toIsoDay(wl) ?? ""}|${toIsoDay(si) ?? ""}|${toIsoDay(ai) ?? ""}|${toIsoDay(dc) ?? ""}`)
    .digest("hex");

  return {
    id: row.id,
    sourceType: "internal",
    embassy,
    visaCategory: "Study",
    reliability: "VERIFIED_COMMUNITY",
    confidence: 0.95,
    reportDate: created,
    lastConfirmedAt: lastConfirmed,
    waitingListJoinedDate: wl,
    submissionInvitedDate: si,
    documentsSubmittedDate: ds,
    preliminaryReviewDate: pr,
    correctionRequestDates: cr ? [cr] : [],
    correctionResponseDates: cs ? [cs] : [],
    correctionAcceptedDate: ca,
    appointmentInvitedDate: ai,
    appointmentBookedDate: ab,
    appointmentAttendedDate: at,
    decisionDate: dc,
    decisionOutcome,
    passportDispatchedDate: pd,
    passportReceivedDate: prc,
    fingerprint: fp,
  };
}

export function normalizeExternalTimeline(row: {
  id: string;
  embassy: string;
  visaCategory: string;
  reliability?: string;
  confidence: number;
  reportPublishedAt: Date | string;
  waitingListJoinedDate?: Date | string | null;
  submissionInvitedDate?: Date | string | null;
  documentsSubmittedDate?: Date | string | null;
  preliminaryReviewDate?: Date | string | null;
  correctionRequestDates?: unknown;
  correctionResponseDates?: unknown;
  correctionAcceptedDate?: Date | string | null;
  appointmentInvitedDate?: Date | string | null;
  appointmentBookedDate?: Date | string | null;
  appointmentAttendedDate?: Date | string | null;
  decisionDate?: Date | string | null;
  decisionOutcome?: string | null;
  passportDispatchedDate?: Date | string | null;
  passportReceivedDate?: Date | string | null;
  dedupeFingerprint: string;
}, now: Date): NormalizedJourneyRecord | null {
  if (!isEligibleStudentVisa(row.visaCategory)) return null;
  const embassy = normalizeEmbassy(row.embassy);
  if (!embassy) return null;
  const maxFuture = now.getTime() + 14 * 86_400_000;

  const parseDateArray = (val: unknown): Date[] =>
    Array.isArray(val)
      ? val.map((x) => parseValidUtcDay(String(x), maxFuture)).filter((d): d is Date => d !== null)
      : [];

  const pub = parseValidUtcDay(row.reportPublishedAt) ?? now;
  return {
    id: row.id,
    sourceType: "external",
    embassy,
    visaCategory: "Study",
    reliability: (row.reliability as NormalizedJourneyRecord["reliability"]) || "CROWD_REPORT",
    confidence: row.confidence ?? 0.75,
    reportDate: pub,
    lastConfirmedAt: pub,
    waitingListJoinedDate: parseValidUtcDay(row.waitingListJoinedDate, maxFuture),
    submissionInvitedDate: parseValidUtcDay(row.submissionInvitedDate, maxFuture),
    documentsSubmittedDate: parseValidUtcDay(row.documentsSubmittedDate, maxFuture),
    preliminaryReviewDate: parseValidUtcDay(row.preliminaryReviewDate, maxFuture),
    correctionRequestDates: parseDateArray(row.correctionRequestDates),
    correctionResponseDates: parseDateArray(row.correctionResponseDates),
    correctionAcceptedDate: parseValidUtcDay(row.correctionAcceptedDate, maxFuture),
    appointmentInvitedDate: parseValidUtcDay(row.appointmentInvitedDate, maxFuture),
    appointmentBookedDate: parseValidUtcDay(row.appointmentBookedDate, maxFuture),
    appointmentAttendedDate: parseValidUtcDay(row.appointmentAttendedDate, maxFuture),
    decisionDate: parseValidUtcDay(row.decisionDate, maxFuture),
    decisionOutcome:
      row.decisionOutcome === "APPROVED" || row.decisionOutcome === "REJECTED" || row.decisionOutcome === "WITHDRAWN"
        ? row.decisionOutcome
        : null,
    passportDispatchedDate: parseValidUtcDay(row.passportDispatchedDate, maxFuture),
    passportReceivedDate: parseValidUtcDay(row.passportReceivedDate, maxFuture),
    fingerprint: row.dedupeFingerprint,
  };
}
