import type { Prisma, Programme, University } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseCalendarDay } from "@/lib/period";
import type { ProgrammeDto, UniversityDto } from "@/lib/marketplace";

export function slugify(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "university";
}

/** A slug that is free in the database; appends -2, -3, … on collision. */
export async function uniqueSlug(name: string, ignoreId?: string) {
  const base = slugify(name);
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const hit = await prisma.university.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === ignoreId) return slug;
  }
  return `${base}-${Date.now()}`;
}

export const utcToday = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function toProgrammeDto(p: Programme): ProgrammeDto {
  return {
    id: p.id, name: p.name, degreeLevel: p.degreeLevel, language: p.language, intakes: p.intakes,
    summerDeadline: iso(p.summerDeadline), winterDeadline: iso(p.winterDeadline),
    website: p.website, deadlinesVerifiedAt: iso(p.deadlinesVerifiedAt), published: p.published,
    verification: p.verification, applicationUrl: p.applicationUrl, applicationMethod: p.applicationMethod,
    tuitionNote: p.tuitionNote, sourceUrl: p.sourceUrl,
  };
}

export function toUniversityDto(u: University & { programmes: Programme[]; _count?: { programmes: number } }): UniversityDto {
  return {
    id: u.id, slug: u.slug, name: u.name, city: u.city, state: u.state, website: u.website,
    description: u.description, published: u.published, programmes: u.programmes.map(toProgrammeDto),
    programmeCount: u._count?.programmes ?? u.programmes.length,
    shortName: u.shortName, institutionType: u.institutionType, studentCount: u.studentCount, foundedYear: u.foundedYear,
    logoUrl: u.logoUrl, lastVerifiedAt: iso(u.lastVerifiedAt), websiteStatus: u.websiteStatus,
    sponsorship: u.sponsorship, doctorateRight: u.doctorateRight, source: u.source,
  };
}

/** Parses the optional date fields of a programme payload ("" and null both mean "no deadline"). */
export const dayOrNull = (v: string | null | undefined) => (v ? parseCalendarDay(v) : null);

export type ProgrammeFilters = { degrees: string[]; intake?: string; deadlineDays?: number | "upcoming"; language?: string };

export function programmeWhere(f: ProgrammeFilters, includeUnpublished: boolean): Prisma.ProgrammeWhereInput {
  const where: Prisma.ProgrammeWhereInput = {};
  if (!includeUnpublished) { where.published = true; where.verification = { not: "NEEDS_REVIEW" }; }
  if (f.language) where.language = { contains: f.language, mode: "insensitive" };
  if (f.degrees.length) where.degreeLevel = { in: f.degrees as any };
  if (f.intake) where.intakes = { has: f.intake as any };
  if (f.deadlineDays !== undefined) {
    const today = utcToday();
    const range = { gte: today, ...(typeof f.deadlineDays === "number" ? { lte: new Date(today.getTime() + f.deadlineDays * 86_400_000) } : {}) };
    // With an intake chosen, only that intake's deadline counts; otherwise either one may match.
    const fields = f.intake === "SUMMER" ? ["summerDeadline"] : f.intake === "WINTER" ? ["winterDeadline"] : ["summerDeadline", "winterDeadline"];
    where.OR = fields.map((field) => ({ [field]: range }));
  }
  return where;
}
