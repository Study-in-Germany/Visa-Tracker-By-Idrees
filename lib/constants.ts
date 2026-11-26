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

// Semantic status palette: subtle backgrounds and crisp contrast without visual noise.
export const VISA_STATUS_COLORS: Record<string, string> = {
  WAITING_LIST: "bg-zinc-100 text-zinc-700 border-zinc-200",
  WAITING_FOR_SUBMISSION: "bg-blue-50 text-blue-700 border-blue-200",
  SUBMISSION_RECEIVED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  UNDER_CORRECTION: "bg-amber-50 text-amber-800 border-amber-200",
  APPOINTMENT_SCHEDULED: "bg-teal-50 text-teal-800 border-teal-200",
  PROCESSING: "bg-purple-50 text-purple-700 border-purple-200",
  VISA_ISSUED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  VISA_REJECTED: "bg-red-50 text-red-800 border-red-200",
  WITHDRAWN: "bg-zinc-50 text-zinc-500 border-zinc-200",
  OTHER: "bg-zinc-50 text-zinc-500 border-zinc-200",
};

// Hex values for charts and dots, aligned with VISA_STATUS_COLORS.
export const VISA_STATUS_HEX: Record<string, string> = {
  WAITING_LIST: "#6B7280",
  WAITING_FOR_SUBMISSION: "#2563EB",
  SUBMISSION_RECEIVED: "#4F46E5",
  UNDER_CORRECTION: "#D97706",
  APPOINTMENT_SCHEDULED: "#0D9488",
  PROCESSING: "#7C3AED",
  VISA_ISSUED: "#16A34A",
  VISA_REJECTED: "#DC2626",
  WITHDRAWN: "#9CA3AF",
  OTHER: "#9CA3AF",
};

/** Compact labels for chips and narrow layouts. */
export const VISA_STATUS_SHORT: Record<string, string> = {
  WAITING_LIST: "Waiting",
  WAITING_FOR_SUBMISSION: "Invited",
  SUBMISSION_RECEIVED: "Submitted",
  UNDER_CORRECTION: "Correction",
  APPOINTMENT_SCHEDULED: "Appointment",
  PROCESSING: "Processing",
  VISA_ISSUED: "Issued",
  VISA_REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  OTHER: "Other",
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
  PENDING_REVIEW: "bg-amber-50 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  REJECTED: "bg-red-50 text-red-800 border-red-200",
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
