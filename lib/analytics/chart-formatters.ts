import { formatDuration } from "@/lib/format";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function formatMonthShort(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const year = m[1].slice(-2);
  const monthIdx = Number(m[2]) - 1;
  const mon = SHORT_MONTHS[monthIdx] ?? m[2];
  return `${mon} '${year}`;
}

export function formatMonthFull(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  return dt.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatWeekShort(isoMonday: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoMonday)) return isoMonday;
  const d = new Date(`${isoMonday}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoMonday;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatWeekRange(isoMonday: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoMonday)) return isoMonday;
  const start = new Date(`${isoMonday}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return isoMonday;
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const sStr = start.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const eStr = end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${sStr} – ${eStr}`;
}

export function formatUtcDayShort(msOrIso: number | string | null | undefined): string {
  if (msOrIso === null || msOrIso === undefined || msOrIso === "") return "—";
  const d = typeof msOrIso === "number" ? new Date(msOrIso) : new Date(`${msOrIso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function formatUtcDayFull(msOrIso: number | string | null | undefined): string {
  if (msOrIso === null || msOrIso === undefined || msOrIso === "") return "—";
  const d = typeof msOrIso === "number" ? new Date(msOrIso) : new Date(`${msOrIso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatDaysCompact(days: number | null | undefined): string {
  if (days === null || days === undefined || Number.isNaN(days)) return "Unavailable";
  return formatDuration(Math.round(days));
}

export function formatSharePct(part: number, total: number, decimals = 1): string {
  if (total <= 0) return "0%";
  const pct = (part / total) * 100;
  return `${pct.toFixed(decimals).replace(/\.0$/, "")}%`;
}

export function formatSampleCount(n: number): string {
  return `n=${n.toLocaleString("en-US")}`;
}
