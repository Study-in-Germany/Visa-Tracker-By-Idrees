import { DEFAULT_HALF_LIFE_DAYS, RELIABILITY_WEIGHTS } from "./config";
import { diffDays } from "./date-utils";
import { exponentialDecayWeight } from "./statistics";
import type { NormalizedJourneyRecord } from "./types";

export function computeJourneyWeight(
  record: NormalizedJourneyRecord,
  eventDate: Date,
  asOfDate: Date,
  halfLifeDays = DEFAULT_HALF_LIFE_DAYS,
  clusterSize = 1
): number {
  const rel = RELIABILITY_WEIGHTS[record.reliability] ?? 0.65;
  const ageDays = Math.max(0, diffDays(eventDate, asOfDate));
  const recency = exponentialDecayWeight(ageDays, halfLifeDays);
  const precision = Math.min(1, Math.max(0.25, record.confidence));
  const verification = record.sourceType === "internal" ? 1.0 : 0.88;
  const correlationDiscount = 1 / Math.max(1, Math.sqrt(clusterSize));
  return rel * recency * precision * verification * correlationDiscount;
}
