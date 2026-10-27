import { z } from "zod";
import { CONSULATES, VISA_STATUS_ORDER } from "@/lib/constants";
import { parseCalendarDay } from "@/lib/period";

const optionalStr = z.string().max(500).optional().or(z.literal(""));
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .refine((v) => parseCalendarDay(v) !== null, "Enter a real date between 2000 and 2100")
  .optional()
  .or(z.literal(""));

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
  correctionRequestDate: optionalDate,
  appointmentDate: optionalDate,
  interviewDate: optionalDate,
  decisionDate: optionalDate,
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

// ───────────── University directory ─────────────

const httpUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a full web address starting with https://");

export const universitySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(160),
  city: z.string().trim().min(2, "City is required").max(80),
  state: optionalStr.nullable(),
  website: httpUrl,
  description: z.string().max(1000).optional().nullable().or(z.literal("")),
  published: z.boolean().optional(),
});

const requiredDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .refine((v) => parseCalendarDay(v) !== null, "Enter a real date between 2000 and 2100");

export const programmeSchema = z.object({
  name: z.string().trim().min(2, "Programme name is required").max(160),
  degreeLevel: z.enum(["BACHELOR", "MASTER", "PHD"]),
  language: optionalStr.nullable(),
  intakes: z.array(z.enum(["SUMMER", "WINTER"])).min(1, "Choose at least one intake").max(2),
  summerDeadline: requiredDate.optional().nullable().or(z.literal("")),
  winterDeadline: requiredDate.optional().nullable().or(z.literal("")),
  website: httpUrl.optional().nullable().or(z.literal("")),
  published: z.boolean().optional(),
  /** Set true when the admin has just confirmed the deadlines on the official page. */
  markVerified: z.boolean().optional(),

  // Admission details (all optional: anything not known stays empty and is shown as "Not specified")
  field: optionalStr.nullable(),
  durationSemesters: z.number().int().min(1).max(20).optional().nullable(),
  euSummerDeadline: requiredDate.optional().nullable().or(z.literal("")),
  euWinterDeadline: requiredDate.optional().nullable().or(z.literal("")),
  applicationRoute: z.enum(["DIRECT", "UNI_ASSIST", "VPD", "OTHER"]).optional().nullable().or(z.literal("")),
  applicationUrl: httpUrl.optional().nullable().or(z.literal("")),
  sourceUrl: httpUrl.optional().nullable().or(z.literal("")),
  ieltsOverall: z.number().min(4).max(9).optional().nullable(),
  ieltsMinSection: z.number().min(4).max(9).optional().nullable(),
  languageCertificates: z.string().trim().max(300).optional().nullable().or(z.literal("")),
  ectsRequired: z.number().int().min(0).max(300).optional().nullable(),
  minGpaNote: z.string().trim().max(200).optional().nullable().or(z.literal("")),
  requiresGre: z.boolean().optional().nullable(),
  workExperienceNote: z.string().trim().max(200).optional().nullable().or(z.literal("")),
  requirements: z.string().trim().max(3000).optional().nullable().or(z.literal("")),
  remarks: z.string().trim().max(2000).optional().nullable().or(z.literal("")),
  admissionRestricted: z.boolean().optional().nullable(),
  tuitionFree: z.boolean().optional().nullable(),
  tuitionFeeEur: z.number().int().min(0).max(50000).optional().nullable(),
  semesterContributionEur: z.number().int().min(0).max(2000).optional().nullable(),
  tuitionNote: z.string().trim().max(300).optional().nullable().or(z.literal("")),
  /** Link to the same programme in the DAAD database (reference only). */
  daadUrl: z.string().trim().max(300).refine((v) => /^https:\/\/(www2?\.)?daad\.de\//.test(v), "Use a daad.de address").optional().nullable().or(z.literal("")),
});

// ───────────── Accommodation marketplace ─────────────

const phone = z.string().trim().regex(/^\+?[0-9 ()\-]{6,20}$/, "Enter a valid phone number");

const listingFields = z.object({
  title: z.string().trim().min(5, "Add a short title").max(100),
  description: z.string().trim().min(20, "Describe the place in at least 20 characters").max(2000),
  type: z.enum(["ROOM", "SHARED_ROOM", "STUDIO", "APARTMENT"]),
  city: z.string().trim().min(2, "City is required").max(60),
  district: z.string().trim().max(60).optional().nullable().or(z.literal("")),
  /** OFFERING: a place for rent. SEEKING: someone looking for a place. */
  kind: z.enum(["OFFERING", "SEEKING"]).optional(),
  /** Monthly rent for an offer, or the maximum budget for a seeking post. */
  rentEur: z.number().int("Whole euros only").min(50, "Amount looks too low").max(10000, "Amount looks too high").nullable().optional(),
  anmeldung: z.boolean().optional(),
  minStayMonths: z.number().int().min(1).max(60).nullable().optional(),
  sizeSqm: z.number().int().min(5, "Size looks too small").max(500, "Size looks too large").nullable().optional(),
  genderPreference: z.enum(["ANY", "FEMALE", "MALE"]).optional(),
  depositEur: z.number().int().min(0).max(20000).optional().nullable(),
  billsIncluded: z.boolean(),
  furnished: z.boolean(),
  availableFrom: requiredDate,
  contactName: z.string().trim().min(2, "Contact name is required").max(80),
  contactPhone: phone.optional().nullable().or(z.literal("")),
  contactEmail: z.string().trim().email("Enter a valid email").max(120).optional().nullable().or(z.literal("")),
  imageIds: z.array(z.string().min(1).max(40)).max(8, "At most 8 photos"),
});

const isSeeking = (v: { kind?: string }) => v.kind === "SEEKING";

const needsContact = (v: { contactPhone?: string | null; contactEmail?: string | null }) => !!(v.contactPhone || v.contactEmail);

export const listingSchema = listingFields
  .refine((v) => isSeeking(v) || v.imageIds.length >= 1, { message: "Add at least one photo", path: ["imageIds"] })
  .refine((v) => isSeeking(v) || (v.rentEur ?? 0) >= 50, { message: "Enter the monthly rent", path: ["rentEur"] })
  .refine(needsContact, { message: "Add a phone number or an email", path: ["contactPhone"] });

export const listingUpdateSchema = listingFields.partial();

export const listingActionSchema = z.object({ action: z.enum(["markRented", "reopen"]) });

export const listingModerationSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED", "PENDING_REVIEW"]),
    rejectionReason: z.string().trim().max(500).optional().nullable().or(z.literal("")),
  })
  .refine((v) => v.status !== "REJECTED" || !!v.rejectionReason, { message: "Tell the owner why it was rejected", path: ["rejectionReason"] });

export const reportSchema = z.object({
  reason: z.enum(["SCAM", "INACCURATE", "UNAVAILABLE", "INAPPROPRIATE", "OTHER"]),
  details: z.string().trim().max(500).optional().or(z.literal("")),
});

export const reportUpdateSchema = z.object({ status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]) });

export const milestoneSchema = z.object({
  milestone: z.enum(["waitingListDate", "submissionInviteDate", "documentSubmissionDate", "correctionRequestDate", "correctionSubmittedDate", "appointmentDate", "interviewDate", "decisionDate"]),
  date: requiredDate.nullable(),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});
