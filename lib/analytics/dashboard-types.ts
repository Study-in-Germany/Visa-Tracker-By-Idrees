import type { DistributionStats, Embassy, EmbassyFrontierSummary, QueueVelocitySummary } from "@/lib/forecasting/types";
import type { NormalizedProgrammeEntry, NormalizedUniversityEntry } from "./university-normalizer";

export interface CohortProgressItem {
  month: string;
  total: number;
  waitingList: number;
  submissionInvited: number;
  documentsSubmitted: number;
  appointmentStage: number;
  visaIssued: number;
  visaRejected: number;
  withdrawn: number;
}

export interface WaitByInviteMonthItem {
  month: string;
  medianDays: number;
  p25Days: number;
  p75Days: number;
  sampleSize: number;
}

export interface WeeklyActivityItem {
  weekStart: string;
  submissions: number;
  corrections: number;
  appointments: number;
  cohortDaysCleared: number | null;
}

export interface CorrectionAnalyticsStats {
  eligibleSubmissionsCount: number;
  applicantsWithCorrection: number;
  totalCorrectionEvents: number;
  correctionRatePct: number | null;
  timeUntilFirstCorrection: DistributionStats;
  correctionResponseTime: DistributionStats;
  postCorrectionProcessing: DistributionStats;
}

export interface AnalyticsFilterState {
  from: string;
  to: string;
  consulate: string;
  visaStatus: string;
  university: string;
  intake: string;
}

export interface ActivityBucket {
  period: string;
  total: number;
  islamabad: number;
  karachi: number;
}

export interface EmbassyDistributionRow {
  consulate: string;
  total: number;
  active: number;
  issued: number;
  rejected: number;
  sharePct: number;
}

export interface StatusDistributionRow {
  status: string;
  count: number;
  sharePct: number;
  isActive: boolean;
  isTerminal: boolean;
}

export interface ProcessingStageStat {
  id: "wl_to_invite" | "doc_to_appt" | "appt_to_decision";
  label: string;
  shortLabel: string;
  definition: string;
  sampleSize: number;
  medianDays: number | null;
  p25Days: number | null;
  p75Days: number | null;
  minDays: number | null;
  maxDays: number | null;
  available: boolean;
  note: string | null;
}

export type ProgressionPointSource = "queue_checkpoint" | "individual_report" | "combined";

export interface ProgressionHistoryPoint {
  observationDate: string;
  submissionFrontier: string | null;
  appointmentWlFrontier: string | null;
  reportedSubmissions: number | null;
  reportedCorrections: number | null;
  reportedAppointments: number | null;
  source: ProgressionPointSource;
}

export interface EmbassyDecisionComparison {
  internalApprovedCount: number;
  internalRejectedCount: number;
  internalWithdrawnCount: number;
  internalDecidedCount: number;
  externalApprovedCount: number;
  externalRejectedCount: number;
  externalWithdrawnCount: number;
  externalDecidedCount: number;
  externalApprovalRatePct: number | null;
  externalDecisionMedianDays: number | null;
  externalDecisionSampleSize: number;
}

export interface AnalyticsEmbassyIntelligence {
  modelVersion: string;
  generatedAt: string;
  embassy: Embassy;
  frontiers: {
    submission: EmbassyFrontierSummary;
    appointmentBySubmission: EmbassyFrontierSummary;
    appointmentByWaitingList: EmbassyFrontierSummary;
  };
  velocity: QueueVelocitySummary;
  durations: {
    embassy: Embassy;
    totalEligibleCount: number;
    waitingToInvite: DistributionStats;
    waitingToInviteInternalOnly: DistributionStats;
    submissionDelay: DistributionStats;
    documentReview: DistributionStats;
    appointmentScheduling: DistributionStats;
    decisionProcessing: DistributionStats;
    passportDelivery: DistributionStats;
    totalJourney: DistributionStats;
    corrections: CorrectionAnalyticsStats;
    decisions: {
      approvedCount: number;
      rejectedCount: number;
      withdrawnCount: number;
      approvalRatePct: number | null;
    };
    survivalMedianDays: number | null;
    survivalP25Days: number | null;
    survivalP75Days: number | null;
  };
  progressionHistory: {
    observationDate: string;
    submissionFrontier: string | null;
    appointmentWlFrontier: string | null;
    reportedSubmissions: number | null;
    reportedCorrections: number | null;
    reportedAppointments: number | null;
  }[];
  weeklyActivity: WeeklyActivityItem[];
  cohortProgress: CohortProgressItem[];
  waitByInviteMonth: WaitByInviteMonthItem[];
  progressionPoints: ProgressionHistoryPoint[];
  decisionComparison: EmbassyDecisionComparison;
}

export interface AnalyticsDashboardPayload {
  asOfDate: string;
  generatedAt: string;
  filtersApplied: AnalyticsFilterState & {
    dateDimension: "waitingListDate";
  };
  facets: {
    universities: { value: string; label: string; count: number }[];
    intakes: { value: string; label: string; count: number }[];
  };
  summary: {
    total: number;
    withWaitingListDate: number;
    activeApplicants: number;
    completedCases: number;
    visaIssued: number;
    visaRejected: number;
    withdrawn: number;
    decidedCases: number;
    approvalRatePct: number | null;
    medianWaitDays: number | null;
    waitP25Days: number | null;
    waitP75Days: number | null;
    waitSampleSize: number;
    invitationsRecorded: number;
    appointmentsRecorded: number;
  };
  activity: {
    monthlyByJoinDate: ActivityBucket[];
    weeklyByJoinDate: ActivityBucket[];
    monthlyByEntryDate: ActivityBucket[];
    weeklyByEntryDate: ActivityBucket[];
  };
  embassyDistribution: EmbassyDistributionRow[];
  statusDistribution: StatusDistributionRow[];
  processingDurations: {
    stages: ProcessingStageStat[];
    observedEndToEnd: {
      sampleSize: number;
      medianDays: number | null;
      p25Days: number | null;
      p75Days: number | null;
      available: boolean;
    };
  };
  internalDecisions: {
    issued: number;
    rejected: number;
    withdrawn: number;
    decided: number;
    approvalRatePct: number | null;
    monthlyOutcomes: { month: string; issued: number; rejected: number }[];
    medianDecisionDays: number | null;
    decisionDurationSampleSize: number;
  };
  universities: {
    totalWithUniversity: number;
    uniqueNormalizedCount: number;
    items: NormalizedUniversityEntry[];
  };
  programmes: {
    totalWithProgramme: number;
    items: NormalizedProgrammeEntry[];
  };
  intelligence: {
    modelVersion: string;
    datasetSummary: {
      internalApprovedCount: number;
      externalTimelineCount: number;
      combinedDeduplicatedCount: number;
      queueObservationsCount: number;
    };
    embassies: Record<Embassy, AnalyticsEmbassyIntelligence>;
  };
}
