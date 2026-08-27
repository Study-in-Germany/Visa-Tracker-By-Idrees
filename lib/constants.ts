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
  WAITING_LIST: "bg-gray-100 text-gray-800 border-gray-200",
  WAITING_FOR_SUBMISSION: "bg-blue-100 text-blue-800 border-blue-200",
  SUBMISSION_RECEIVED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  UNDER_CORRECTION: "bg-amber-100 text-amber-800 border-amber-200",
  APPOINTMENT_SCHEDULED: "bg-violet-100 text-violet-800 border-violet-200",
  PROCESSING: "bg-cyan-100 text-cyan-800 border-cyan-200",
  VISA_ISSUED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  VISA_REJECTED: "bg-red-100 text-red-800 border-red-200",
  WITHDRAWN: "bg-gray-100 text-gray-500 border-gray-200",
  OTHER: "bg-gray-100 text-gray-600 border-gray-200",
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
