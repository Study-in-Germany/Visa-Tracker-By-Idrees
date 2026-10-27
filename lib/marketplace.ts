// Labels, colours and shared shapes for the university directory and the accommodation marketplace.
// Safe to import from client and server code.

export const DEGREE_LABELS: Record<string, string> = { BACHELOR: "Bachelor", MASTER: "Master", PHD: "PhD" };
export const INTAKE_LABELS: Record<string, string> = { WINTER: "Winter", SUMMER: "Summer" };

export const LISTING_TYPE_LABELS: Record<string, string> = {
  ROOM: "Private room",
  SHARED_ROOM: "Shared room",
  STUDIO: "Studio",
  APARTMENT: "Apartment",
};

export const LISTING_KIND_LABELS: Record<string, string> = { OFFERING: "Rooms available", SEEKING: "Looking for a room" };
export const GENDER_PREFERENCE_LABELS: Record<string, string> = { ANY: "No preference", FEMALE: "Female only", MALE: "Male only" };
export const GENDER_PREFERENCE_OPTIONS = Object.entries(GENDER_PREFERENCE_LABELS).map(([value, label]) => ({ value, label }));

export const LISTING_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Under review",
  APPROVED: "Live",
  REJECTED: "Rejected",
  RENTED: "Rented",
};

export const LISTING_STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: "bg-ochre-50 text-ochre-700 border-ochre-500/40",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-300",
  REJECTED: "bg-red-50 text-red-800 border-red-300",
  RENTED: "bg-paper-sunk text-ink-700 border-line-strong",
};

export const REPORT_REASON_LABELS: Record<string, string> = {
  SCAM: "Looks like a scam",
  INACCURATE: "Wrong price, place or photos",
  UNAVAILABLE: "No longer available",
  INAPPROPRIATE: "Inappropriate content",
  OTHER: "Something else",
};

export const REPORT_STATUS_LABELS: Record<string, string> = { OPEN: "Open", RESOLVED: "Resolved", DISMISSED: "Dismissed" };

type Opt = { value: string; label: string };
const fromMap = (m: Record<string, string>): Opt[] => Object.entries(m).map(([value, label]) => ({ value, label }));

export const DEGREE_OPTIONS = fromMap(DEGREE_LABELS);
export const INTAKE_OPTIONS = fromMap(INTAKE_LABELS);
export const LISTING_TYPE_OPTIONS = fromMap(LISTING_TYPE_LABELS);
export const REPORT_REASON_OPTIONS = fromMap(REPORT_REASON_LABELS);

/** Distinct reporters needed before a live listing is sent back to review automatically. */
export const REPORT_AUTO_REVIEW_THRESHOLD = 3;

export const eur = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

// ── Client-safe shapes returned by the API ──

export type ListingImageDto = { id: string; thumbUrl: string; cardUrl: string; fullUrl: string; width: number; height: number };

export type ListingCardDto = {
  id: string;
  title: string;
  type: string;
  city: string;
  district: string | null;
  /** Rent for an offer; maximum budget for a seeking post. Null when not stated. */
  rentEur: number | null;
  kind: string;
  /** Short plain-text preview of the description (used on request cards). */
  excerpt: string | null;
  anmeldung: boolean;
  billsIncluded: boolean;
  furnished: boolean;
  availableFrom: string;
  status: string;
  createdAt: string;
  cover: ListingImageDto | null;
  imageCount: number;
  openReports?: number;
};

export type ListingDetailDto = Omit<ListingCardDto, "cover"> & {
  description: string;
  depositEur: number | null;
  sizeSqm: number | null;
  minStayMonths: number | null;
  genderPreference: string;
  rejectionReason: string | null;
  images: ListingImageDto[];
  /** Anonymous trust signals about whoever posted it. */
  poster: { verified: boolean; memberSince: string; listingCount: number };
  /** Only present for the owner and admins. */
  contact?: { contactName: string; contactPhone: string | null; contactEmail: string | null };
  isOwner: boolean;
  canManage: boolean;
};

export type ProgrammeDto = {
  id: string;
  name: string;
  degreeLevel: string;
  language: string | null;
  intakes: string[];
  summerDeadline: string | null;
  winterDeadline: string | null;
  website: string | null;
  deadlinesVerifiedAt: string | null;
  verification: string;
  applicationUrl: string | null;
  applicationMethod: string | null;
  tuitionNote: string | null;
  sourceUrl: string | null;
  published?: boolean;
};

export type UniversityDto = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string | null;
  website: string;
  description: string | null;
  published: boolean;
  shortName: string | null;
  institutionType: string | null;
  studentCount: number | null;
  foundedYear: number | null;
  logoUrl: string | null;
  lastVerifiedAt: string | null;
  websiteStatus: number | null;
  sponsorship: string | null;
  doctorateRight: boolean | null;
  source: string | null;
  /** Programmes matching the active filters. */
  programmes: ProgrammeDto[];
  /** All published programmes of this university, regardless of filters. */
  programmeCount: number;
};

export type Paged<T> = { items: T[]; count: number; page: number; pageCount: number };

/** Friendly names for the HRK institution types. */
export const INSTITUTION_TYPE_LABELS: Record<string, string> = {
  "Universitäten": "Universities",
  "Fachhochschulen / HAW": "Applied sciences (HAW)",
  "Künstlerische Hochschulen": "Art & music",
  "Verwaltungshochschule": "Public administration",
  "Hochschulen eigenen Typs": "Other",
};
export const institutionLabel = (t: string | null | undefined) => (t ? INSTITUTION_TYPE_LABELS[t] ?? t : "");

/** Soft tinted chip per institution type (chips only; cards stay neutral). Palette shared with the visa-status badges. */
export const INSTITUTION_CHIP: Record<string, string> = {
  "Universitäten": "bg-blue-50 text-blue-800 border-blue-300",
  "Fachhochschulen / HAW": "bg-teal-50 text-teal-800 border-teal-300",
  "Künstlerische Hochschulen": "bg-violet-50 text-violet-800 border-violet-300",
  "Verwaltungshochschule": "bg-amber-50 text-amber-800 border-amber-300",
  "Hochschulen eigenen Typs": "bg-slate-100 text-slate-700 border-slate-300",
};
export const institutionChip = (t: string | null | undefined) => (t && INSTITUTION_CHIP[t]) || "bg-slate-100 text-slate-700 border-slate-300";
