import { MAX_FORECAST_HORIZON_DAYS, MONTE_CARLO_ITERATIONS } from "./config";
import { addDays, clampFutureDate, diffDays, toIsoDay } from "./date-utils";
import { quantile } from "./statistics";

function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

/** Deterministic PRNG (`mulberry32`) for reproducible model snapshots. */
function createSeededRng(seedStr: string): () => number {
  let t = hashSeed(seedStr);
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickEmpirical(pool: number[], rng: () => number, fallback: number): number {
  if (pool.length === 0) return fallback;
  return pool[Math.floor(rng() * pool.length)];
}

export interface MonteCarloParams {
  seedKey: string;
  asOfDate: Date;
  waitingListJoinedDate: Date;
  frontierDate: Date | null;
  frontierSpreadDays: number;
  velocityPoolWeeklyDays: number[];
  fallbackWeeklyVelocityDays: number | null;
  historicalWlWaitPoolDays: number[];
  submissionDelayPoolDays: number[];
  docReviewPoolDays: number[];
  apptSchedulingPoolDays: number[];
  decisionPoolDays: number[];
  actualSubmissionInviteDate: Date | null;
  actualDocumentsSubmittedDate: Date | null;
  actualAppointmentInviteDate: Date | null;
  actualAppointmentBookedDate?: Date | null;
  actualAppointmentAttendedDate: Date | null;
  actualDecisionDate: Date | null;
  expectedSubmissionDelayDays: number;
  iterations?: number;
}

export interface QuantileDates {
  p10Date: string | null;
  p25Date: string | null;
  p50Date: string | null;
  p75Date: string | null;
  p90Date: string | null;
  p50DaysFromAsOf: number | null;
  unresolvedFraction: number;
}

export interface MonteCarloOutput {
  submissionInvite: QuantileDates;
  documentsSubmitted: QuantileDates;
  appointmentInvite: QuantileDates;
  appointmentAttended: QuantileDates;
  decisionMade: QuantileDates;
  queueModelWeight: number | null;
  durationModelWeight: number | null;
  appointmentNeedsConfirmation: boolean;
  appointmentInviteNeedsConfirmation: boolean;
}

function summarizeDates(dayOffsetsFromAsOf: number[], unresolvedCount: number, totalTrials: number, asOfDate: Date, minFloorDate: Date): QuantileDates {
  if (dayOffsetsFromAsOf.length === 0) {
    return {
      p10Date: null,
      p25Date: null,
      p50Date: null,
      p75Date: null,
      p90Date: null,
      p50DaysFromAsOf: null,
      unresolvedFraction: totalTrials > 0 ? Math.round((unresolvedCount / totalTrials) * 1000) / 1000 : 1,
    };
  }
  const sorted = [...dayOffsetsFromAsOf].sort((a, b) => a - b);
  const p10 = clampFutureDate(addDays(asOfDate, quantile(sorted, 0.1)!), minFloorDate);
  const p25 = clampFutureDate(addDays(asOfDate, quantile(sorted, 0.25)!), p10);
  const p50 = clampFutureDate(addDays(asOfDate, quantile(sorted, 0.5)!), p25);
  const p75 = clampFutureDate(addDays(asOfDate, quantile(sorted, 0.75)!), p50);
  const p90 = clampFutureDate(addDays(asOfDate, quantile(sorted, 0.9)!), p75);

  return {
    p10Date: toIsoDay(p10),
    p25Date: toIsoDay(p25),
    p50Date: toIsoDay(p50),
    p75Date: toIsoDay(p75),
    p90Date: toIsoDay(p90),
    p50DaysFromAsOf: Math.max(0, diffDays(asOfDate, p50)),
    unresolvedFraction: totalTrials > 0 ? Math.round((unresolvedCount / totalTrials) * 1000) / 1000 : 0,
  };
}

export function runMonteCarloForecast(params: MonteCarloParams): MonteCarloOutput {
  const trials = params.iterations ?? MONTE_CARLO_ITERATIONS;
  const rng = createSeededRng(params.seedKey);

  const asOfDate = params.asOfDate;
  const frontierLag = params.frontierDate ? Math.max(0, diffDays(params.frontierDate, params.waitingListJoinedDate)) : null;

  // Proximity-dependent queue vs duration adaptive weighting
  const wQueue =
    frontierLag !== null && (params.velocityPoolWeeklyDays.length > 0 || (params.fallbackWeeklyVelocityDays ?? 0) > 0)
      ? Math.round((0.25 + 0.65 * Math.exp(-frontierLag / 60)) * 1000) / 1000
      : null;
  const wHistory = wQueue !== null ? Math.round((1 - wQueue) * 1000) / 1000 : null;

  const siOffsets: number[] = [];
  const dsOffsets: number[] = [];
  const aiOffsets: number[] = [];
  const atOffsets: number[] = [];
  const dcOffsets: number[] = [];

  let siUnresolved = 0;
  let aiUnresolved = 0;
  let atUnresolved = 0;
  let dcUnresolved = 0;

  const hasWlWaitData = params.historicalWlWaitPoolDays.length >= 3 || (params.frontierDate && (params.fallbackWeeklyVelocityDays ?? 0) > 0.2);
  const hasDocReviewData = params.docReviewPoolDays.length >= 2;
  const hasApptSchedData = params.apptSchedulingPoolDays.length >= 2;
  const hasDecisionData = params.decisionPoolDays.length >= 5;

  // Issue C guard: never clamp an overdue booked appointment or unconfirmed long-past invitation to today's date.
  const bookedApptExpired = Boolean(
    !params.actualAppointmentAttendedDate &&
    params.actualAppointmentBookedDate &&
    params.actualAppointmentBookedDate.getTime() < asOfDate.getTime()
  );
  const elapsedSinceApptInvite =
    !params.actualAppointmentAttendedDate &&
    !params.actualAppointmentBookedDate &&
    params.actualAppointmentInviteDate &&
    params.actualAppointmentInviteDate.getTime() < asOfDate.getTime()
      ? diffDays(params.actualAppointmentInviteDate, asOfDate)
      : null;
  const conditionalApptPool =
    elapsedSinceApptInvite !== null
      ? params.apptSchedulingPoolDays.filter((d) => d >= elapsedSinceApptInvite)
      : [];
  const invitedApptUnconfirmed = Boolean(
    elapsedSinceApptInvite !== null && conditionalApptPool.length < 3
  );
  const appointmentNeedsConfirmation = bookedApptExpired || invitedApptUnconfirmed;

  const elapsedSinceDocSub =
    !params.actualAppointmentInviteDate &&
    params.actualDocumentsSubmittedDate &&
    params.actualDocumentsSubmittedDate.getTime() < asOfDate.getTime()
      ? diffDays(params.actualDocumentsSubmittedDate, asOfDate)
      : null;
  const conditionalDocPool =
    elapsedSinceDocSub !== null
      ? params.docReviewPoolDays.filter((d) => d >= elapsedSinceDocSub)
      : [];
  const appointmentInviteNeedsConfirmation = Boolean(
    elapsedSinceDocSub !== null &&
    hasDocReviewData &&
    conditionalDocPool.length < 2 &&
    elapsedSinceDocSub > Math.max(...params.docReviewPoolDays)
  );

  const velocityPool =
    params.velocityPoolWeeklyDays.length >= 2
      ? params.velocityPoolWeeklyDays
      : params.fallbackWeeklyVelocityDays && params.fallbackWeeklyVelocityDays > 0
        ? [params.fallbackWeeklyVelocityDays]
        : [];

  for (let t = 0; t < trials; t++) {
    // 1. Submission invite stage
    let siDate: Date | null = params.actualSubmissionInviteDate;
    if (!siDate) {
      if (!hasWlWaitData) {
        siUnresolved++;
        siDate = null;
      } else {
        // Queue-driven simulation with stochastic weekly velocity & occasional stalls
        let queueWaitDays: number | null = null;
        if (params.frontierDate && velocityPool.length > 0 && wQueue !== null) {
          const jitter = Math.round((rng() * 2 - 1) * params.frontierSpreadDays);
          let cursorFrontierMs = addDays(params.frontierDate, jitter).getTime();
          const targetMs = params.waitingListJoinedDate.getTime();

          let weeks = 0;
          const maxWeeks = Math.ceil(MAX_FORECAST_HORIZON_DAYS / 7);
          while (cursorFrontierMs < targetMs && weeks < maxWeeks) {
            // Draw weekly cohort advance from empirical velocity distribution
            const rate = pickEmpirical(velocityPool, rng, params.fallbackWeeklyVelocityDays ?? 4);
            cursorFrontierMs += rate * 86_400_000;
            weeks++;
          }
          // Include small within-cohort jitter (0..6 days)
          const intraCohort = Math.floor(rng() * 6);
          queueWaitDays = cursorFrontierMs >= targetMs ? weeks * 7 + intraCohort : MAX_FORECAST_HORIZON_DAYS + 1;
        }

        // Historical duration sample conditional on elapsed wait
        let historyDaysFromAsOf: number | null = null;
        if (params.historicalWlWaitPoolDays.length >= 3) {
          const elapsed = Math.max(0, diffDays(params.waitingListJoinedDate, asOfDate));
          const conditionalPool = params.historicalWlWaitPoolDays.filter((d) => d >= elapsed);
          const chosenTotalWait =
            conditionalPool.length >= 2
              ? pickEmpirical(conditionalPool, rng, elapsed + 14)
              : Math.max(...params.historicalWlWaitPoolDays, elapsed + 7);
          historyDaysFromAsOf = Math.max(0, chosenTotalWait - elapsed);
        }

        let simDaysFromAsOf: number;
        if (queueWaitDays !== null && historyDaysFromAsOf !== null && wQueue !== null && wHistory !== null) {
          simDaysFromAsOf = Math.round(wQueue * queueWaitDays + wHistory * historyDaysFromAsOf);
        } else if (queueWaitDays !== null) {
          simDaysFromAsOf = queueWaitDays;
        } else {
          simDaysFromAsOf = historyDaysFromAsOf ?? MAX_FORECAST_HORIZON_DAYS + 1;
        }

        if (simDaysFromAsOf > MAX_FORECAST_HORIZON_DAYS) {
          siUnresolved++;
          siDate = null;
        } else {
          siDate = clampFutureDate(addDays(asOfDate, simDaysFromAsOf), asOfDate);
          siOffsets.push(diffDays(asOfDate, siDate));
        }
      }
    }

    // 2. Document submission stage (S)
    let dsDate: Date | null = params.actualDocumentsSubmittedDate;
    if (!dsDate && siDate) {
      const delay = params.submissionDelayPoolDays.length >= 2
        ? pickEmpirical(params.submissionDelayPoolDays, rng, params.expectedSubmissionDelayDays)
        : params.expectedSubmissionDelayDays;
      dsDate = clampFutureDate(addDays(siDate, delay), clampFutureDate(siDate, asOfDate));
      dsOffsets.push(diffDays(asOfDate, dsDate));
    }

    // 3. Appointment invitation (A) from actual or predicted document submission
    let aiDate: Date | null = params.actualAppointmentInviteDate;
    if (!aiDate) {
      const anchorSub = dsDate ?? params.actualSubmissionInviteDate;
      if (!anchorSub || !hasDocReviewData || appointmentInviteNeedsConfirmation) {
        aiUnresolved++;
        aiDate = null;
      } else if (elapsedSinceDocSub !== null && conditionalDocPool.length >= 2) {
        const chosenTotal = pickEmpirical(conditionalDocPool, rng, elapsedSinceDocSub + 7);
        aiDate = clampFutureDate(addDays(asOfDate, Math.max(0, chosenTotal - elapsedSinceDocSub)), asOfDate);
        aiOffsets.push(diffDays(asOfDate, aiDate));
      } else {
        const reviewDays = pickEmpirical(params.docReviewPoolDays, rng, 14);
        aiDate = clampFutureDate(addDays(anchorSub, reviewDays), asOfDate);
        aiOffsets.push(diffDays(asOfDate, aiDate));
      }
    }

    // 4. Physical appointment attendance (T)
    let atDate: Date | null = params.actualAppointmentAttendedDate;
    if (!atDate) {
      if (appointmentNeedsConfirmation) {
        atUnresolved++;
        atDate = null;
      } else if (params.actualAppointmentBookedDate) {
        atDate = params.actualAppointmentBookedDate;
        atOffsets.push(diffDays(asOfDate, atDate));
      } else {
        const anchorAppt = aiDate;
        if (!anchorAppt || !hasApptSchedData) {
          atUnresolved++;
          atDate = null;
        } else if (elapsedSinceApptInvite !== null && conditionalApptPool.length >= 3) {
          const chosenTotal = pickEmpirical(conditionalApptPool, rng, elapsedSinceApptInvite + 7);
          atDate = clampFutureDate(addDays(asOfDate, Math.max(0, chosenTotal - elapsedSinceApptInvite)), asOfDate);
          atOffsets.push(diffDays(asOfDate, atDate));
        } else {
          const schedDays = pickEmpirical(params.apptSchedulingPoolDays, rng, 7);
          atDate = clampFutureDate(addDays(anchorAppt, schedDays), asOfDate);
          atOffsets.push(diffDays(asOfDate, atDate));
        }
      }
    }

    // 5. Visa decision (D) — strictly conditional on real physical interview observations (`decisionPoolDays.length >= 5`)
    if (!params.actualDecisionDate) {
      if (!atDate || !hasDecisionData) {
        dcUnresolved++;
      } else {
        const procDays = pickEmpirical(params.decisionPoolDays, rng, 14);
        const dcDate = clampFutureDate(addDays(atDate, procDays), asOfDate);
        dcOffsets.push(diffDays(asOfDate, dcDate));
      }
    }
  }

  return {
    submissionInvite: params.actualSubmissionInviteDate
      ? summarizeDates([diffDays(asOfDate, params.actualSubmissionInviteDate)], 0, 1, asOfDate, params.actualSubmissionInviteDate)
      : summarizeDates(siOffsets, siUnresolved, trials, asOfDate, asOfDate),
    documentsSubmitted: params.actualDocumentsSubmittedDate
      ? summarizeDates([diffDays(asOfDate, params.actualDocumentsSubmittedDate)], 0, 1, asOfDate, params.actualDocumentsSubmittedDate)
      : summarizeDates(dsOffsets, siUnresolved, trials, asOfDate, asOfDate),
    appointmentInvite: params.actualAppointmentInviteDate
      ? summarizeDates([diffDays(asOfDate, params.actualAppointmentInviteDate)], 0, 1, asOfDate, params.actualAppointmentInviteDate)
      : summarizeDates(aiOffsets, aiUnresolved, trials, asOfDate, asOfDate),
    appointmentAttended: params.actualAppointmentAttendedDate
      ? summarizeDates([diffDays(asOfDate, params.actualAppointmentAttendedDate)], 0, 1, asOfDate, params.actualAppointmentAttendedDate)
      : summarizeDates(atOffsets, atUnresolved, trials, asOfDate, asOfDate),
    decisionMade: params.actualDecisionDate
      ? summarizeDates([diffDays(asOfDate, params.actualDecisionDate)], 0, 1, asOfDate, params.actualDecisionDate)
      : summarizeDates(dcOffsets, dcUnresolved, trials, asOfDate, asOfDate),
    queueModelWeight: wQueue,
    durationModelWeight: wHistory,
    appointmentNeedsConfirmation,
    appointmentInviteNeedsConfirmation,
  };
}
