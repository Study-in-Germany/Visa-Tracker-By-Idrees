import { addDays, diffDays, toIsoDay, toUtcDay } from "./date-utils";
import { buildPersonalForecast } from "./forecast-ensemble";
import { quantile } from "./statistics";
import type {
  BacktestHorizonMetric,
  Embassy,
  NormalizedJourneyRecord,
  QueueObservationPoint,
} from "./types";

interface BacktestSample {
  actualDaysFromCutoff: number;
  predP50Days: number;
  predP25Days: number;
  predP75Days: number;
  predP10Days: number;
  predP90Days: number;
}

function computeModelMetrics(embassy: Embassy, modelName: string, samples: BacktestSample[]): BacktestHorizonMetric {
  if (samples.length === 0) {
    return {
      embassy,
      modelName,
      n: 0,
      maeDays: null,
      medianAeDays: null,
      p90AeDays: null,
      biasDays: null,
      coverage50Pct: null,
      coverage80Pct: null,
      avgIntervalWidthDays: null,
      pinballLossP50: null,
    };
  }

  const absErrors = samples.map((s) => Math.abs(s.predP50Days - s.actualDaysFromCutoff)).sort((a, b) => a - b);
  const signedErrors = samples.map((s) => s.predP50Days - s.actualDaysFromCutoff);
  const cov50 = samples.filter((s) => s.actualDaysFromCutoff >= s.predP25Days && s.actualDaysFromCutoff <= s.predP75Days).length;
  const cov80 = samples.filter((s) => s.actualDaysFromCutoff >= s.predP10Days && s.actualDaysFromCutoff <= s.predP90Days).length;
  const widths = samples.map((s) => Math.max(0, s.predP75Days - s.predP25Days));
  const pinball = absErrors.reduce((sum, e) => sum + 0.5 * e, 0) / samples.length;

  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  return {
    embassy,
    modelName,
    n: samples.length,
    maeDays: Math.round(mean(absErrors) * 10) / 10,
    medianAeDays: Math.round(quantile(absErrors, 0.5)! * 10) / 10,
    p90AeDays: Math.round(quantile(absErrors, 0.9)! * 10) / 10,
    biasDays: Math.round(mean(signedErrors) * 10) / 10,
    coverage50Pct: Math.round((cov50 / samples.length) * 1000) / 10,
    coverage80Pct: Math.round((cov80 / samples.length) * 1000) / 10,
    avgIntervalWidthDays: Math.round(mean(widths) * 10) / 10,
    pinballLossP50: Math.round(pinball * 10) / 10,
  };
}

/**
 * Strictly chronological rolling-origin backtesting with zero future-data leakage.
 * At each `cutoffDate`, hides all events and observations after `cutoffDate`,
 * generates forecasts for eligible waiting applicants, and scores against future realizations.
 */
export function runRollingOriginBacktest(
  embassy: Embassy,
  journeys: NormalizedJourneyRecord[],
  queuePoints: QueueObservationPoint[],
  cutoffDates: Date[]
): BacktestHorizonMetric[] {
  const ensembleSamples: BacktestSample[] = [];
  const fixedMedianSamples: BacktestSample[] = [];
  const queue7dSamples: BacktestSample[] = [];
  const queue30dSamples: BacktestSample[] = [];

  for (const rawCutoff of cutoffDates) {
    const cutoff = toUtcDay(rawCutoff);
    const cutoffMs = cutoff.getTime();

    // Prevent future leakage: keep only records & milestones already observed on/before `cutoff`
    const pastJourneys: NormalizedJourneyRecord[] = journeys
      .filter((r) => r.embassy === embassy && r.reportDate.getTime() <= cutoffMs)
      .map((r) => ({
        ...r,
        submissionInvitedDate:
          r.submissionInvitedDate && r.submissionInvitedDate.getTime() <= cutoffMs ? r.submissionInvitedDate : null,
        documentsSubmittedDate:
          r.documentsSubmittedDate && r.documentsSubmittedDate.getTime() <= cutoffMs ? r.documentsSubmittedDate : null,
        appointmentInvitedDate:
          r.appointmentInvitedDate && r.appointmentInvitedDate.getTime() <= cutoffMs ? r.appointmentInvitedDate : null,
        appointmentBookedDate:
          r.appointmentBookedDate && r.appointmentBookedDate.getTime() <= cutoffMs ? r.appointmentBookedDate : null,
        appointmentAttendedDate:
          r.appointmentAttendedDate && r.appointmentAttendedDate.getTime() <= cutoffMs ? r.appointmentAttendedDate : null,
        decisionDate: r.decisionDate && r.decisionDate.getTime() <= cutoffMs ? r.decisionDate : null,
        lastConfirmedAt: new Date(Math.min(r.lastConfirmedAt.getTime(), cutoffMs)),
      }));

    const pastQueue = queuePoints.filter((q) => q.embassy === embassy && q.observationDate.getTime() <= cutoffMs);

    // Baseline historical median duration known on cutoff date
    const pastDurations = pastJourneys
      .filter((r) => r.waitingListJoinedDate && r.submissionInvitedDate)
      .map((r) => diffDays(r.waitingListJoinedDate!, r.submissionInvitedDate!))
      .filter((d) => d >= 0 && d <= 730)
      .sort((a, b) => a - b);
    const pastMedianDur = pastDurations.length >= 2 ? quantile(pastDurations, 0.5)! : 240;

    // Evaluation subjects: joined on/before cutoff, NOT yet invited on cutoff, WITH known future invite
    const evalSubjects = journeys.filter(
      (r) =>
        r.embassy === embassy &&
        r.waitingListJoinedDate &&
        r.waitingListJoinedDate.getTime() <= cutoffMs &&
        r.submissionInvitedDate &&
        r.submissionInvitedDate.getTime() > cutoffMs &&
        diffDays(r.waitingListJoinedDate, r.submissionInvitedDate) <= 730
    );

    if (evalSubjects.length === 0) continue;

    // Limit heavy Monte Carlo repeats per unique joining date at this cutoff for fast reproducible scoring
    const cacheByJoinDay = new Map<string, ReturnType<typeof buildPersonalForecast>>();

    for (const subj of evalSubjects) {
      const joinIso = toIsoDay(subj.waitingListJoinedDate)!;
      let fc = cacheByJoinDay.get(joinIso);
      if (!fc) {
        fc = buildPersonalForecast(
          { embassy, waitingListJoinedDate: subj.waitingListJoinedDate! },
          pastJourneys,
          pastQueue,
          cutoff,
          { iterations: 800 }
        );
        cacheByJoinDay.set(joinIso, fc);
      }

      const actualDaysFromCutoff = Math.max(0, diffDays(cutoff, subj.submissionInvitedDate!));
      const siStage = fc.stages.find((s) => s.stage === "SUBMISSION_INVITED");
      if (siStage && siStage.p50Date && siStage.p10Date && siStage.p25Date && siStage.p75Date && siStage.p90Date) {
        ensembleSamples.push({
          actualDaysFromCutoff,
          predP10Days: diffDays(cutoff, new Date(`${siStage.p10Date}T00:00:00Z`)),
          predP25Days: diffDays(cutoff, new Date(`${siStage.p25Date}T00:00:00Z`)),
          predP50Days: diffDays(cutoff, new Date(`${siStage.p50Date}T00:00:00Z`)),
          predP75Days: diffDays(cutoff, new Date(`${siStage.p75Date}T00:00:00Z`)),
          predP90Days: diffDays(cutoff, new Date(`${siStage.p90Date}T00:00:00Z`)),
        });
      }

      // Baseline 1: Fixed Historical Median
      const fixedTarget = addDays(subj.waitingListJoinedDate!, pastMedianDur);
      const fixedDays = Math.max(0, diffDays(cutoff, fixedTarget));
      fixedMedianSamples.push({
        actualDaysFromCutoff,
        predP10Days: Math.max(0, fixedDays - 21),
        predP25Days: Math.max(0, fixedDays - 10),
        predP50Days: fixedDays,
        predP75Days: fixedDays + 10,
        predP90Days: fixedDays + 21,
      });

      // Baseline 2 & 3: 7d and 30d sensitivity queue projections
      const s7 = fc.speedSensitivity.find((s) => s.windowDays === 7)?.estimatedSubmissionInviteDate;
      if (s7) {
        const d7 = Math.max(0, diffDays(cutoff, new Date(`${s7}T00:00:00Z`)));
        queue7dSamples.push({
          actualDaysFromCutoff,
          predP10Days: Math.max(0, d7 - 14),
          predP25Days: Math.max(0, d7 - 7),
          predP50Days: d7,
          predP75Days: d7 + 7,
          predP90Days: d7 + 14,
        });
      }
      const s30 = fc.speedSensitivity.find((s) => s.windowDays === 30)?.estimatedSubmissionInviteDate;
      if (s30) {
        const d30 = Math.max(0, diffDays(cutoff, new Date(`${s30}T00:00:00Z`)));
        queue30dSamples.push({
          actualDaysFromCutoff,
          predP10Days: Math.max(0, d30 - 14),
          predP25Days: Math.max(0, d30 - 7),
          predP50Days: d30,
          predP75Days: d30 + 7,
          predP90Days: d30 + 14,
        });
      }
    }
  }

  return [
    computeModelMetrics(embassy, "Adaptive MC + KM Ensemble", ensembleSamples),
    computeModelMetrics(embassy, "Baseline: Fixed Historical Median", fixedMedianSamples),
    computeModelMetrics(embassy, "Baseline: 7-Day Velocity Only", queue7dSamples),
    computeModelMetrics(embassy, "Baseline: 30-Day Velocity Only", queue30dSamples),
  ];
}
