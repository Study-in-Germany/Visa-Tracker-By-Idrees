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

// One palette, used by chips, badges, row accents, cards and charts.
// slate · sky · blue · amber · teal · violet · green · red · grey
export const VISA_STATUS_COLORS: Record<string, string> = {
  WAITING_LIST: "bg-slate-100 text-slate-700 border-slate-300",
  WAITING_FOR_SUBMISSION: "bg-sky-50 text-sky-800 border-sky-300",
  SUBMISSION_RECEIVED: "bg-blue-50 text-blue-800 border-blue-300",
  UNDER_CORRECTION: "bg-amber-50 text-amber-800 border-amber-300",
  APPOINTMENT_SCHEDULED: "bg-teal-50 text-teal-800 border-teal-300",
  PROCESSING: "bg-violet-50 text-violet-800 border-violet-300",
  VISA_ISSUED: "bg-green-50 text-green-800 border-green-300",
  VISA_REJECTED: "bg-red-50 text-red-800 border-red-300",
  WITHDRAWN: "bg-gray-100 text-gray-600 border-gray-300",
  OTHER: "bg-gray-100 text-gray-600 border-gray-300",
};

// Hex values for charts and row accents, kept in step with VISA_STATUS_COLORS.
export const VISA_STATUS_HEX: Record<string, string> = {
  WAITING_LIST: "#64748b",
  WAITING_FOR_SUBMISSION: "#0ea5e9",
  SUBMISSION_RECEIVED: "#3b82f6",
  UNDER_CORRECTION: "#d97706",
  APPOINTMENT_SCHEDULED: "#0d9488",
  PROCESSING: "#7c3aed",
  VISA_ISSUED: "#16a34a",
  VISA_REJECTED: "#dc2626",
  WITHDRAWN: "#94a3b8",
  OTHER: "#cbd5e1",
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
