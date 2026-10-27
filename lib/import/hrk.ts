import { prisma } from "@/lib/db";
import { uniqueSlug } from "@/lib/universities";
import { hostOf, normalizeUrl, normName, toInt } from "./util";
import { registerHandler, type Handler } from "./runner";

/**
 * HRK Hochschulkompass institution list (tab-separated export, German headers).
 * Gives every German higher-education institution: name, type, state, city, website, students, founding year.
 */
export type HrkRecord = {
  hrkNumber: number; shortName: string | null; name: string; institutionType: string | null; sponsorship: string | null;
  state: string | null; city: string | null; website: string | null; studentCount: number | null; foundedYear: number | null; doctorateRight: boolean | null;
};

export const HRK_SOURCE = "HRK Hochschulkompass (export provided by the site owner)";

/** Tab-separated parser that understands quoted fields, including ones that wrap onto several lines (as Excel exports do). */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === "\t") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  // line breaks and runs of spaces inside a value become single spaces
  return rows.filter((r) => r.some((v) => v.trim())).map((r) => r.map((v) => v.replace(/\s+/g, " ").trim()));
}

export function parseHrkTsv(text: string): HrkRecord[] {
  const [head, ...lines] = parseTsv(text);
  if (!head) return [];
  const col = (name: string) => head.indexOf(name);
  const c = { nr: col("Hs-Nr."), short: col("Hochschulkurzname"), name: col("Hochschulname"), type: col("Hochschultyp"), spons: col("Trägerschaft"), state: col("Bundesland"), students: col("Anzahl Studierende"), founded: col("Gründungsjahr"), doctorate: col("Promotionsrecht"), city: col("Ort (Hausanschrift)"), web: col("Home Page") };
  if (c.nr < 0 || c.name < 0) throw new Error("This doesn't look like an HRK Hochschulkompass export (missing Hs-Nr. / Hochschulname columns).");

  const out: HrkRecord[] = [];
  for (const f of lines) {
    const hrkNumber = toInt(f[c.nr]);
    const name = f[c.name];
    if (!hrkNumber || !name) continue;
    out.push({
      hrkNumber, name, shortName: f[c.short] || null, institutionType: f[c.type] || null, sponsorship: f[c.spons] || null,
      state: f[c.state] || null, city: f[c.city] || null, website: normalizeUrl(f[c.web]), studentCount: toInt(f[c.students]),
      foundedYear: toInt(f[c.founded]), doctorateRight: c.doctorate >= 0 && f[c.doctorate] ? f[c.doctorate] === "Ja" : null,
    });
  }
  return out;
}

const FIELDS = ["name", "shortName", "institutionType", "sponsorship", "state", "city", "website", "studentCount", "foundedYear", "doctorateRight"] as const;

const handler: Handler = {
  async step(job, index, log) {
    const rec = (job.payload as { rows: HrkRecord[] }).rows[index];
    // Match order: HRK number, then the same website host, then the same normalised name (links hand-made records to the official list).
    let existing = await prisma.university.findUnique({ where: { hrkNumber: rec.hrkNumber } });
    if (!existing) {
      const host = hostOf(rec.website);
      const candidates = await prisma.university.findMany({
        where: { hrkNumber: null, OR: [{ name: { equals: rec.name, mode: "insensitive" } }, ...(host ? [{ website: { contains: host, mode: "insensitive" as const } }] : [])] },
      });
      existing = candidates.find((u) => (host && hostOf(u.website) === host) || normName(u.name) === normName(rec.name)) ?? null;
    }

    const stamp = { source: HRK_SOURCE, sourceUrl: "https://www.hochschulkompass.de/hochschulen.html", lastVerifiedAt: new Date() };
    if (!existing) {
      await prisma.university.create({
        data: {
          hrkNumber: rec.hrkNumber, slug: await uniqueSlug(rec.name), name: rec.name, shortName: rec.shortName, institutionType: rec.institutionType,
          sponsorship: rec.sponsorship, state: rec.state, city: rec.city || rec.state || "—", website: rec.website || "https://www.hochschulkompass.de",
          studentCount: rec.studentCount, foundedYear: rec.foundedYear, doctorateRight: rec.doctorateRight, ...stamp,
        },
      });
      return "created";
    }

    // Fields an admin edited by hand are never overwritten.
    const locked = new Set(existing.lockedFields);
    const data: Record<string, unknown> = {};
    for (const f of FIELDS) {
      if (locked.has(f)) continue;
      const next = rec[f];
      if (next === null || next === undefined) continue;
      if ((existing as any)[f] !== next) data[f] = next;
    }
    if (existing.hrkNumber !== rec.hrkNumber) data.hrkNumber = rec.hrkNumber;
    if (Object.keys(data).length === 0) return "skipped";
    await prisma.university.update({ where: { id: existing.id }, data: { ...data, ...stamp } });
    if (data.hrkNumber && existing.hrkNumber === null) log(`Linked existing record "${existing.name}" to HRK #${rec.hrkNumber}`);
    return "updated";
  },
};

registerHandler("hrk", handler);
