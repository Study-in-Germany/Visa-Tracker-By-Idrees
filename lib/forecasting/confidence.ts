import { MIN_EVIDENCE_SAMPLE } from "./config";
import type { ConfidenceLevel } from "./types";

export interface ConfidenceAssessmentInput {
  effectiveSampleSize: number;
  horizonDays: number | null;
  hasConflict: boolean;
  isStalled: boolean;
  lastUpdatedAgeDays: number;
}

/**
 * Computes transparent multi-factor confidence ratings.
 * Never awards "high" confidence merely for a large sample when horizon is distant,
 * reports disagree, velocity is stalled, or data is stale.
 */
export function assessForecastConfidence(input: ConfidenceAssessmentInput): {
  level: ConfidenceLevel;
  reasons: string[];
} {
  const reasons: string[] = [];
  let level: ConfidenceLevel;

  if (input.effectiveSampleSize < MIN_EVIDENCE_SAMPLE.INSUFFICIENT) {
    level = "insufficient";
    reasons.push(`Limited effective evidence (${input.effectiveSampleSize.toFixed(1)} effective observations).`);
  } else if (input.effectiveSampleSize < MIN_EVIDENCE_SAMPLE.LOW) {
    level = "low";
    reasons.push(`Moderate-small effective sample (${input.effectiveSampleSize.toFixed(1)} effective observations).`);
  } else if (input.effectiveSampleSize < MIN_EVIDENCE_SAMPLE.MODERATE) {
    level = "moderate";
    reasons.push(`Solid recent evidence (${input.effectiveSampleSize.toFixed(1)} effective observations).`);
  } else {
    level = "high";
    reasons.push(`Strong recent sample (${input.effectiveSampleSize.toFixed(1)} effective observations).`);
  }

  const downgrade = () => {
    if (level === "high") level = "moderate";
    else if (level === "moderate") level = "low";
  };

  if (input.hasConflict) {
    downgrade();
    reasons.push("Internal and external sources show moderate frontier disagreement.");
  }
  if (input.isStalled) {
    downgrade();
    reasons.push("Recent queue movement appears slow or irregular.");
  }
  if (input.horizonDays !== null && input.horizonDays > 120) {
    downgrade();
    reasons.push("Long forecast horizon (>4 months) increases embassy pacing uncertainty.");
  }
  if (input.lastUpdatedAgeDays > 21) {
    downgrade();
    reasons.push(`Most recent community observation is ${input.lastUpdatedAgeDays} days old.`);
  }

  return { level, reasons };
}
