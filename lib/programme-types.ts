// Shapes and labels for the Programmes explorer. Safe to import from client and server code.

export const ROUTE_LABELS: Record<string, string> = { DIRECT: "Direct to university", UNI_ASSIST: "uni-assist", VPD: "uni-assist VPD", OTHER: "Other portal" };
export const ROUTE_OPTIONS = Object.entries(ROUTE_LABELS).map(([value, label]) => ({ value, label }));

export type UniversityRef = {
  id: string; slug: string; name: string; shortName: string | null; city: string; state: string | null;
  website: string; logoUrl: string | null; institutionType: string | null;
};

export type ProgrammeRow = {
  id: string;
  name: string;
  degreeLevel: string;
  language: string | null;
  intakes: string[];
  field: string | null;
  /** Non-EU / international deadlines. */
  summerDeadline: string | null;
  winterDeadline: string | null;
  applicationRoute: string | null;
  ieltsOverall: number | null;
  tuitionFree: boolean | null;
  tuitionFeeEur: number | null;
  verification: string;
  deadlinesVerifiedAt: string | null;
  lastCheckedAt: string | null;
  updatedAt: string;
  university: UniversityRef;
};

export type ProgrammeDetail = ProgrammeRow & {
  durationSemesters: number | null;
  euSummerDeadline: string | null;
  euWinterDeadline: string | null;
  ieltsMinSection: number | null;
  languageCertificates: string | null;
  ectsRequired: number | null;
  minGpaNote: string | null;
  requiresGre: boolean | null;
  workExperienceNote: string | null;
  requirements: string | null;
  remarks: string | null;
  admissionRestricted: boolean | null;
  semesterContributionEur: number | null;
  tuitionNote: string | null;
  applicationUrl: string | null;
  applicationMethod: string | null;
  website: string | null;
  sourceUrl: string | null;
  daadId: number | null;
  daadUrl: string | null;
  linkStatus: number | null;
  published: boolean;
};

export type ProgrammeFacets = {
  fields: string[];
  cities: string[];
  universities: { id: string; name: string }[];
};

export type ProgrammeList = { items: ProgrammeRow[]; count: number; page: number; pageCount: number; facets: ProgrammeFacets };

/** Shown wherever a value is missing. Nothing is ever guessed. */
export const NOT_SPECIFIED = "Not specified";
export const VERIFICATION_REQUIRED = "Verification required";
