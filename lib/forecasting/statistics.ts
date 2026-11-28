import { DEFAULT_HALF_LIFE_DAYS, SHRINKAGE_K } from "./config";
import type { DistributionStats } from "./types";

export function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function weightedQuantile(pairs: { value: number; weight: number }[], q: number): number | null {
  const valid = pairs
    .filter((p) => Number.isFinite(p.value) && p.weight > 0)
    .sort((a, b) => a.value - b.value);
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0].value;

  const totalW = valid.reduce((s, p) => s + p.weight, 0);
  if (totalW <= 0) return quantile(valid.map((v) => v.value), q);

  const target = q * totalW;
  let cum = 0;
  for (let i = 0; i < valid.length; i++) {
    const prevCum = cum;
    cum += valid[i].weight;
    if (cum >= target) {
      if (i === 0) return valid[0].value;
      const frac = (target - prevCum) / Math.max(1e-9, valid[i].weight);
      return valid[i - 1].value + (valid[i].value - valid[i - 1].value) * frac;
    }
  }
  return valid[valid.length - 1].value;
}

export function exponentialDecayWeight(ageDays: number, halfLifeDays = DEFAULT_HALF_LIFE_DAYS): number {
  if (halfLifeDays <= 0) return 1;
  return Math.exp((-Math.LN2 * Math.max(0, ageDays)) / halfLifeDays);
}

export function computeEffectiveSampleSize(weights: number[]): number {
  const valid = weights.filter((w) => Number.isFinite(w) && w > 0);
  if (valid.length === 0) return 0;
  const sumW = valid.reduce((s, w) => s + w, 0);
  const sumW2 = valid.reduce((s, w) => s + w * w, 0);
  if (sumW2 <= 0) return 0;
  return (sumW * sumW) / sumW2;
}

export function shrinkageBlend(
  internalEstimate: number | null,
  externalEstimate: number | null,
  effectiveInternalN: number,
  k = SHRINKAGE_K
): { value: number | null; internalWeight: number } {
  if (internalEstimate === null && externalEstimate === null) {
    return { value: null, internalWeight: 0 };
  }
  if (internalEstimate !== null && externalEstimate === null) {
    return { value: internalEstimate, internalWeight: 1 };
  }
  if (internalEstimate === null && externalEstimate !== null) {
    return { value: externalEstimate, internalWeight: 0 };
  }
  const wInt = effectiveInternalN / Math.max(1, effectiveInternalN + k);
  return {
    value: wInt * (internalEstimate as number) + (1 - wInt) * (externalEstimate as number),
    internalWeight: wInt,
  };
}

export function computeDistributionStats(
  samples: { value: number; weight?: number }[],
  censoredCount = 0
): DistributionStats {
  const valid = samples.filter((s) => Number.isFinite(s.value));
  if (valid.length === 0) {
    return {
      sampleSize: 0,
      effectiveSampleSize: 0,
      censoredCount,
      mean: null,
      median: null,
      weightedMedian: null,
      stdDev: null,
      min: null,
      max: null,
      p10: null,
      p25: null,
      p50: null,
      p75: null,
      p90: null,
      iqr: null,
    };
  }

  const values = valid.map((s) => s.value).sort((a, b) => a - b);
  const weights = valid.map((s) => s.weight ?? 1);
  const effectiveN = computeEffectiveSampleSize(weights);

  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = n > 1 ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);

  const p10 = quantile(values, 0.1)!;
  const p25 = quantile(values, 0.25)!;
  const p50 = quantile(values, 0.5)!;
  const p75 = quantile(values, 0.75)!;
  const p90 = quantile(values, 0.9)!;
  const weightedMedian = weightedQuantile(
    valid.map((s) => ({ value: s.value, weight: s.weight ?? 1 })),
    0.5
  );

  return {
    sampleSize: n,
    effectiveSampleSize: Math.round(effectiveN * 10) / 10,
    censoredCount,
    mean: Math.round(mean * 10) / 10,
    median: Math.round(p50 * 10) / 10,
    weightedMedian: weightedMedian !== null ? Math.round(weightedMedian * 10) / 10 : null,
    stdDev: Math.round(stdDev * 10) / 10,
    min: values[0],
    max: values[n - 1],
    p10: Math.round(p10 * 10) / 10,
    p25: Math.round(p25 * 10) / 10,
    p50: Math.round(p50 * 10) / 10,
    p75: Math.round(p75 * 10) / 10,
    p90: Math.round(p90 * 10) / 10,
    iqr: Math.round((p75 - p25) * 10) / 10,
  };
}
