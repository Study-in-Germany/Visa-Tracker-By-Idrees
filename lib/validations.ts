import { z } from "zod";
import { CONSULATES, VISA_STATUS_ORDER } from "@/lib/constants";

const optionalStr = z.string().max(500).optional().or(z.literal(""));
const optionalDate = z.string().optional().or(z.literal(""));

export const submitApplicantSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  city: optionalStr,
  province: optionalStr,
  university: optionalStr,
  program: optionalStr,
  intake: optionalStr,
  visaType: optionalStr,
  consulate: z.enum(CONSULATES as [string, ...string[]]),
  waitingListCategory: optionalStr,
  sourceOfInformation: optionalStr,
  additionalDocuments: optionalStr,
  waitingListDate: optionalDate,
  submissionInviteDate: optionalDate,
  documentSubmissionDate: optionalDate,
  isAnonymous: z.boolean().optional(),
});

export type SubmitApplicantInput = z.infer<typeof submitApplicantSchema>;

export const updateApplicantSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional().nullable(),
  city: optionalStr.nullable(),
  province: optionalStr.nullable(),
  university: optionalStr.nullable(),
  program: optionalStr.nullable(),
  intake: optionalStr.nullable(),
  visaType: optionalStr.nullable(),
  consulate: z.enum(CONSULATES as [string, ...string[]]).optional(),
  waitingListCategory: optionalStr.nullable(),
  sourceOfInformation: optionalStr.nullable(),
  additionalDocuments: optionalStr.nullable(),
  notes: optionalStr.nullable(),
  isAnonymous: z.boolean().optional(),

  waitingListDate: optionalDate.nullable(),
  submissionInviteDate: optionalDate.nullable(),
  documentSubmissionDate: optionalDate.nullable(),
  correctionRequestDate: optionalDate.nullable(),
  correctionSubmittedDate: optionalDate.nullable(),
  appointmentDate: optionalDate.nullable(),
  interviewDate: optionalDate.nullable(),
  decisionDate: optionalDate.nullable(),

  visaStatus: z.enum(VISA_STATUS_ORDER as [string, ...string[]]).optional(),
  approval: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED"]).optional(),
  statusNote: z.string().max(500).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const applicantLoginSchema = z.object({
  publicId: z.string().min(1),
  accessCode: z.string().min(1),
});

export const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  consulate: z.string().optional().or(z.literal("")),
  pinned: z.boolean().optional(),
});
