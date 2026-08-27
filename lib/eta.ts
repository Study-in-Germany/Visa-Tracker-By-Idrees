// A lightweight, transparent ETA engine. It looks at *observed* gaps between
// journey stages for approved applicants at the same consulate and applies
// the median observed gap to applicants still waiting at an earlier stage.
// This is intentionally simple and explainable rather than a black box.

export type StageSample = { from: Date | null; to: Date | null };

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export function confidenceFromSampleSize(n: number): "High" | "Medium" | "Low" {
  if (n >= 20) return "High";
  if (n >= 6) return "Medium";
  return "Low";
}

/**
 * Given historical (from -> to) date pairs for a completed stage transition,
 * and a known "from" date for the applicant in question, estimate the "to"
 * date using the median observed gap, plus a confidence label.
 */
export function estimateNextStage(samples: StageSample[], fromDate: Date | null) {
  if (!fromDate) return null;

  const gaps = samples
    .filter((s): s is { from: Date; to: Date } => !!s.from && !!s.to)
    .map((s) => daysBetween(s.from, s.to))
    .filter((d) => d >= 0 && d < 400); // discard obvious data errors

  if (gaps.length === 0) return null;

  const medianGap = median(gaps)!;
  // Give a +/- range using the interquartile spread for a rough window.
  const sorted = [...gaps].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];

  const estimated = new Date(fromDate);
  estimated.setDate(estimated.getDate() + medianGap);

  const earliest = new Date(fromDate);
  earliest.setDate(earliest.getDate() + Math.max(q1, 0));

  const latest = new Date(fromDate);
  latest.setDate(latest.getDate() + Math.max(q3, medianGap));

  return {
    estimated,
    earliest,
    latest,
    medianGapDays: medianGap,
    sampleSize: gaps.length,
    confidence: confidenceFromSampleSize(gaps.length),
  };
}
