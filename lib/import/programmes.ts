import { prisma } from "@/lib/db";
import { parseCSV } from "@/lib/csv";
import { normalizeUrl, parseDay, toInt, truthy } from "./util";
import { daadIdFromUrl } from "@/lib/programmes";
import { registerHandler, type Handler } from "./runner";

/**
 * Programme import from a CSV or XLSX file (the fallback when a source offers no API).
 * Columns: see PROGRAMME_TEMPLATE_HEADER (header names are case-insensitive). winter_deadline / summer_deadline are the deadlines for
 * international (non-EU) applicants; eu_* are for EU applicants. Empty cells stay empty and are shown as "Not specified".
 * A deadline counts as VERIFIED only when `verified` is yes AND `source_url` is given; otherwise it is saved as UNVERIFIED.
 * `daad_url` is stored as a reference link only (DAAD content is not copied).
 */
export type ProgrammeRow = Record<string, string>;

export const PROGRAMME_TEMPLATE_HEADER = "university,hrk_number,programme,degree,field,language,intakes,duration_semesters,winter_deadline,summer_deadline,eu_winter_deadline,eu_summer_deadline,application_route,application_url,programme_url,ielts_overall,ielts_min_section,language_certificates,ects_required,min_gpa,requires_gre,work_experience,requirements,remarks,admission_restricted,tuition_free,tuition_fee_eur,semester_contribution_eur,tuition,daad_url,source_url,verified";

export async function parseProgrammeFile(name: string, buf: Buffer): Promise<ProgrammeRow[]> {
  if (/\.xlsx$/i.test(name)) {
    const { readSheet } = await import("read-excel-file/node");
    const sheet = await readSheet(buf);
    const [head, ...rows] = sheet.map((r: unknown[]) => r.map((c: unknown) => (c == null ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c).trim())));

    if (!head) return [];
    const keys = head.map((h) => h.toLowerCase());
    return rows.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ""])));
  }
  if (/\.csv$/i.test(name)) {
    return parseCSV(buf.toString("utf8").replace(/^﻿/, "")).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v])));
  }
  throw new Error("Upload a .csv or .xlsx file.");
}

const DEGREES: Record<string, "BACHELOR" | "MASTER" | "PHD"> = { bachelor: "BACHELOR", bsc: "BACHELOR", ba: "BACHELOR", master: "MASTER", msc: "MASTER", ma: "MASTER", phd: "PHD", doctorate: "PHD", promotion: "PHD" };

function intakesOf(v: string): ("SUMMER" | "WINTER")[] {
  const s = v.toLowerCase();
  const out: ("SUMMER" | "WINTER")[] = [];
  if (/winter/.test(s)) out.push("WINTER");
  if (/summer|sommer/.test(s)) out.push("SUMMER");
  return out;
}

const handler: Handler = {
  async step(job, index, log) {
    const row = (job.payload as { rows: ProgrammeRow[] }).rows[index];
    const label = `row ${index + 2}`;

    const hrk = toInt(row.hrk_number);
    const uni = hrk
      ? await prisma.university.findUnique({ where: { hrkNumber: hrk } })
      : row.university
        ? await prisma.university.findFirst({ where: { name: { equals: row.university.trim(), mode: "insensitive" } } })
        : null;
    if (!uni) throw new Error(`${label}: university "${row.university || row.hrk_number}" not found`);

    const name = (row.programme ?? "").trim();
    const degree = DEGREES[(row.degree ?? "").trim().toLowerCase()];
    const intakes = intakesOf(row.intakes ?? "");
    if (!name) throw new Error(`${label}: programme name missing`);
    if (!degree) throw new Error(`${label}: degree must be Bachelor, Master or PhD`);
    if (!intakes.length) throw new Error(`${label}: intakes must include Winter and/or Summer`);

    const winter = row.winter_deadline ? parseDay(row.winter_deadline) : null;
    const summer = row.summer_deadline ? parseDay(row.summer_deadline) : null;
    if (row.winter_deadline && !winter) throw new Error(`${label}: unreadable winter_deadline "${row.winter_deadline}"`);
    if (row.summer_deadline && !summer) throw new Error(`${label}: unreadable summer_deadline "${row.summer_deadline}"`);

    const sourceUrl = normalizeUrl(row.source_url);
    const verified = truthy(row.verified) && !!sourceUrl && !!(winter || summer);
    const incoming = {
      language: row.language || null, intakes,
      websiteUrl: normalizeUrl(row.programme_url), applicationUrl: normalizeUrl(row.application_url),
      applicationMethod: row.application_method || null, tuitionNote: row.tuition || null, sourceUrl,
    };

    const dateOf = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null);
    // Admission details: only cells that actually contain something are stored.
    const num = (v: string | undefined) => { const n = parseFloat((v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };
    const yn = (v: string | undefined) => ((v ?? "").trim() ? truthy(v) : null);
    const routeOf = (v: string | undefined) => { const t = (v ?? "").toLowerCase().replace(/[^a-z]/g, ""); return t === "direct" || t === "directtouniversity" ? "DIRECT" : t === "uniassist" ? "UNI_ASSIST" : t === "vpd" || t === "uniassistvpd" ? "VPD" : t ? "OTHER" : null; };
    const daadUrl = /^https:\/\/(www2?\.)?daad\.de\//.test(row.daad_url ?? "") ? row.daad_url.trim() : null;
    const candidate: Record<string, unknown> = {
      field: row.field || null, durationSemesters: toInt(row.duration_semesters), euWinterDeadline: row.eu_winter_deadline ? dateOf(parseDay(row.eu_winter_deadline)) : null,
      euSummerDeadline: row.eu_summer_deadline ? dateOf(parseDay(row.eu_summer_deadline)) : null, applicationRoute: routeOf(row.application_route),
      ieltsOverall: num(row.ielts_overall), ieltsMinSection: num(row.ielts_min_section), languageCertificates: row.language_certificates || null,
      ectsRequired: toInt(row.ects_required), minGpaNote: row.min_gpa || null, requiresGre: yn(row.requires_gre), workExperienceNote: row.work_experience || null,
      requirements: row.requirements || null, remarks: row.remarks || null, admissionRestricted: yn(row.admission_restricted), tuitionFree: yn(row.tuition_free),
      tuitionFeeEur: toInt(row.tuition_fee_eur), semesterContributionEur: toInt(row.semester_contribution_eur), daadUrl, daadId: daadIdFromUrl(daadUrl),
    };
    const extra = Object.fromEntries(Object.entries(candidate).filter(([, v]) => v !== null && v !== undefined));
    if (row.ielts_overall && extra.ieltsOverall === undefined) throw new Error(`${label}: unreadable ielts_overall "${row.ielts_overall}"`);

    const existing = await prisma.programme.findUnique({ where: { universityId_name_degreeLevel: { universityId: uni.id, name, degreeLevel: degree } } });

    if (!existing) {
      await prisma.programme.create({
        data: {
          universityId: uni.id, name, degreeLevel: degree, language: incoming.language, intakes, website: incoming.websiteUrl,
          applicationUrl: incoming.applicationUrl, applicationMethod: incoming.applicationMethod, tuitionNote: incoming.tuitionNote, sourceUrl,
          winterDeadline: dateOf(winter), summerDeadline: dateOf(summer),
          verification: verified ? "VERIFIED" : "UNVERIFIED", deadlinesVerifiedAt: verified ? new Date() : null, lastCheckedAt: new Date(),
          ...(extra as object),
        },
      });
      return "created";
    }

    // Verified deadlines are never silently replaced: a different incoming value is queued for an admin to accept.
    const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
    const conflict = existing.verification === "VERIFIED" && ((winter && winter !== iso(existing.winterDeadline)) || (summer && summer !== iso(existing.summerDeadline)));
    if (conflict) {
      await prisma.programme.update({ where: { id: existing.id }, data: { pendingChange: { winterDeadline: winter, summerDeadline: summer, sourceUrl, verified, importedAt: new Date().toISOString() } } });
      log(`CONFLICT: ${uni.name} / ${name}: imported deadline differs from the verified one, queued for review`);
      return "skipped";
    }

    const locked = new Set(existing.lockedFields);
    const data: Record<string, unknown> = {};
    const set = (field: string, value: unknown, current: unknown) => { if (!locked.has(field) && value !== null && value !== undefined && JSON.stringify(value) !== JSON.stringify(current)) data[field] = value; };
    set("language", incoming.language, existing.language);
    set("intakes", intakes, existing.intakes);
    set("website", incoming.websiteUrl, existing.website);
    set("applicationUrl", incoming.applicationUrl, existing.applicationUrl);
    set("applicationMethod", incoming.applicationMethod, existing.applicationMethod);
    set("tuitionNote", incoming.tuitionNote, existing.tuitionNote);
    set("sourceUrl", sourceUrl, existing.sourceUrl);
    for (const [k, v] of Object.entries(extra)) set(k, v, (existing as any)[k]);
    if (winter && winter !== iso(existing.winterDeadline)) set("winterDeadline", dateOf(winter), existing.winterDeadline);
    if (summer && summer !== iso(existing.summerDeadline)) set("summerDeadline", dateOf(summer), existing.summerDeadline);
    if (verified && existing.verification !== "VERIFIED") { data.verification = "VERIFIED"; data.deadlinesVerifiedAt = new Date(); }
    if (!Object.keys(data).length) return "skipped";
    await prisma.programme.update({ where: { id: existing.id }, data });
    return "updated";
  },
};

registerHandler("programmes", handler);
