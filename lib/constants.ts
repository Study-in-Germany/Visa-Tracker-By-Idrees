export const SITE_NAME = "Visa Tracker by Idrees";

export const CONSULATES = ["Islamabad", "Karachi"]; // expandable later (Lahore, Dubai, etc.)

export const CONSULATE_CODES: Record<string, string> = {
  Islamabad: "ISB",
  Karachi: "KHI",
};

export const VISA_STATUS_LABELS: Record<string, string> = {
  WAITING_LIST: "Waiting List",
  WAITING_FOR_SUBMISSION: "Waiting for Submission",
  SUBMISSION_RECEIVED: "Submission Received",
  UNDER_CORRECTION: "Correction Requested",
  APPOINTMENT_SCHEDULED: "Appointment Scheduled",
  PROCESSING: "Processing",
  VISA_ISSUED: "Visa Issued",
  VISA_REJECTED: "Visa Rejected",
  WITHDRAWN: "Withdrawn",
  OTHER: "Other",
};

export const VISA_STATUS_ORDER = [
  "WAITING_LIST",
  "WAITING_FOR_SUBMISSION",
  "SUBMISSION_RECEIVED",
  "UNDER_CORRECTION",
  "APPOINTMENT_SCHEDULED",
  "PROCESSING",
  "VISA_ISSUED",
  "VISA_REJECTED",
  "WITHDRAWN",
  "OTHER",
];

export const VISA_STATUS_COLORS: Record<string, string> = {
  WAITING_LIST: "bg-paper-sunk text-ink-700 border-line-strong",
  WAITING_FOR_SUBMISSION: "bg-ochre-50 text-ochre-700 border-ochre-500/30",
  SUBMISSION_RECEIVED: "bg-ink-50 text-ink-700 border-ink-300/50",
  UNDER_CORRECTION: "bg-clay-50 text-clay-600 border-clay-400/40",
  APPOINTMENT_SCHEDULED: "bg-ink-100 text-ink-800 border-ink-300",
  PROCESSING: "bg-ochre-50 text-ochre-700 border-ochre-500/40",
  VISA_ISSUED: "bg-emerald-50 text-emerald-800 border-emerald-300",
  VISA_REJECTED: "bg-red-50 text-red-800 border-red-300",
  WITHDRAWN: "bg-paper-sunk text-ink-600 border-line",
  OTHER: "bg-paper-sunk text-ink-600 border-line",
};

// Hex values for charts, kept in step with VISA_STATUS_COLORS.
export const VISA_STATUS_HEX: Record<string, string> = {
  WAITING_LIST: "#a89f8a",
  WAITING_FOR_SUBMISSION: "#d2a63a",
  SUBMISSION_RECEIVED: "#7f9a86",
  UNDER_CORRECTION: "#cd6a45",
  APPOINTMENT_SCHEDULED: "#4a6350",
  PROCESSING: "#b98a1f",
  VISA_ISSUED: "#2f7d57",
  VISA_REJECTED: "#b3372f",
  WITHDRAWN: "#c9c1ae",
  OTHER: "#d9d2c0",
};

export const ACTIVE_STATUSES = [
  "WAITING_LIST",
  "WAITING_FOR_SUBMISSION",
  "SUBMISSION_RECEIVED",
  "UNDER_CORRECTION",
  "APPOINTMENT_SCHEDULED",
  "PROCESSING",
];

export const APPROVAL_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const APPROVAL_COLORS: Record<string, string> = {
  PENDING_REVIEW: "bg-ochre-50 text-ochre-700 border-ochre-500/40",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-300",
  REJECTED: "bg-red-50 text-red-800 border-red-300",
};

export const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

export const COMMUNITY_LINKS = {
  whatsappCommunity: "https://chat.whatsapp.com/BZ6f2Yodozr3oNWTtqsR40",
  whatsappChannel: "https://whatsapp.com/channel/0029VbD6YAn4yltJDqNw773k",
  gradeCalculator: "https://german-grade-calculator-six.vercel.app/",
};

// Journey stages used to build the public timeline view, in order.
export const JOURNEY_STAGES: { key: string; label: string }[] = [
  { key: "waitingListDate", label: "Waiting List" },
  { key: "submissionInviteDate", label: "Submission Invitation" },
  { key: "documentSubmissionDate", label: "Documents Submitted" },
  { key: "correctionRequestDate", label: "Correction Requested" },
  { key: "correctionSubmittedDate", label: "Correction Submitted" },
  { key: "appointmentDate", label: "Appointment" },
  { key: "interviewDate", label: "Interview" },
  { key: "decisionDate", label: "Decision" },
];
