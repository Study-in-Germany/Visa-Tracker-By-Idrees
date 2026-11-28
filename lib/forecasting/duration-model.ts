import { DEFAULT_HALF_LIFE_DAYS } from "./config";
import { plausibleDuration } from "./data-validation";
import { diffDays } from "./date-utils";
import { computeJourneyWeight } from "./evidence-weighting";
import { computeDistributionStats, shrinkageBlend } from "./statistics";
import { fitKaplanMeier } from "./survival-analysis";
import type { DistributionStats, Embassy, NormalizedJourneyRecord, SurvivalEstimate } from "./types";

export interface EmbassyDurationProfile {
  embassy: Embassy;
  totalEligibleCount: number;
  waitingToInvite: DistributionStats;
  waitingToInviteInternalOnly: DistributionStats;
  waitingToInviteSurvival: SurvivalEstimate;
  submissionDelay: DistributionStats; // S - I
  documentReview: DistributionStats; // A - S
  appointmentScheduling: DistributionStats; // T - A
  decisionProcessing: DistributionStats; // D - T (only real interview -> decision)
  passportDelivery: DistributionStats; // P - D
  totalJourney: DistributionStats; // P - J
  corrections: {
    eligibleSubmissionsCount: number;
    applicantsWithCorrection: number;
    totalCorrectionEvents: number;
    correctionRatePct: number | null;
    timeUntilFirstCorrection: DistributionStats;
    correctionResponseTime: DistributionStats;
    postCorrectionProcessing: DistributionStats;
  };
  decisions: {
    approvedCount: number;
    rejectedCount: number;
    withdrawnCount: number;
    approvalRatePct: number | null;
  };
}

function collectStageSamples(
  records: NormalizedJourneyRecord[],
  asOfDate: Date,
  extractor: (r: NormalizedJourneyRecord) => { days: number; eventDate: Date } | null
) {
  const all: { value: number; weight: number }[] = [];
  const internalOnly: { value: number; weight: number }[] = [];

  for (const r of records) {
    const hit = extractor(r);
    if (!hit || hit.eventDate.getTime() > asOfDate.getTime()) continue;
    const weight = computeJourneyWeight(r, hit.eventDate, asOfDate, DEFAULT_HALF_LIFE_DAYS, 1);
    all.push({ value: hit.days, weight });
    if (r.sourceType === "internal") internalOnly.push({ value: hit.days, weight });
  }
  return { all, internalOnly };
}

export function computeEmbassyDurations(
  embassy: Embassy,
  records: NormalizedJourneyRecord[],
  asOfDate: Date
): EmbassyDurationProfile {
  const scoped = records.filter((r) => r.embassy === embassy);

  // Waiting-list -> Submission invite (with incomplete-journey Kaplan-Meier survival analysis)
  const wlSamples = collectStageSamples(scoped, asOfDate, (r) => {
    const days = plausibleDuration(r.waitingListJoinedDate, r.submissionInvitedDate, 730);
    return days !== null && r.submissionInvitedDate ? { days, eventDate: r.submissionInvitedDate } : null;
  });

  const kmSubjects = scoped
    .filter((r) => r.waitingListJoinedDate && r.waitingListJoinedDate.getTime() <= asOfDate.getTime())
    .map((r) => {
      const completed = Boolean(r.submissionInvitedDate && r.submissionInvitedDate.getTime() <= asOfDate.getTime());
      return {
        startDate: r.waitingListJoinedDate!,
        endDate: completed ? r.submissionInvitedDate! : null,
        completed,
        lastObservedAt: r.lastConfirmedAt,
      };
    });
  const waitingToInviteSurvival = fitKaplanMeier(kmSubjects, asOfDate);

  // S - I
  const sMinusI = collectStageSamples(scoped, asOfDate, (r) => {
    const days = plausibleDuration(r.submissionInvitedDate, r.documentsSubmittedDate, 120);
    return days !== null && r.documentsSubmittedDate ? { days, eventDate: r.documentsSubmittedDate } : null;
  });

  // A - S (actual doc submission -> appointment invite)
  const aMinusS = collectStageSamples(scoped, asOfDate, (r) => {
    const start = r.documentsSubmittedDate ?? r.submissionInvitedDate;
    const days = plausibleDuration(start, r.appointmentInvitedDate, 365);
    return days !== null && r.appointmentInvitedDate ? { days, eventDate: r.appointmentInvitedDate } : null;
  });

  // T - A (appointment invite -> physical attendance)
  const tMinusA = collectStageSamples(scoped, asOfDate, (r) => {
    if (!r.appointmentInvitedDate || !r.appointmentAttendedDate) return null;
    const days = plausibleDuration(r.appointmentInvitedDate, r.appointmentAttendedDate, 180);
    return days !== null ? { days, eventDate: r.appointmentAttendedDate } : null;
  });

  // D - T (physical interview -> decision: NEVER substitute appointment invite for physical interview!)
  const dMinusT = collectStageSamples(scoped, asOfDate, (r) => {
    if (!r.appointmentAttendedDate || !r.decisionDate) return null;
    const days = plausibleDuration(r.appointmentAttendedDate, r.decisionDate, 365);
    return days !== null ? { days, eventDate: r.decisionDate } : null;
  });

  // P - D (decision -> passport received)
  const pMinusD = collectStageSamples(scoped, asOfDate, (r) => {
    if (!r.decisionDate || !r.passportReceivedDate) return null;
    const days = plausibleDuration(r.decisionDate, r.passportReceivedDate, 90);
    return days !== null ? { days, eventDate: r.passportReceivedDate } : null;
  });

  // P - J (total journey)
  const pMinusJ = collectStageSamples(scoped, asOfDate, (r) => {
    const end = r.passportReceivedDate ?? r.decisionDate;
    if (!r.waitingListJoinedDate || !end) return null;
    const days = plausibleDuration(r.waitingListJoinedDate, end, 900);
    return days !== null ? { days, eventDate: end } : null;
  });

  // Corrections analysis (strictly separated; never added twice if A-S already contains them)
  const eligibleSubs = scoped.filter((r) => Boolean(r.documentsSubmittedDate || r.submissionInvitedDate));
  const withCorrection = eligibleSubs.filter((r) => r.correctionRequestDates.length > 0);
  const totalCorrectionEvents = withCorrection.reduce((s, r) => s + r.correctionRequestDates.length, 0);

  const timeToFirstCorr = collectStageSamples(scoped, asOfDate, (r) => {
    const sub = r.documentsSubmittedDate ?? r.submissionInvitedDate;
    const firstCorr = r.correctionRequestDates[0];
    const days = plausibleDuration(sub, firstCorr ?? null, 180);
    return days !== null && firstCorr ? { days, eventDate: firstCorr } : null;
  });

  const corrResponse = collectStageSamples(scoped, asOfDate, (r) => {
    const firstReq = r.correctionRequestDates[0];
    const firstResp = r.correctionResponseDates[0];
    const days = plausibleDuration(firstReq ?? null, firstResp ?? null, 90);
    return days !== null && firstResp ? { days, eventDate: firstResp } : null;
  });

  const postCorr = collectStageSamples(scoped, asOfDate, (r) => {
    const lastResp = r.correctionResponseDates[r.correctionResponseDates.length - 1];
    const appt = r.appointmentInvitedDate ?? r.appointmentBookedDate;
    const days = plausibleDuration(lastResp ?? null, appt, 120);
    return days !== null && appt ? { days, eventDate: appt } : null;
  });

  // Decisions: Approved / (Approved + Rejected), withdrawals reported separately
  let approvedCount = 0;
  let rejectedCount = 0;
  let withdrawnCount = 0;
  for (const r of scoped) {
    if (r.decisionOutcome === "APPROVED") approvedCount++;
    else if (r.decisionOutcome === "REJECTED") rejectedCount++;
    else if (r.decisionOutcome === "WITHDRAWN") withdrawnCount++;
  }
  const decided = approvedCount + rejectedCount;

  const waitingToInviteAll = computeDistributionStats(wlSamples.all, waitingToInviteSurvival.censoredCount);
  const waitingToInviteInternalOnly = computeDistributionStats(wlSamples.internalOnly);

  // Shrinkage blend for small internal sample sizes
  const blended = shrinkageBlend(
    waitingToInviteInternalOnly.weightedMedian,
    waitingToInviteAll.weightedMedian,
    waitingToInviteInternalOnly.effectiveSampleSize
  );
  if (blended.value !== null && waitingToInviteAll.weightedMedian === null) {
    waitingToInviteAll.weightedMedian = Math.round(blended.value * 10) / 10;
  }

  return {
    embassy,
    totalEligibleCount: scoped.length,
    waitingToInvite: waitingToInviteAll,
    waitingToInviteInternalOnly,
    waitingToInviteSurvival,
    submissionDelay: computeDistributionStats(sMinusI.all),
    documentReview: computeDistributionStats(aMinusS.all),
    appointmentScheduling: computeDistributionStats(tMinusA.all),
    decisionProcessing: computeDistributionStats(dMinusT.all),
    passportDelivery: computeDistributionStats(pMinusD.all),
    totalJourney: computeDistributionStats(pMinusJ.all),
    corrections: {
      eligibleSubmissionsCount: eligibleSubs.length,
      applicantsWithCorrection: withCorrection.length,
      totalCorrectionEvents,
      correctionRatePct:
        eligibleSubs.length >= 5 ? Math.round((withCorrection.length / eligibleSubs.length) * 1000) / 10 : null,
      timeUntilFirstCorrection: computeDistributionStats(timeToFirstCorr.all),
      correctionResponseTime: computeDistributionStats(corrResponse.all),
      postCorrectionProcessing: computeDistributionStats(postCorr.all),
    },
    decisions: {
      approvedCount,
      rejectedCount,
      withdrawnCount,
      approvalRatePct: decided > 0 ? Math.round((approvedCount / decided) * 1000) / 10 : null,
    },
  };
}

export function extractRawStageDurations(
  embassy: Embassy,
  records: NormalizedJourneyRecord[],
  asOfDate: Date
) {
  const scoped = records.filter((r) => r.embassy === embassy);
  const collect = (fn: (r: NormalizedJourneyRecord) => number | null) =>
    scoped
      .filter((r) => r.reportDate.getTime() <= asOfDate.getTime())
      .map(fn)
      .filter((v): v is number => v !== null && v >= 0);

  return {
    wlToInvite: collect((r) => plausibleDuration(r.waitingListJoinedDate, r.submissionInvitedDate, 730)),
    inviteToSub: collect((r) => plausibleDuration(r.submissionInvitedDate, r.documentsSubmittedDate, 120)),
    subToApptInvite: collect((r) => plausibleDuration(r.documentsSubmittedDate ?? r.submissionInvitedDate, r.appointmentInvitedDate, 365)),
    apptInviteToAttend: collect((r) => plausibleDuration(r.appointmentInvitedDate, r.appointmentAttendedDate, 180)),
    attendToDecision: collect((r) => plausibleDuration(r.appointmentAttendedDate, r.decisionDate, 365)),
    postCorrectionToAppt: collect((r) => {
      const resp = r.correctionResponseDates[r.correctionResponseDates.length - 1];
      return plausibleDuration(resp ?? null, r.appointmentInvitedDate ?? r.appointmentBookedDate, 120);
    }),
  };
}

export function elapsedDaysBetween(a: Date, b: Date): number {
  return Math.max(0, diffDays(a, b));
}
