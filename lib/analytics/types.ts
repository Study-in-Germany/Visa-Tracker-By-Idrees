import type { ConfidenceLevel, Embassy, PersonalForecastResult } from "@/lib/forecasting/types";

export interface SparklinePoint {
  date: string;
  value: number;
  label?: string;
}

export interface QueueMetricView {
  label: string;
  mobileLabel?: string;
  value: string | null;
  sublabel?: string;
  mobileSublabel?: string;
  suffix?: string;
  rawDate?: string | null;
  available: boolean;
}

export interface MonthlyTimelineMonth {
  key: string;
  label: string;
  year: number;
  startMs: number;
  endMs: number;
  fillRatio: number;
  fillPercent: number;
}

export interface EmbassyQueueDiagnostics {
  internalLatestCohort: string | null;
  internalSampleSize: number;
  combinedFrontierDate: string | null;
  observedRangeStart: string | null;
  observedRangeEnd: string | null;
  sampleSize: number;
  effectiveSampleSize: number;
  sourceClassification: string;
  confidence: ConfidenceLevel;
  hasConflict: boolean;
  conflictSummary: string | null;
  lastUpdatedDate: string | null;
  appointmentByWaitingListDate: string | null;
  velocityWindows: { windowDays: number; weeklyRateDays: number | null; observationsCount: number }[];
  isStalled: boolean;
}

export interface EmbassyQueueView {
  embassy: Embassy;
  hasEnoughData: boolean;
  submissionFrontier: QueueMetricView;
  appointmentFrontier: QueueMetricView;
  weeklyMovement: QueueMetricView;
  timeline: {
    months: MonthlyTimelineMonth[];
    activeMonthIndex: number;
    activeMonthFillRatio: number;
    overallRatio: number;
    markerPercent: number;
    markerShortDate: string;
    frontierDisplayDate: string;
    frontierIsoDate: string;
  } | null;
  confidenceLabel: string | null;
  confidenceDetail: string | null;
  confidenceTone: "amber" | "muted" | null;
  warning: string | null;
  diagnostics: EmbassyQueueDiagnostics;
}

export interface CanonicalQueueOverview {
  asOfDate: string;
  lastUpdatedDate: string | null;
  freshnessLabel: string;
  modelVersion: string;
  datasetSummary: {
    internalApprovedCount: number;
    externalTimelineCount: number;
    combinedDeduplicatedCount: number;
    queueObservationsCount: number;
  };
  embassies: EmbassyQueueView[];
}

export type MilestoneFieldKey =
  | "waitingListDate"
  | "submissionInviteDate"
  | "documentSubmissionDate"
  | "correctionRequestDate"
  | "correctionSubmittedDate"
  | "appointmentDate"
  | "interviewDate"
  | "decisionDate";

export type TransitMilestoneState =
  | "completed"
  | "scheduled"
  | "current"
  | "action-required"
  | "upcoming"
  | "unavailable"
  | "terminal";

export interface TransitMilestoneView {
  id: string;
  label: string;
  actualDate: string | null;
  formattedActualDate: string | null;
  estimatedRange: {
    from: string;
    to: string;
    formatted: string;
  } | null;
  state: TransitMilestoneState;
  terminalOutcome?: "issued" | "rejected" | "withdrawn" | null;
  confidence: ConfidenceLevel | null;
  statusLabel: string | null;
  isCurrentStep: boolean;
  milestoneField?: MilestoneFieldKey;
}

export interface JourneyNextActionView {
  actionId: string;
  title: string;
  description: string;
  buttonLabel: string;
  milestoneField: MilestoneFieldKey;
  milestoneLabel: string;
  currentDateValue: string | null;
  tone: "action" | "neutral";
}

export interface CorrectionHistoryItem {
  type: "requested" | "submitted";
  date: string;
  note?: string | null;
}

export interface TransitJourneyViewModel {
  embassy: Embassy;
  asOfDate: string;
  updatedAt: string | null;
  freshnessLabel: string;
  currentStage: {
    label: string;
    statusText: string;
    tone: "neutral" | "action" | "completed" | "terminal-rejected";
  };
  milestones: TransitMilestoneView[];
  nextAction: JourneyNextActionView | null;
  corrections: {
    count: number;
    isActive: boolean;
    summaryText: string | null;
    events: CorrectionHistoryItem[];
  };
  confidence: ConfidenceLevel;
  warningNote: string | null;
  forecast: PersonalForecastResult;
}

/** One numbered station of the processing itinerary (history of community entries, not a personal journey). */
export interface StageDurationView {
  id: string;
  title: string;
  /** Concise canonical count, e.g. "420 tracked", "52 received", "23 recorded". */
  subtitle: string;
}

/** Typical duration of the transition between two adjacent stations. */
export interface StageTransitionView {
  fromId: string;
  toId: string;
  available: boolean;
  /** e.g. "7.3 months" – null when unavailable. */
  approx: string | null;
  /** e.g. "3.8–8.5 months" – null when unavailable. */
  range: string | null;
  sampleSize: number;
  /** Clarifies the true starting event when it differs from the station, e.g. "After submission". */
  anchor: string | null;
  /** Honest unavailable explanation, e.g. "Limited data". */
  note: string | null;
  definition: string;
}

export interface CorrectionSummaryView {
  hasData: boolean;
  submissionsCount: number;
  correctionCount: number;
  percent: number | null;
  oneInN: number | null;
  postCorrectionApprox: string | null;
  postCorrectionSampleSize: number;
}

export interface VisaStageTimelineView {
  subtitle: string;
  usedAllTimeFallback: boolean;
  stages: StageDurationView[];
  /** transitions[i] connects stages[i] and stages[i + 1]. */
  transitions: StageTransitionView[];
  correction: CorrectionSummaryView;
  externalDecisionNote: string | null;
  details: {
    windowDescription: string;
    internalDecidedCount: number;
    externalDecisionSampleSize: number;
    externalDecisionMedianDays: number | null;
    stageDefinitions: { stage: string; definition: string; sampleSize: number }[];
  };
}

export interface PersonalJourneyStageView {
  key: string;
  title: string;
  status: "completed" | "current" | "cohort_reached" | "estimated" | "needs_confirmation" | "unavailable";
  primaryDate: string;
  secondaryLabel: string | null;
  isEstimated: boolean;
}

export interface PersonalJourneyView {
  embassy: Embassy;
  asOfDate: string;
  lastUpdatedLabel: string;
  banner: { tone: "info" | "warn"; title: string; body: string } | null;
  stages: PersonalJourneyStageView[];
  hasCorrectionHistory: boolean;
  correctionSummaryText: string | null;
  forecast: PersonalForecastResult;
}

export interface DashboardKpiView {
  waitingTime: {
    label: string;
    days: number | null;
    secondary: string;
  };
  queueFrontier: {
    label: string;
    value: string;
    secondary: string;
    sparklinePoints: SparklinePoint[];
  };
  nextMilestone: {
    label: string;
    value: string;
    secondary: string;
  };
  confidence: {
    label: string;
    value: string;
    secondary: string;
    bars: 0 | 1 | 2 | 3;
  };
}
