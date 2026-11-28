export const MODEL_VERSION = "v2.0.0-mc-km-ensemble";

export const EMBASSIES = ["Islamabad", "Karachi"] as const;

export const VELOCITY_WINDOWS = [7, 14, 30, 60, 90, 180] as const;

/** Engineering baseline weights across recent movement windows (renormalized dynamically). */
export const VELOCITY_WEIGHTS: Record<number, number> = {
  7: 0.3,
  14: 0.25,
  30: 0.25,
  60: 0.12,
  90: 0.08,
};

export const HALF_LIFE_CANDIDATES = [14, 30, 60, 90] as const;
export const DEFAULT_HALF_LIFE_DAYS = 45;

export const SHRINKAGE_K = 30;
export const DEFAULT_FRONTIER_QUANTILE = 0.75;
export const MONTE_CARLO_ITERATIONS = 5_000;
export const MAX_FORECAST_HORIZON_DAYS = 730;
export const STALE_WAITING_CAP_DAYS = 390;

export const RELIABILITY_WEIGHTS = {
  OFFICIAL: 1.0,
  VERIFIED_COMMUNITY: 0.9,
  COMMUNITY_PLATFORM: 0.75,
  CROWD_REPORT: 0.65,
  UNVERIFIED: 0.35,
} as const;

export const MIN_EVIDENCE_SAMPLE = {
  INSUFFICIENT: 10,
  LOW: 30,
  MODERATE: 100,
} as const;
