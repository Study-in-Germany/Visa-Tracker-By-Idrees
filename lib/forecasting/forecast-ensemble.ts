import { DEFAULT_HALF_LIFE_DAYS, MODEL_VERSION, MONTE_CARLO_ITERATIONS, SHRINKAGE_K } from "./config";
import { assessForecastConfidence } from "./confidence";
import { addDays, diffDays, toIsoDay, toUtcDay } from "./date-utils";
import { computeEmbassyDurations, extractRawStageDurations } from "./duration-model";
import { runMonteCarloForecast } from "./monte-carlo";
import { computeEmbassyFrontiers } from "./queue-frontier";
import { buildFrontierSeries, computeHistoricalWeeklyBootstrapPool, computeQueueVelocity } from "./queue-velocity";
import type {
  ForecastScenarioSummary,
  NormalizedJourneyRecord,
  PersonalForecastInput,
  PersonalForecastResult,
  QueueObservationPoint,
  SpeedSensitivitySummary,
  StageForecast,
} from "./types";

export function buildPersonalForecast(
  input: PersonalForecastInput,
  journeys: NormalizedJourneyRecord[],
  queuePoints: QueueObservationPoint[],
  asOfDate: Date = toUtcDay(new Date()),
  options: { iterations?: number } = {}
): PersonalForecastResult {
  const iterations = options.iterations ?? MONTE_CARLO_ITERATIONS;
  const joinDay = toUtcDay(input.waitingListJoinedDate);
  const frontiers = computeEmbassyFrontiers(input.embassy, journeys, queuePoints, asOfDate);
  const velocity = computeQueueVelocity(input.embassy, "SUBMISSION_FRONTIER", journeys, queuePoints, asOfDate);
  const durations = computeEmbassyDurations(input.embassy, journeys, asOfDate);
  const rawPools = extractRawStageDurations(input.embassy, journeys, asOfDate);
  const frontierSeries = buildFrontierSeries(input.embassy, "SUBMISSION_FRONTIER", journeys, queuePoints, asOfDate);
  const bootstrapRates = computeHistoricalWeeklyBootstrapPool(frontierSeries, asOfDate, 180);

  const frontierDateObj = frontiers.submission.combinedFrontierDate
    ? new Date(`${frontiers.submission.combinedFrontierDate}T00:00:00Z`)
    : null;
  const elapsedWaitingDays = Math.max(0, diffDays(joinDay, asOfDate));
  const frontierLagDays = frontierDateObj ? diffDays(frontierDateObj, joinDay) : null;

  // Section 16: Joining date already reached or passed by recent frontier without recorded invite
  const cohortAlreadyReached = Boolean(!input.submissionInvitedDate && frontierDateObj && joinDay.getTime() <= frontierDateObj.getTime());
  const daysSinceCohortReached = cohortAlreadyReached && frontierDateObj ? Math.max(0, diffDays(joinDay, frontierDateObj)) : null;
  const cohortReachedMessage = cohortAlreadyReached
    ? "Your joining-date cohort has been reached in recent community reports. Individual invitations may still arrive at different times — check your Consular Services Portal inbox and email."
    : null;

  let frontierSpreadDays = 5;
  if (frontiers.submission.observedRangeStart && frontiers.submission.observedRangeEnd) {
    frontierSpreadDays = Math.max(
      2,
      Math.min(
        18,
        Math.round(
          diffDays(
            new Date(`${frontiers.submission.observedRangeStart}T00:00:00Z`),
            new Date(`${frontiers.submission.observedRangeEnd}T00:00:00Z`)
          ) / 2
        )
      )
    );
  }

  const expectedSubDelay = Math.max(0, input.expectedSubmissionDelayDays ?? durations.submissionDelay.p50 ?? 3);

  const mc = runMonteCarloForecast({
    seedKey: `${MODEL_VERSION}:${input.embassy}:${toIsoDay(joinDay)}:${toIsoDay(asOfDate)}:${toIsoDay(input.submissionInvitedDate) ?? ""}:${toIsoDay(input.documentsSubmittedDate) ?? ""}:${toIsoDay(input.appointmentInvitedDate) ?? ""}:${toIsoDay(input.appointmentAttendedDate) ?? ""}:${toIsoDay(input.decisionDate) ?? ""}`,
    asOfDate,
    waitingListJoinedDate: joinDay,
    frontierDate: frontierDateObj,
    frontierSpreadDays,
    velocityPoolWeeklyDays: bootstrapRates,
    fallbackWeeklyVelocityDays: velocity.weightedWeeklyDays,
    historicalWlWaitPoolDays: rawPools.wlToInvite,
    submissionDelayPoolDays: rawPools.inviteToSub,
    docReviewPoolDays: rawPools.subToApptInvite,
    apptSchedulingPoolDays: rawPools.apptInviteToAttend,
    decisionPoolDays: rawPools.attendToDecision,
    actualSubmissionInviteDate: input.submissionInvitedDate ?? null,
    actualDocumentsSubmittedDate: input.documentsSubmittedDate ?? null,
    actualAppointmentInviteDate: input.appointmentInvitedDate ?? null,
    actualAppointmentBookedDate: input.appointmentBookedDate ?? null,
    actualAppointmentAttendedDate: input.appointmentAttendedDate ?? null,
    actualDecisionDate: input.decisionDate ?? null,
    expectedSubmissionDelayDays: expectedSubDelay,
    iterations,
  });

  const makeStage = (
    stage: StageForecast["stage"],
    label: string,
    actual: Date | null | undefined,
    q: typeof mc.submissionInvite,
    sampleSize: number,
    effectiveN: number,
    fallbackNote: string | null = null,
    specialStatus?: StageForecast["status"],
    minRequiredSamples = 1
  ): StageForecast => {
    if (actual) {
      const iso = toIsoDay(actual)!;
      return {
        stage,
        label,
        status: "completed",
        actualDate: iso,
        p10Date: iso,
        p25Date: iso,
        p50Date: iso,
        p75Date: iso,
        p90Date: iso,
        p50DaysRemaining: 0,
        unresolvedFraction: 0,
        sampleSize,
        effectiveSampleSize: effectiveN,
        stageConfidence: "high",
        note: "Recorded milestone date",
      };
    }

    if (specialStatus === "needs_confirmation") {
      return {
        stage,
        label,
        status: "needs_confirmation",
        actualDate: null,
        p10Date: null,
        p25Date: null,
        p50Date: null,
        p75Date: null,
        p90Date: null,
        p50DaysRemaining: null,
        unresolvedFraction: 1,
        sampleSize,
        effectiveSampleSize: effectiveN,
        stageConfidence: "low",
        note: fallbackNote ?? "Confirm whether this milestone has already occurred.",
      };
    }

    if (!q.p50Date || sampleSize < minRequiredSamples) {
      return {
        stage,
        label,
        status: "unavailable",
        actualDate: null,
        p10Date: null,
        p25Date: null,
        p50Date: null,
        p75Date: null,
        p90Date: null,
        p50DaysRemaining: null,
        unresolvedFraction: q.unresolvedFraction,
        sampleSize,
        effectiveSampleSize: effectiveN,
        stageConfidence: "insufficient",
        note: fallbackNote ?? "Not enough data to estimate.",
      };
    }

    const stageConfidence: StageForecast["stageConfidence"] =
      effectiveN < 5 ? "insufficient" : effectiveN < 15 ? "low" : effectiveN < 40 ? "moderate" : "high";

    return {
      stage,
      label,
      status: specialStatus ?? "estimated",
      actualDate: null,
      p10Date: q.p10Date,
      p25Date: q.p25Date,
      p50Date: q.p50Date,
      p75Date: q.p75Date,
      p90Date: q.p90Date,
      p50DaysRemaining: q.p50DaysFromAsOf,
      unresolvedFraction: q.unresolvedFraction,
      sampleSize,
      effectiveSampleSize: effectiveN,
      stageConfidence,
      note: fallbackNote,
    };
  };

  // Conditional Kaplan-Meier note if cohort already reached or waiting longer than median
  let subInviteNote: string | null = null;
  if (cohortAlreadyReached) {
    const kmRem = durations.waitingToInviteSurvival.conditionalRemainingMedian(elapsedWaitingDays);
    subInviteNote = kmRem !== null
      ? `Cohort already reached; conditional median remaining wait among similar cases is ~${kmRem} days.`
      : "Cohort reached in recent community updates; pending individual invite.";
  }

  const stages: StageForecast[] = [
    {
      stage: "WAITING_LIST_JOINED",
      label: "Waiting list joined",
      status: "completed",
      actualDate: toIsoDay(joinDay),
      p10Date: toIsoDay(joinDay),
      p25Date: toIsoDay(joinDay),
      p50Date: toIsoDay(joinDay),
      p75Date: toIsoDay(joinDay),
      p90Date: toIsoDay(joinDay),
      p50DaysRemaining: 0,
      unresolvedFraction: 0,
      sampleSize: 1,
      effectiveSampleSize: 1,
      note: "Starting anchor date",
    },
    makeStage(
      "SUBMISSION_INVITED",
      "Submission invitation",
      input.submissionInvitedDate,
      mc.submissionInvite,
      durations.waitingToInvite.sampleSize + frontiers.submission.sampleSize,
      Math.round((durations.waitingToInvite.effectiveSampleSize + frontiers.submission.effectiveSampleSize) * 10) / 10,
      subInviteNote,
      cohortAlreadyReached ? "cohort_reached" : "estimated"
    ),
    makeStage(
      "DOCUMENTS_SUBMITTED",
      "Documents submitted",
      input.documentsSubmittedDate,
      mc.documentsSubmitted,
      durations.submissionDelay.sampleSize || 1,
      durations.submissionDelay.effectiveSampleSize || 1,
      input.documentsSubmittedDate ? null : `Assumes ~${Math.round(expectedSubDelay)}d applicant upload time after invite`
    ),
    makeStage(
      "APPOINTMENT_INVITED",
      "Appointment invitation",
      input.appointmentInvitedDate,
      mc.appointmentInvite,
      durations.documentReview.sampleSize,
      durations.documentReview.effectiveSampleSize,
      mc.appointmentInviteNeedsConfirmation
        ? "Your document review has exceeded typical review times. Update your record if you received an appointment invite."
        : durations.corrections.correctionRatePct !== null
          ? `Includes historical review outcomes (${Math.round(durations.corrections.correctionRatePct)}% observed correction rate)`
          : null,
      mc.appointmentInviteNeedsConfirmation ? "needs_confirmation" : undefined
    ),
    makeStage(
      "APPOINTMENT_ATTENDED",
      "Physical appointment",
      input.appointmentAttendedDate,
      mc.appointmentAttended,
      durations.appointmentScheduling.sampleSize,
      durations.appointmentScheduling.effectiveSampleSize,
      mc.appointmentNeedsConfirmation
        ? "Your scheduled appointment date has passed without a recorded attendance date. Confirm your actual appointment date."
        : input.appointmentBookedDate && !input.appointmentAttendedDate
          ? "Based on booked appointment date"
          : null,
      mc.appointmentNeedsConfirmation ? "needs_confirmation" : undefined
    ),
    makeStage(
      "DECISION_MADE",
      "Visa decision",
      input.decisionDate,
      mc.decisionMade,
      durations.decisionProcessing.sampleSize,
      durations.decisionProcessing.effectiveSampleSize,
      mc.appointmentNeedsConfirmation
        ? "Confirm your physical appointment date first."
        : durations.decisionProcessing.sampleSize < 5
          ? "Not enough data to estimate."
          : null,
      undefined,
      5
    ),
  ];

  // Realistic scenarios derived strictly from empirical P25/P50/P75 quantiles
  const fastVel = velocity.windows.reduce<number | null>(
    (best, w) => (w.weeklyRateDays !== null && (best === null || w.weeklyRateDays > best) ? w.weeklyRateDays : best),
    null
  );
  const slowVel = velocity.windows.reduce<number | null>(
    (low, w) => (w.weeklyRateDays !== null && (low === null || w.weeklyRateDays < low) ? w.weeklyRateDays : low),
    null
  );

  const scenarios: ForecastScenarioSummary[] = [
    {
      key: "faster",
      label: "Faster processing (P25)",
      weeklyVelocityDays: fastVel,
      submissionInviteDate: mc.submissionInvite.p25Date,
      appointmentInviteDate: mc.appointmentInvite.p25Date,
      decisionDate: mc.decisionMade.p25Date,
    },
    {
      key: "typical",
      label: "Typical processing (P50)",
      weeklyVelocityDays: velocity.weightedWeeklyDays,
      submissionInviteDate: mc.submissionInvite.p50Date,
      appointmentInviteDate: mc.appointmentInvite.p50Date,
      decisionDate: mc.decisionMade.p50Date,
    },
    {
      key: "slower",
      label: "Slower processing (P75)",
      weeklyVelocityDays: slowVel,
      submissionInviteDate: mc.submissionInvite.p75Date,
      appointmentInviteDate: mc.appointmentInvite.p75Date,
      decisionDate: mc.decisionMade.p75Date,
    },
  ];

  // Issue F: suppress velocity sensitivity when submission invitation is already recorded
  const speedSensitivity: SpeedSensitivitySummary[] = input.submissionInvitedDate
    ? []
    : [7, 30, 90].map((winDays) => {
        const rate = velocity.windows.find((w) => w.windowDays === winDays)?.weeklyRateDays ?? null;
        let estDate: string | null = null;
        if (frontierDateObj && rate !== null && rate > 0.25) {
          const remCohortDays = Math.max(0, diffDays(frontierDateObj, joinDay));
          const remCalendarDays = Math.round((remCohortDays / rate) * 7);
          estDate = toIsoDay(addDays(asOfDate, remCalendarDays));
        }
        return {
          windowDays: winDays,
          label: `If last ${winDays}-day pace continues`,
          weeklyVelocityDays: rate,
          estimatedSubmissionInviteDate: estDate,
        };
      });

  const lastObsAge = frontiers.submission.lastUpdatedDate
    ? diffDays(new Date(`${frontiers.submission.lastUpdatedDate}T00:00:00Z`), asOfDate)
    : 999;

  const queueEffectiveSample =
    Math.round((durations.waitingToInvite.effectiveSampleSize + frontiers.submission.effectiveSampleSize) * 10) / 10;
  const nextPendingStage = stages.find(
    (s) => s.status === "estimated" || s.status === "cohort_reached" || s.status === "needs_confirmation"
  );
  const effectiveSampleSize =
    nextPendingStage && nextPendingStage.stage !== "SUBMISSION_INVITED"
      ? Math.round(Math.min(queueEffectiveSample, nextPendingStage.effectiveSampleSize) * 10) / 10
      : queueEffectiveSample;

  const confidenceCheck = assessForecastConfidence({
    effectiveSampleSize,
    horizonDays: nextPendingStage?.p50DaysRemaining ?? null,
    hasConflict: frontiers.submission.hasConflict,
    isStalled: velocity.isStalled,
    lastUpdatedAgeDays: lastObsAge,
  });

  if (nextPendingStage?.status === "needs_confirmation") {
    confidenceCheck.level = "low";
    confidenceCheck.reasons.unshift("An expected milestone date has passed without confirmation.");
  } else if (!nextPendingStage && stages.some((s) => s.status === "unavailable")) {
    confidenceCheck.level = "insufficient";
    confidenceCheck.reasons.unshift("Not enough verified observations for remaining stages.");
  } else if (nextPendingStage && nextPendingStage.sampleSize < 5 && confidenceCheck.level !== "insufficient") {
    confidenceCheck.level = "low";
    confidenceCheck.reasons.unshift(`Limited sample size (${nextPendingStage.sampleSize}) for ${nextPendingStage.label.toLowerCase()}.`);
  }

  const limitations: string[] = [
    "Estimates rely on community-shared reports and historical embassy pacing; they are not official commitments.",
  ];
  if (durations.decisionProcessing.sampleSize < 5) {
    limitations.push(
      `Decision processing window is marked unavailable because only ${durations.decisionProcessing.sampleSize} complete physical interview-to-decision pair(s) exist for ${input.embassy}.`
    );
  }
  if (input.embassy === "Karachi" && durations.totalEligibleCount < 50) {
    limitations.push("Karachi has smaller historical reporting density than Islamabad; forecast ranges are wider.");
  }

  return {
    modelVersion: MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    asOfDate: toIsoDay(asOfDate)!,
    embassy: input.embassy,
    visaCategory: input.visaCategory || "Study",
    cohortAlreadyReached,
    daysSinceCohortReached,
    cohortReachedMessage,
    currentSubmissionFrontier: frontiers.submission.combinedFrontierDate,
    frontierLagDays,
    elapsedWaitingDays,
    weeklyVelocityDays: velocity.weightedWeeklyDays,
    confidence: confidenceCheck.level,
    confidenceReasons: confidenceCheck.reasons,
    stages,
    scenarios,
    speedSensitivity,
    methodologySummary: {
      iterations,
      internalSampleSize: recordsCountByType(journeys, input.embassy, "internal"),
      externalTimelineSampleSize: recordsCountByType(journeys, input.embassy, "external"),
      queueObservationsCount: queuePoints.filter((q) => q.embassy === input.embassy).length,
      effectiveSampleSize,
      queueModelWeight: mc.queueModelWeight,
      durationModelWeight: mc.durationModelWeight,
      halfLifeDays: DEFAULT_HALF_LIFE_DAYS,
      shrinkageK: SHRINKAGE_K,
    },
    limitations,
  };
}

function recordsCountByType(records: NormalizedJourneyRecord[], embassy: "Islamabad" | "Karachi", type: "internal" | "external"): number {
  return records.filter((r) => r.embassy === embassy && r.sourceType === type).length;
}
