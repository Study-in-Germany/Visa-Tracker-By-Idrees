export type ConsulateRow = {
  consulate: string;
  total: number;
  issued: number;
  rejected: number;
  avgWaitingToSubmission: number | null;
  avgSubmissionToAppointment: number | null;
  avgAppointmentToDecision: number | null;
};

export type Analytics = {
  total: number;
  activeApplicants: number;
  completedCases: number;
  visaIssued: number;
  visaRejected: number;
  statusCounts: Record<string, number>;
  topUniversities: { university: string; count: number }[];
  consulateComparison: ConsulateRow[];
  processing: {
    avgWaitingToSubmission: number | null;
    avgSubmissionToAppointment: number | null;
    avgAppointmentToDecision: number | null;
    sampleSizes?: {
      waitingToSubmission: number;
      submissionToAppointment: number;
      appointmentToDecision: number;
    };
  };
  monthlyVolume: { month: string; count: number }[];
  monthlyOutcomes: { month: string; issued: number; rejected: number }[];
};

export type ApplicantRow = {
  id: string;
  publicId: string;
  name: string | null;
  university: string | null;
  program?: string | null;
  intake?: string | null;
  consulate: string;
  waitingListDate: string | null;
  submissionInviteDate?: string | null;
  documentSubmissionDate: string | null;
  correctionRequestDate: string | null;
  correctionSubmittedDate?: string | null;
  appointmentDate: string | null;
  interviewDate?: string | null;
  decisionDate?: string | null;
  visaStatus: string;
  approval?: string;
  isAnonymous?: boolean;
  queuePosition?: number | null;
  updatedAt?: string;
  createdAt?: string;
};

export type ApplicantsResponse = {
  applicants: ApplicantRow[];
  count: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
