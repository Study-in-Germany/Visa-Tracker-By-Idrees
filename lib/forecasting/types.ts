export type Embassy = "Islamabad" | "Karachi";

export type NormalizedMilestoneKey =
  | "WAITING_LIST_JOINED"
  | "SUBMISSION_INVITED"
  | "DOCUMENTS_SUBMITTED"
  | "PRELIMINARY_REVIEW"
  | "CORRECTION_REQUESTED"
  | "CORRECTION_SUBMITTED"
  | "CORRECTION_ACCEPTED"
  | "APPOINTMENT_INVITED"
  | "APPOINTMENT_BOOKED"
  | "APPOINTMENT_ATTENDED"
  | "DECISION_MADE"
  | "PASSPORT_DISPATCHED"
  | "PASSPORT_RECEIVED";

export type QueueType =
  | "SUBMISSION_FRONTIER"
  | "APPOINTMENT_SUBMISSION_FRONTIER"
  | "APPOINTMENT_WL_COHORT_FRONTIER";

export type ConfidenceLevel = "high" | "moderate" | "low" | "insufficient";

export interface NormalizedJourneyRecord {
  id: string;
  sourceType: "internal" | "external";
  embassy: Embassy;
  visaCategory: string;
  reliability: "OFFICIAL" | "VERIFIED_COMMUNITY" | "COMMUNITY_PLATFORM" | "CROWD_REPORT" | "UNVERIFIED";
  confidence: number;
  reportDate: Date;
  lastConfirmedAt: Date;
  waitingListJoinedDate: Date | null;
  submissionInvitedDate: Date | null;
  documentsSubmittedDate: Date | null;
  preliminaryReviewDate: Date | null;
  correctionRequestDates: Date[];
  correctionResponseDates: Date[];
  correctionAcceptedDate: Date | null;
  appointmentInvitedDate: Date | null;
  appointmentBookedDate: Date | null;
  appointmentAttendedDate: Date | null;
  decisionDate: Date | null;
  decisionOutcome: "APPROVED" | "REJECTED" | "WITHDRAWN" | null;
  passportDispatchedDate: Date | null;
  passportReceivedDate: Date | null;
  fingerprint: string;
}

export interface QueueObservationPoint {
  id: string;
  sourceName: string;
  sourceType: string;
  reliability: NormalizedJourneyRecord["reliability"];
  embassy: Embassy;
  queueType: QueueType;
  observationDate: Date;
  observedFrontierDate: Date;
  sampleSize: number | null;
  reportedSubmissions: number | null;
  reportedCorrections: number | null;
  reportedAppointments: number | null;
  reportedActivityCount: number | null;
  confidence: number;
}

export interface DistributionStats {
  sampleSize: number;
  effectiveSampleSize: number;
  censoredCount: number;
  mean: number | null;
  median: number | null;
  weightedMedian: number | null;
  stdDev: number | null;
  min: number | null;
  max: number | null;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  iqr: number | null;
}

export interface VelocityWindowRate {
  windowDays: number;
  weeklyRateDays: number | null;
  observationsCount: number;
  spanDays: number;
}

export interface QueueVelocitySummary {
  weightedWeeklyDays: number | null;
  rawLatestWeeklyDays: number | null;
  windows: VelocityWindowRate[];
  isStalled: boolean;
  weightsUsed: Record<number, number>;
}

export interface EmbassyFrontierSummary {
  embassy: Embassy;
  queueType: QueueType;
  internalLatestCohort: string | null;
  internalSampleSize: number;
  combinedFrontierDate: string | null;
  observedRangeStart: string | null;
  observedRangeEnd: string | null;
  sampleSize: number;
  effectiveSampleSize: number;
  lastUpdatedDate: string | null;
  hasConflict: boolean;
  conflictSummary: string | null;
  sourceClassification: string;
  confidence: ConfidenceLevel;
}

export interface SurvivalEstimate {
  sampleSize: number;
  eventsCompleted: number;
  censoredCount: number;
  p25Days: number | null;
  medianDays: number | null;
  p75Days: number | null;
  conditionalRemainingMedian: (alreadyWaitedDays: number) => number | null;
  survivalAt: (days: number) => number | null;
}

export interface StageForecast {
  stage: NormalizedMilestoneKey;
  label: string;
  status: "completed" | "current" | "estimated" | "cohort_reached" | "needs_confirmation" | "unavailable";
  actualDate: string | null;
  p10Date: string | null;
  p25Date: string | null;
  p50Date: string | null;
  p75Date: string | null;
  p90Date: string | null;
  p50DaysRemaining: number | null;
  unresolvedFraction: number;
  sampleSize: number;
  effectiveSampleSize: number;
  stageConfidence?: ConfidenceLevel;
  note: string | null;
}

export interface ForecastScenarioSummary {
  key: "faster" | "typical" | "slower";
  label: string;
  weeklyVelocityDays: number | null;
  submissionInviteDate: string | null;
  appointmentInviteDate: string | null;
  decisionDate: string | null;
}

export interface SpeedSensitivitySummary {
  windowDays: number;
  label: string;
  weeklyVelocityDays: number | null;
  estimatedSubmissionInviteDate: string | null;
}

export interface PersonalForecastInput {
  embassy: Embassy;
  visaCategory?: string;
  waitingListJoinedDate: Date;
  submissionInvitedDate?: Date | null;
  documentsSubmittedDate?: Date | null;
  correctionSubmittedDate?: Date | null;
  appointmentInvitedDate?: Date | null;
  appointmentBookedDate?: Date | null;
  appointmentAttendedDate?: Date | null;
  decisionDate?: Date | null;
  expectedSubmissionDelayDays?: number | null;
  includeCorrectionBranch?: boolean | null;
}

export interface PersonalForecastResult {
  modelVersion: string;
  generatedAt: string;
  asOfDate: string;
  embassy: Embassy;
  visaCategory: string;
  cohortAlreadyReached: boolean;
  daysSinceCohortReached: number | null;
  cohortReachedMessage: string | null;
  currentSubmissionFrontier: string | null;
  frontierLagDays: number | null;
  elapsedWaitingDays: number;
  weeklyVelocityDays: number | null;
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  stages: StageForecast[];
  scenarios: ForecastScenarioSummary[];
  speedSensitivity: SpeedSensitivitySummary[];
  methodologySummary: {
    iterations: number;
    internalSampleSize: number;
    externalTimelineSampleSize: number;
    queueObservationsCount: number;
    effectiveSampleSize: number;
    queueModelWeight: number | null;
    durationModelWeight: number | null;
    halfLifeDays: number;
    shrinkageK: number;
  };
  limitations: string[];
}

export interface BacktestHorizonMetric {
  embassy: Embassy;
  modelName: string;
  n: number;
  maeDays: number | null;
  medianAeDays: number | null;
  p90AeDays: number | null;
  biasDays: number | null;
  coverage50Pct: number | null;
  coverage80Pct: number | null;
  avgIntervalWidthDays: number | null;
  pinballLossP50: number | null;
}
