import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache";
import { ELIGIBLE_PUBLIC_APPLICANT_WHERE } from "@/lib/analytics-filter";
import { getConsulateModelStats } from "@/lib/estimator";
import { CONSULATES } from "@/lib/constants";

export type DurationDistribution = {
  medianDays: number | null;
  p25Days: number | null;
  p75Days: number | null;
  sampleSize: number;
  sufficient: boolean;
  hasData: boolean;
};

export type EmbassyQueueIntelligence = {
  consulate: string;
  recordsUsed: number;
  lastUpdatedAt: string | null;
  queueRightNow: {
    latestInvitationWlDate: string | null;
    latestInvitationEventDate: string | null;
    inviteSampleSize: number;
    latestAppointmentSubmissionDate: string | null;
    latestAppointmentEventDate: string | null;
    appointmentSampleSize: number;
    weeklyMovementDays: number | null;
    weeklyMovementBasis: "recent" | "baseline" | "insufficient";
    earliestObservedWlDate: string | null;
  };
  timeline: {
    waitingToInvite: DurationDistribution;
    inviteToSubmission: DurationDistribution;
    submissionToAppointment: DurationDistribution;
    appointmentToDecision: DurationDistribution;
  };
  corrections: {
    submittedBaseCount: number;
    correctionCount: number;
    ratePercent: number | null;
    resolutionTime: DurationDistribution;
    correctionToAppointment: DurationDistribution;
  };
};

function isValidHistoricalDate(d: Date | null, nowMs: number): d is Date {
  if (!d) return false;
  const y = d.getUTCFullYear();
  if (y < 2000 || y > 2100) return false;
  return d.getTime() <= nowMs + 86_400_000;
}

function percentileSorted(sorted: number[], p: number): number {
  const index = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  const weight = index - lo;
  return Math.round(sorted[lo] * (1 - weight) + sorted[hi] * weight);
}

function computeDistribution(gaps: number[]): DurationDistribution {
  const clean = gaps.filter((g) => g >= 0 && g <= 730).sort((a, b) => a - b);
  if (clean.length === 0) {
    return { medianDays: null, p25Days: null, p75Days: null, sampleSize: 0, sufficient: false, hasData: false };
  }
  return {
    medianDays: percentileSorted(clean, 50),
    p25Days: percentileSorted(clean, 25),
    p75Days: percentileSorted(clean, 75),
    sampleSize: clean.length,
    sufficient: clean.length >= 5,
    hasData: true,
  };
}

function robustFrontierDate(dates: Date[]): Date | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  if (sorted.length < 5) return sorted[sorted.length - 1];
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return sorted[idx];
}

function toIsoDay(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

async function computeEmbassyQueueIntelligence(consulate: string): Promise<EmbassyQueueIntelligence> {
  const normalized = CONSULATES.includes(consulate) ? consulate : "Islamabad";
  const nowMs = Date.now();

  const [records, modelStats] = await Promise.all([
    prisma.applicant.findMany({
      where: { ...ELIGIBLE_PUBLIC_APPLICANT_WHERE, consulate: normalized },
      select: {
        waitingListDate: true,
        submissionInviteDate: true,
        documentSubmissionDate: true,
        correctionRequestDate: true,
        correctionSubmittedDate: true,
        appointmentDate: true,
        decisionDate: true,
        updatedAt: true,
      },
    }),
    normalized === "Islamabad" || normalized === "Karachi"
      ? getConsulateModelStats(normalized).catch(() => null)
      : Promise.resolve(null),
  ]);

  let lastUpdatedMs = 0;
  const invitePairs: { wl: Date; inv: Date }[] = [];
  const apptSubPairs: { sub: Date; appt: Date }[] = [];
  const wlDatesForBounds: Date[] = [];

  const w2iGaps: number[] = [];
  const i2sGaps: number[] = [];
  const s2aGaps: number[] = [];
  const a2dGaps: number[] = [];

  let submittedBaseCount = 0;
  let correctionCount = 0;
  const corrResGaps: number[] = [];
  const corrToApptGaps: number[] = [];

  const dayDiff = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

  for (const r of records) {
    if (r.updatedAt.getTime() > lastUpdatedMs) lastUpdatedMs = r.updatedAt.getTime();

    const wl = isValidHistoricalDate(r.waitingListDate, nowMs) ? r.waitingListDate : null;
    const inv = isValidHistoricalDate(r.submissionInviteDate, nowMs) ? r.submissionInviteDate : null;
    const sub = isValidHistoricalDate(r.documentSubmissionDate, nowMs) ? r.documentSubmissionDate : null;
    const corrReq = isValidHistoricalDate(r.correctionRequestDate, nowMs) ? r.correctionRequestDate : null;
    const corrSub = isValidHistoricalDate(r.correctionSubmittedDate, nowMs) ? r.correctionSubmittedDate : null;
    const appt = isValidHistoricalDate(r.appointmentDate, nowMs) ? r.appointmentDate : null;
    const dec = isValidHistoricalDate(r.decisionDate, nowMs) ? r.decisionDate : null;

    if (wl) wlDatesForBounds.push(wl);

    if (wl && inv && inv >= wl) {
      invitePairs.push({ wl, inv });
      w2iGaps.push(dayDiff(wl, inv));
    }
    if (inv && sub && sub >= inv) {
      i2sGaps.push(dayDiff(inv, sub));
    }
    if (sub && appt && appt >= sub) {
      apptSubPairs.push({ sub, appt });
      s2aGaps.push(dayDiff(sub, appt));
    }
    if (appt && dec && dec >= appt) {
      a2dGaps.push(dayDiff(appt, dec));
    }

    if (sub || appt || dec) submittedBaseCount++;
    if (corrReq) {
      correctionCount++;
      if (corrSub && corrSub >= corrReq) {
        corrResGaps.push(dayDiff(corrReq, corrSub));
      }
    }
    if (corrSub && appt && appt >= corrSub) {
      corrToApptGaps.push(dayDiff(corrSub, appt));
    }
  }

  const frontierWl = robustFrontierDate(invitePairs.map((p) => p.wl));
  const latestInviteEvent = invitePairs.reduce<Date | null>(
    (max, p) => (!max || p.inv > max ? p.inv : max),
    null,
  );
  const frontierApptSub = robustFrontierDate(apptSubPairs.map((p) => p.sub));
  const latestApptEvent = apptSubPairs.reduce<Date | null>(
    (max, p) => (!max || p.appt > max ? p.appt : max),
    null,
  );

  // Weekly movement from centralized estimator statistics
  let weeklyMovementDays: number | null = null;
  let weeklyMovementBasis: "recent" | "baseline" | "insufficient" = "insufficient";
  if (modelStats && modelStats.usableInvitesCount >= 3) {
    if (modelStats.speedSummary.last4WeeksAvgDaysPerWeek > 0) {
      weeklyMovementDays = modelStats.speedSummary.last4WeeksAvgDaysPerWeek;
      weeklyMovementBasis = "recent";
    } else if (modelStats.speedSummary.sixMonthsAvgDaysPerWeek > 0) {
      weeklyMovementDays = modelStats.speedSummary.sixMonthsAvgDaysPerWeek;
      weeklyMovementBasis = "baseline";
    }
  }

  // Reasonable lower bound for calendar timeline (earliest WL date within ~24 months)
  const cutoffMs = nowMs - 730 * 86_400_000;
  const recentWlDates = wlDatesForBounds.filter((d) => d.getTime() >= cutoffMs).sort((a, b) => a.getTime() - b.getTime());
  const earliestObservedWlDate = recentWlDates.length > 0 ? toIsoDay(recentWlDates[0]) : toIsoDay(wlDatesForBounds[0] ?? null);

  return {
    consulate: normalized,
    recordsUsed: records.length,
    lastUpdatedAt: lastUpdatedMs > 0 ? new Date(lastUpdatedMs).toISOString() : null,
    queueRightNow: {
      latestInvitationWlDate: toIsoDay(frontierWl),
      latestInvitationEventDate: toIsoDay(latestInviteEvent),
      inviteSampleSize: invitePairs.length,
      latestAppointmentSubmissionDate: toIsoDay(frontierApptSub),
      latestAppointmentEventDate: toIsoDay(latestApptEvent),
      appointmentSampleSize: apptSubPairs.length,
      weeklyMovementDays,
      weeklyMovementBasis,
      earliestObservedWlDate,
    },
    timeline: {
      waitingToInvite: computeDistribution(w2iGaps),
      inviteToSubmission: computeDistribution(i2sGaps),
      submissionToAppointment: computeDistribution(s2aGaps),
      appointmentToDecision: computeDistribution(a2dGaps),
    },
    corrections: {
      submittedBaseCount,
      correctionCount,
      ratePercent: submittedBaseCount >= 10 ? Math.round((correctionCount / submittedBaseCount) * 100) : null,
      resolutionTime: computeDistribution(corrResGaps),
      correctionToAppointment: computeDistribution(corrToApptGaps),
    },
  };
}

export const getEmbassyQueueIntelligence = unstable_cache(
  computeEmbassyQueueIntelligence,
  ["embassy-queue-intel-v1"],
  { revalidate: 120, tags: [CACHE_TAGS.APPLICANTS] },
);
