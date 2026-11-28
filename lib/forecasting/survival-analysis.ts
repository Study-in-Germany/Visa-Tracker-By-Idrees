import { STALE_WAITING_CAP_DAYS } from "./config";
import { diffDays } from "./date-utils";
import type { SurvivalEstimate } from "./types";

export interface SurvivalSubject {
  startDate: Date;
  endDate: Date | null;
  completed: boolean;
  lastObservedAt: Date;
}

/**
 * Computes right-censored Kaplan-Meier survival curve `S(t) = product(1 - d_i / n_i)`.
 * Never assumes inactive/stale entries are still actively waiting indefinitely; caps at
 * `min(lastObservedAt, asOfDate)` or `STALE_WAITING_CAP_DAYS` beyond `lastObservedAt`.
 */
export function fitKaplanMeier(
  subjects: SurvivalSubject[],
  asOfDate: Date,
  maxWaitDays = 730
): SurvivalEstimate {
  const observations: { duration: number; event: boolean }[] = [];

  for (const s of subjects) {
    if (s.completed && s.endDate) {
      const d = diffDays(s.startDate, s.endDate);
      if (d >= 0 && d <= maxWaitDays) {
        observations.push({ duration: d, event: true });
      }
    } else {
      // Censor at last confirmed observation + staleness guard
      const staleLimit = new Date(s.lastObservedAt.getTime() + 60 * 86_400_000);
      const effectiveCensor = staleLimit.getTime() < asOfDate.getTime() ? staleLimit : asOfDate;
      const d = Math.min(STALE_WAITING_CAP_DAYS, diffDays(s.startDate, effectiveCensor));
      if (d >= 0) {
        observations.push({ duration: d, event: false });
      }
    }
  }

  observations.sort((a, b) => a.duration - b.duration);
  const eventsCompleted = observations.filter((o) => o.event).length;
  const censoredCount = observations.length - eventsCompleted;

  if (observations.length === 0 || eventsCompleted === 0) {
    return {
      sampleSize: observations.length,
      eventsCompleted,
      censoredCount,
      p25Days: null,
      medianDays: null,
      p75Days: null,
      conditionalRemainingMedian: () => null,
      survivalAt: () => null,
    };
  }

  // Group event counts at unique time points
  const byTime = new Map<number, { events: number; totalAtTime: number }>();
  for (const o of observations) {
    const slot = byTime.get(o.duration) ?? { events: 0, totalAtTime: 0 };
    slot.totalAtTime++;
    if (o.event) slot.events++;
    byTime.set(o.duration, slot);
  }

  const uniqueTimes = Array.from(byTime.keys()).sort((a, b) => a - b);
  const curve: { time: number; survival: number }[] = [{ time: 0, survival: 1 }];
  let atRisk = observations.length;
  let survival = 1;

  for (const t of uniqueTimes) {
    const slot = byTime.get(t)!;
    if (slot.events > 0 && atRisk > 0) {
      survival = survival * (1 - slot.events / atRisk);
      curve.push({ time: t, survival });
    }
    atRisk -= slot.totalAtTime;
  }

  const survivalAt = (days: number): number | null => {
    if (days < 0) return 1;
    let s = 1;
    for (const pt of curve) {
      if (pt.time <= days) s = pt.survival;
      else break;
    }
    return Math.round(s * 1000) / 1000;
  };

  const timeForQuantile = (targetSurvival: number): number | null => {
    for (const pt of curve) {
      if (pt.survival <= targetSurvival) return pt.time;
    }
    return null;
  };

  const conditionalRemainingMedian = (alreadyWaitedDays: number): number | null => {
    const sNow = survivalAt(alreadyWaitedDays);
    if (sNow === null || sNow <= 0.05) return null;
    const target = sNow * 0.5;
    for (const pt of curve) {
      if (pt.time > alreadyWaitedDays && pt.survival <= target) {
        return Math.max(0, pt.time - alreadyWaitedDays);
      }
    }
    return null;
  };

  return {
    sampleSize: observations.length,
    eventsCompleted,
    censoredCount,
    p25Days: timeForQuantile(0.75),
    medianDays: timeForQuantile(0.5),
    p75Days: timeForQuantile(0.25),
    conditionalRemainingMedian,
    survivalAt,
  };
}
