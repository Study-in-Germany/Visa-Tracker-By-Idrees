import type { Prisma, Programme, University } from "@prisma/client";
import { utcToday } from "@/lib/universities";
import type { ProgrammeDetail, ProgrammeRow, UniversityRef } from "@/lib/programme-types";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export const programmeInclude = {
  university: { select: { id: true, slug: true, name: true, shortName: true, city: true, state: true, website: true, logoUrl: true, institutionType: true } },
} satisfies Prisma.ProgrammeInclude;

type Full = Programme & { university: UniversityRef };

export function toRow(p: Full): ProgrammeRow {
  return {
    id: p.id, name: p.name, degreeLevel: p.degreeLevel, language: p.language, intakes: p.intakes, field: p.field,
    summerDeadline: iso(p.summerDeadline), winterDeadline: iso(p.winterDeadline), applicationRoute: p.applicationRoute,
    ieltsOverall: p.ieltsOverall, tuitionFree: p.tuitionFree, tuitionFeeEur: p.tuitionFeeEur, verification: p.verification,
    deadlinesVerifiedAt: iso(p.deadlinesVerifiedAt), lastCheckedAt: iso(p.lastCheckedAt), updatedAt: p.updatedAt.toISOString(),
    university: p.university,
  };
}

export function toProgrammeDetail(p: Full): ProgrammeDetail {
  return {
    ...toRow(p),
    durationSemesters: p.durationSemesters, euSummerDeadline: iso(p.euSummerDeadline), euWinterDeadline: iso(p.euWinterDeadline),
    ieltsMinSection: p.ieltsMinSection, languageCertificates: p.languageCertificates, ectsRequired: p.ectsRequired, minGpaNote: p.minGpaNote,
    requiresGre: p.requiresGre, workExperienceNote: p.workExperienceNote, requirements: p.requirements, remarks: p.remarks,
    admissionRestricted: p.admissionRestricted, semesterContributionEur: p.semesterContributionEur, tuitionNote: p.tuitionNote,
    applicationUrl: p.applicationUrl, applicationMethod: p.applicationMethod, website: p.website, sourceUrl: p.sourceUrl,
    daadId: p.daadId, daadUrl: p.daadUrl, linkStatus: p.linkStatus, published: p.published,
  };
}

const DEADLINE_WINDOWS: Record<string, number | "open"> = { open: "open", "30": 30, "60": 60, "90": 90 };

export type ListQuery = { error?: string; where: Prisma.ProgrammeWhereInput; orderBy: Prisma.ProgrammeOrderByWithRelationInput[] };

/** Translates the explorer's query string into a Prisma query. Public callers only ever see published, non-pending programmes. */
export function buildListQuery(sp: URLSearchParams, admin: boolean): ListQuery {
  const and: Prisma.ProgrammeWhereInput[] = [];
  if (!admin) and.push({ published: true, verification: { not: "NEEDS_REVIEW" }, university: { published: true } });

  const q = sp.get("q")?.trim().slice(0, 80);
  if (q) {
    const ci = { contains: q, mode: "insensitive" as const };
    and.push({ OR: [{ name: ci }, { field: ci }, { university: { name: ci } }, { university: { city: ci } }, { university: { shortName: ci } }] });
  }
  const uni = sp.get("uni");
  if (uni) and.push({ universityId: uni });
  const city = sp.get("city")?.trim();
  if (city) and.push({ university: { city: { equals: city, mode: "insensitive" } } });
  const field = sp.get("field")?.trim();
  if (field) and.push({ field: { equals: field, mode: "insensitive" } });

  const degrees = (sp.get("degree") || "").split(",").filter(Boolean);
  if (degrees.some((d) => !["BACHELOR", "MASTER", "PHD"].includes(d))) return { error: "Invalid degree filter", where: {}, orderBy: [] };
  if (degrees.length) and.push({ degreeLevel: { in: degrees as any } });

  const intake = sp.get("intake");
  if (intake) {
    if (!["SUMMER", "WINTER"].includes(intake)) return { error: "Invalid intake filter", where: {}, orderBy: [] };
    and.push({ intakes: { has: intake as any } });
  }
  const language = sp.get("language")?.trim();
  if (language) and.push({ language: { contains: language, mode: "insensitive" } });

  const ielts = sp.get("ielts");
  if (ielts) {
    const max = Number(ielts);
    if (!(max >= 4 && max <= 9)) return { error: "Invalid IELTS filter", where: {}, orderBy: [] };
    // Programmes that publish a requirement at or below the chosen score. Unknown requirements are not guessed at.
    and.push({ ieltsOverall: { lte: max } });
  }
  if (sp.get("tuitionFree") === "1") and.push({ tuitionFree: true });

  const route = sp.get("route");
  if (route) {
    if (!["DIRECT", "UNI_ASSIST", "VPD", "OTHER"].includes(route)) return { error: "Invalid application route", where: {}, orderBy: [] };
    and.push({ applicationRoute: route as any });
  }

  const deadline = sp.get("deadline");
  if (deadline) {
    if (!(deadline in DEADLINE_WINDOWS)) return { error: "Invalid deadline filter", where: {}, orderBy: [] };
    const win = DEADLINE_WINDOWS[deadline];
    const today = utcToday();
    const range = { gte: today, ...(typeof win === "number" ? { lte: new Date(today.getTime() + win * 86_400_000) } : {}) };
    const fields = intake === "SUMMER" ? ["summerDeadline"] : intake === "WINTER" ? ["winterDeadline"] : ["summerDeadline", "winterDeadline"];
    and.push({ OR: fields.map((f) => ({ [f]: range })) });
  }

  const ids = (sp.get("ids") || "").split(",").filter(Boolean).slice(0, 50);
  if (ids.length) and.push({ id: { in: ids } });

  const dir = sp.get("dir") === "desc" ? "desc" : "asc";
  const nullsLast = (v: "asc" | "desc") => ({ sort: v, nulls: "last" as const });
  const sort = sp.get("sort") || "updated";
  const orderBy: Prisma.ProgrammeOrderByWithRelationInput[] =
    sort === "university" ? [{ university: { name: dir } }, { name: "asc" }]
    : sort === "deadline" ? [{ winterDeadline: nullsLast(dir) }, { summerDeadline: nullsLast(dir) }, { name: "asc" }]
    : sort === "ielts" ? [{ ieltsOverall: nullsLast(dir) }, { name: "asc" }]
    : sort === "name" ? [{ name: dir }]
    : [{ updatedAt: dir === "asc" && sp.get("dir") ? "asc" : "desc" }];
  return { where: { AND: and }, orderBy };
}

export type { University };

type Input = Record<string, any>;
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const day = (v: unknown) => (typeof v === "string" && v ? new Date(`${v}T00:00:00Z`) : null);

/** DAAD detail pages look like .../detail/9965/; the id is kept so the record can be matched later. */
export const daadIdFromUrl = (url: string | null) => {
  const m = url ? /\/detail\/(\d+)/.exec(url) : null;
  return m ? Number(m[1]) : null;
};

/** Maps the admission-detail fields of a validated payload to database columns (only the keys that were sent). */
export function extraProgrammeData(d: Input): Prisma.ProgrammeUncheckedUpdateInput {
  const out: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => { if (d[key] !== undefined) out[key] = value; };
  for (const k of ["field", "languageCertificates", "minGpaNote", "workExperienceNote", "requirements", "remarks", "tuitionNote", "applicationUrl", "sourceUrl"]) set(k, text(d[k]));
  for (const k of ["durationSemesters", "ieltsOverall", "ieltsMinSection", "ectsRequired", "requiresGre", "admissionRestricted", "tuitionFree", "tuitionFeeEur", "semesterContributionEur"]) set(k, d[k] ?? null);
  set("euSummerDeadline", day(d.euSummerDeadline));
  set("euWinterDeadline", day(d.euWinterDeadline));
  set("applicationRoute", d.applicationRoute || null);
  if (d.daadUrl !== undefined) { out.daadUrl = text(d.daadUrl); out.daadId = daadIdFromUrl(text(d.daadUrl)); }
  return out as Prisma.ProgrammeUncheckedUpdateInput;
}

/** Field names whose value differs from the stored record, so hand edits can be protected from later imports. */
export function changedKeys(existing: Record<string, any>, data: Record<string, unknown>) {
  const norm = (v: unknown) => (v instanceof Date ? v.getTime() : v ?? null);
  return Object.keys(data).filter((k) => norm(data[k]) !== norm(existing[k]));
}
