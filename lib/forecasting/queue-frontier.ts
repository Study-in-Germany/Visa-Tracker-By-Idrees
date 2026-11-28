import { DEFAULT_FRONTIER_QUANTILE } from "./config";
import { diffDays, toIsoDay } from "./date-utils";
import { computeJourneyWeight } from "./evidence-weighting";
import { computeEffectiveSampleSize, exponentialDecayWeight, weightedQuantile } from "./statistics";
import type {
  ConfidenceLevel,
  Embassy,
  EmbassyFrontierSummary,
  NormalizedJourneyRecord,
  QueueObservationPoint,
  QueueType,
} from "./types";

function scoreFrontierConfidence(
  effectiveN: number,
  latestObsDate: Date | null,
  asOfDate: Date,
  hasConflict: boolean
): ConfidenceLevel {
  const ageDays = latestObsDate ? diffDays(latestObsDate, asOfDate) : 999;
  if (effectiveN < 5 || ageDays > 90) return "insufficient";
  if (effectiveN < 15 || hasConflict || ageDays > 35) return "low";
  if (effectiveN < 45 || ageDays > 14) return "moderate";
  return "high";
}

function estimateSingleQueueFrontier(
  embassy: Embassy,
  queueType: QueueType,
  journeys: NormalizedJourneyRecord[],
  queuePoints: QueueObservationPoint[],
  asOfDate: Date
): EmbassyFrontierSummary {
  const asOfMs = asOfDate.getTime();
  const internalPairs: { cohortMs: number; eventMs: number; weight: number }[] = [];
  const allCohortPairs: { cohortMs: number; eventMs: number; weight: number }[] = [];

  for (const r of journeys) {
    if (r.embassy !== embassy) continue;

    let cohortDate: Date | null = null;
    let eventDate: Date | null = null;

    if (queueType === "SUBMISSION_FRONTIER") {
      cohortDate = r.waitingListJoinedDate;
      eventDate = r.submissionInvitedDate;
    } else if (queueType === "APPOINTMENT_SUBMISSION_FRONTIER") {
      cohortDate = r.documentsSubmittedDate ?? r.submissionInvitedDate;
      eventDate = r.appointmentInvitedDate ?? r.appointmentBookedDate;
    } else {
      cohortDate = r.waitingListJoinedDate;
      eventDate = r.appointmentInvitedDate ?? r.appointmentBookedDate;
    }

    if (!cohortDate || !eventDate) continue;
    if (eventDate.getTime() > asOfMs || cohortDate.getTime() > eventDate.getTime()) continue;
    const lag = diffDays(cohortDate, eventDate);
    if (lag < 0 || lag > 730) continue;

    const age = diffDays(eventDate, asOfDate);
    if (age > 180) continue;

    const w = computeJourneyWeight(r, eventDate, asOfDate, 10, 1);
    const entry = { cohortMs: cohortDate.getTime(), eventMs: eventDate.getTime(), weight: w };
    allCohortPairs.push(entry);
    if (r.sourceType === "internal") internalPairs.push(entry);
  }

  // Incorporate dated QueueObservation frontier reports
  const matchingObs = queuePoints
    .filter(
      (q) =>
        q.embassy === embassy &&
        q.queueType === queueType &&
        q.observationDate.getTime() <= asOfMs &&
        diffDays(q.observationDate, asOfDate) <= 120
    )
    .sort((a, b) => b.observationDate.getTime() - a.observationDate.getTime());

  for (const q of matchingObs) {
    const age = diffDays(q.observationDate, asOfDate);
    // Exponential 10-day half-life tracks the live frontier without being dragged back by 2-month-old checkpoints
    const weight = q.confidence * exponentialDecayWeight(age, 10) * (q.sourceType === "COMMUNITY_PLATFORM" ? 1.8 : 1.4);
    allCohortPairs.push({
      cohortMs: q.observedFrontierDate.getTime(),
      eventMs: q.observationDate.getTime(),
      weight,
    });
  }

  const internalSorted = [...internalPairs].sort((a, b) => b.eventMs - a.eventMs).slice(0, 10);
  const internalLatestMs = internalSorted.length >= 1
    ? weightedQuantile(
        internalSorted.map((p) => ({ value: p.cohortMs, weight: p.weight })),
        internalSorted.length >= 2 ? DEFAULT_FRONTIER_QUANTILE : 0.5
      )
    : null;

  if (allCohortPairs.length === 0) {
    return {
      embassy,
      queueType,
      internalLatestCohort: internalLatestMs ? toIsoDay(new Date(internalLatestMs)) : null,
      internalSampleSize: internalPairs.length,
      combinedFrontierDate: null,
      observedRangeStart: null,
      observedRangeEnd: null,
      sampleSize: 0,
      effectiveSampleSize: 0,
      lastUpdatedDate: null,
      hasConflict: false,
      conflictSummary: null,
      sourceClassification: "Insufficient observations",
      confidence: "insufficient",
    };
  }

  // Prefer recent 21-day window when dense; otherwise fall back to most recent 10 observations
  const sortedDesc = [...allCohortPairs].sort((a, b) => b.eventMs - a.eventMs);
  const latestMs = sortedDesc[0].eventMs;
  const freshSlice = sortedDesc.filter((p) => latestMs - p.eventMs <= 21 * 86_400_000);
  const sortedByEvent = (freshSlice.length >= 3 ? freshSlice : sortedDesc).slice(0, 12);
  const combinedMs = weightedQuantile(
    sortedByEvent.map((p) => ({ value: p.cohortMs, weight: p.weight })),
    DEFAULT_FRONTIER_QUANTILE
  );

  const cohortDatesMs = sortedByEvent.map((p) => p.cohortMs).sort((a, b) => a - b);
  const rawLow = cohortDatesMs.length >= 4 ? cohortDatesMs[Math.floor(cohortDatesMs.length * 0.15)] : cohortDatesMs[0];
  const rawHigh = cohortDatesMs.length >= 4 ? cohortDatesMs[Math.min(cohortDatesMs.length - 1, Math.floor(cohortDatesMs.length * 0.9))] : cohortDatesMs[cohortDatesMs.length - 1];
  const rangeStart = combinedMs ? Math.min(rawLow, combinedMs) : rawLow;
  const rangeEnd = combinedMs ? Math.max(rawHigh, combinedMs) : rawHigh;
  const latestEventDate = new Date(Math.max(...sortedByEvent.map((p) => p.eventMs)));

  const effectiveN = computeEffectiveSampleSize(sortedByEvent.map((p) => p.weight));

  // Conflict check between internal latest cohort vs combined external estimate
  let hasConflict = false;
  let conflictSummary: string | null = null;
  if (internalLatestMs && combinedMs) {
    const gap = Math.abs(Math.round((combinedMs - internalLatestMs) / 86_400_000));
    if (gap > 25) {
      hasConflict = true;
      conflictSummary = `Internal records trail combined community reports by ${gap} days.`;
    }
  }

  // Same-day snapshot divergence check (e.g. 2 March vs 10 March snapshots)
  if (!hasConflict && matchingObs.length >= 2) {
    const latestDay = toIsoDay(matchingObs[0].observationDate);
    const sameDay = matchingObs.filter((m) => toIsoDay(m.observationDate) === latestDay);
    if (sameDay.length >= 2) {
      const span =
        (Math.max(...sameDay.map((s) => s.observedFrontierDate.getTime())) -
          Math.min(...sameDay.map((s) => s.observedFrontierDate.getTime()))) /
        86_400_000;
      if (span >= 7) {
        hasConflict = true;
        conflictSummary = `Recent same-day reports vary across a ${Math.round(span)}-day cohort span.`;
      }
    }
  }

  const hasExternal = matchingObs.length > 0 || sortedByEvent.length > internalPairs.length;
  const sourceClassification =
    internalPairs.length > 0 && hasExternal
      ? "Combined internal & community evidence"
      : internalPairs.length > 0
        ? "Verified internal applicant entries"
        : "Community channel & tracker reports";

  return {
    embassy,
    queueType,
    internalLatestCohort: internalLatestMs ? toIsoDay(new Date(internalLatestMs)) : null,
    internalSampleSize: internalPairs.length,
    combinedFrontierDate: combinedMs ? toIsoDay(new Date(combinedMs)) : null,
    observedRangeStart: toIsoDay(new Date(rangeStart)),
    observedRangeEnd: toIsoDay(new Date(rangeEnd)),
    sampleSize: sortedByEvent.length,
    effectiveSampleSize: Math.round(effectiveN * 10) / 10,
    lastUpdatedDate: toIsoDay(latestEventDate),
    hasConflict,
    conflictSummary,
    sourceClassification,
    confidence: scoreFrontierConfidence(effectiveN, latestEventDate, asOfDate, hasConflict),
  };
}

export function computeEmbassyFrontiers(
  embassy: Embassy,
  journeys: NormalizedJourneyRecord[],
  queuePoints: QueueObservationPoint[],
  asOfDate: Date
) {
  return {
    submission: estimateSingleQueueFrontier(embassy, "SUBMISSION_FRONTIER", journeys, queuePoints, asOfDate),
    appointmentBySubmission: estimateSingleQueueFrontier(
      embassy,
      "APPOINTMENT_SUBMISSION_FRONTIER",
      journeys,
      queuePoints,
      asOfDate
    ),
    appointmentByWaitingList: estimateSingleQueueFrontier(
      embassy,
      "APPOINTMENT_WL_COHORT_FRONTIER",
      journeys,
      queuePoints,
      asOfDate
    ),
  };
}
