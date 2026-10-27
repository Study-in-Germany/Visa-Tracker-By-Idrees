/** Small helpers shared by the university import handlers. */

export const SITE_UA = `VisaTrackerBot/1.0 (+${process.env.SITE_URL || "https://visa-tracker.example"}; contact: site admin)`;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Adds https:// to bare hosts like "www.hs-albsig.de" and trims; returns null if it isn't a usable URL. */
export function normalizeUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return u.hostname.includes(".") ? u.toString().replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}

/** "www." stripped, lower-case: the key used to match a website across data sources. */
export function hostOf(url: string | null | undefined): string | null {
  const n = normalizeUrl(url);
  return n ? new URL(n).hostname.toLowerCase().replace(/^www\./, "") : null;
}

export const normName = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Accepts 2026-07-15 or 15.07.2026 (also 15/07/2026); returns an ISO day or null. Never guesses. */
export function parseDay(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  let x = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (x) [y, m, d] = [+x[1], +x[2], +x[3]];
  else if ((x = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s))) [d, m, y] = [+x[1], +x[2], +x[3]];
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (y < 2000 || y > 2100 || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

export const toInt = (v: string | null | undefined) => {
  const n = parseInt((v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

export const truthy = (v: string | null | undefined) => /^(1|y|yes|ja|true|x)$/i.test((v ?? "").trim());
