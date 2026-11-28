import { VELOCITY_WEIGHTS, VELOCITY_WINDOWS } from "./config";
import { diffDays, toIsoDay } from "./date-utils";
import { quantile } from "./statistics";
import type {
  Embassy,
  NormalizedJourneyRecord,
  QueueObservationPoint,
  QueueType,
  QueueVelocitySummary,
  VelocityWindowRate,
} from "./types";

interface FrontierSeriesPoint {
  obsMs: number;
  frontierMs: number;
}

/**
 * Computes weekly queue advancement (`7 * (F(t2) - F(t1)) / (t2 - t1)`) across sliding windows.
 * Gaps with missing observations do NOT count as zero embassy movement; windows require
 * a genuine span between two dated observations.
 */
export function buildFrontierSeries(
  embassy: Embassy,
  queueType: QueueType,
  journeys: NormalizedJourneyRecord[],
  queuePoints: QueueObservationPoint[],
  asOfDate: Date
): FrontierSeriesPoint[] {
  const asOfMs = asOfDate.getTime();
  const byDay = new Map<string, number[]>();

  for (const q of queuePoints) {
    if (q.embassy !== embassy || q.queueType !== queueType) continue;
    if (q.observationDate.getTime() > asOfMs) continue;
    const key = toIsoDay(q.observationDate)!;
    const list = byDay.get(key) ?? [];
    list.push(q.observedFrontierDate.getTime());
    byDay.set(key, list);
  }

  for (const r of journeys) {
    if (r.embassy !== embassy) continue;
    let cohort: Date | null = null;
    let event: Date | null = null;
    if (queueType === "SUBMISSION_FRONTIER") {
      cohort = r.waitingListJoinedDate;
      event = r.submissionInvitedDate;
    } else if (queueType === "APPOINTMENT_SUBMISSION_FRONTIER") {
      cohort = r.documentsSubmittedDate ?? r.submissionInvitedDate;
      event = r.appointmentInvitedDate ?? r.appointmentBookedDate;
    } else {
      cohort = r.waitingListJoinedDate;
      event = r.appointmentInvitedDate ?? r.appointmentBookedDate;
    }
    if (!cohort || !event || event.getTime() > asOfMs || cohort.getTime() > event.getTime()) continue;
    const key = toIsoDay(event)!;
    const list = byDay.get(key) ?? [];
    list.push(cohort.getTime());
    byDay.set(key, list);
  }

  const series: FrontierSeriesPoint[] = [];
  for (const [dayKey, vals] of byDay.entries()) {
    const sorted = vals.sort((a, b) => a - b);
    const p75 = quantile(sorted, 0.75)!;
    series.push({ obsMs: new Date(`${dayKey}T00:00:00Z`).getTime(), frontierMs: p75 });
  }
  return series.sort((a, b) => a.obsMs - b.obsMs);
}

function estimateWindowVelocity(series: FrontierSeriesPoint[], windowDays: number, asOfDate: Date): VelocityWindowRate {
  const cutoffMs = asOfDate.getTime() - windowDays * 86_400_000;
  const subset = series.filter((p) => p.obsMs >= cutoffMs && p.obsMs <= asOfDate.getTime());
  if (subset.length < 2) {
    return { windowDays, weeklyRateDays: null, observationsCount: subset.length, spanDays: 0 };
  }

  const first = subset[0];
  const last = subset[subset.length - 1];
  const spanDays = Math.max(0, Math.round((last.obsMs - first.obsMs) / 86_400_000));
  if (spanDays < Math.min(4, Math.max(2, Math.floor(windowDays * 0.25)))) {
    return { windowDays, weeklyRateDays: null, observationsCount: subset.length, spanDays };
  }

  // Pairwise Theil-Sen median weekly slope inside window resists single-day noise/outliers
  const slopes: number[] = [];
  for (let i = 0; i < subset.length; i++) {
    for (let j = i + 1; j < subset.length; j++) {
      const dtDays = (subset[j].obsMs - subset[i].obsMs) / 86_400_000;
      if (dtDays < 2) continue;
      const dfDays = (subset[j].frontierMs - subset[i].frontierMs) / 86_400_000;
      const perWeek = (7 * dfDays) / dtDays;
      if (perWeek >= -5 && perWeek <= 60) {
        slopes.push(Math.max(0, perWeek));
      }
    }
  }

  if (slopes.length === 0) {
    const endpointRate = Math.max(0, (7 * ((last.frontierMs - first.frontierMs) / 86_400_000)) / spanDays);
    return {
      windowDays,
      weeklyRateDays: Math.round(Math.min(60, endpointRate) * 10) / 10,
      observationsCount: subset.length,
      spanDays,
    };
  }

  slopes.sort((a, b) => a - b);
  const med = quantile(slopes, 0.5)!;
  return {
    windowDays,
    weeklyRateDays: Math.round(med * 10) / 10,
    observationsCount: subset.length,
    spanDays,
  };
}

export function computeQueueVelocity(
  embassy: Embassy,
  queueType: QueueType,
  journeys: NormalizedJourneyRecord[],
  queuePoints: QueueObservationPoint[],
  asOfDate: Date
): QueueVelocitySummary {
  const series = buildFrontierSeries(embassy, queueType, journeys, queuePoints, asOfDate);
  const windows = VELOCITY_WINDOWS.map((w) => estimateWindowVelocity(series, w, asOfDate));

  let weightSum = 0;
  let weightedSum = 0;
  const weightsUsed: Record<number, number> = {};

  for (const win of windows) {
    const baseW = VELOCITY_WEIGHTS[win.windowDays];
    if (!baseW || win.weeklyRateDays === null) continue;
    weightSum += baseW;
    weightedSum += baseW * win.weeklyRateDays;
    weightsUsed[win.windowDays] = baseW;
  }

  if (weightSum > 0) {
    for (const k of Object.keys(weightsUsed)) {
      weightsUsed[+k] = Math.round((weightsUsed[+k] / weightSum) * 1000) / 1000;
    }
  }

  const weightedWeeklyDays = weightSum > 0 ? Math.round((weightedSum / weightSum) * 10) / 10 : null;
  const rawLatest = windows.find((w) => w.windowDays === 7 && w.weeklyRateDays !== null)?.weeklyRateDays ??
    windows.find((w) => w.weeklyRateDays !== null)?.weeklyRateDays ?? null;

  return {
    weightedWeeklyDays,
    rawLatestWeeklyDays: rawLatest,
    windows,
    isStalled: weightedWeeklyDays !== null && weightedWeeklyDays < 0.35,
    weightsUsed,
  };
}

export function computeHistoricalWeeklyBootstrapPool(
  series: FrontierSeriesPoint[],
  asOfDate: Date,
  lookbackDays = 180
): number[] {
  const cutoff = asOfDate.getTime() - lookbackDays * 86_400_000;
  const pts = series.filter((p) => p.obsMs >= cutoff && p.obsMs <= asOfDate.getTime());
  const pool: number[] = [];

  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dt = diffDays(new Date(pts[i].obsMs), new Date(pts[j].obsMs));
      if (dt < 5 || dt > 14) continue;
      const df = (pts[j].frontierMs - pts[i].frontierMs) / 86_400_000;
      const rate = (7 * df) / dt;
      if (rate >= 0 && rate <= 45) {
        pool.push(rate);
      }
    }
  }
  return pool;
}
