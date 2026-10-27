export function fmtDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  // Obvious typos (e.g. year 0002) would otherwise show up as real dates on the public tracker.
  if (d.getUTCFullYear() < 2000 || d.getUTCFullYear() > 2100) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function toInputDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** "12 days", "1 month", "7 months 20 days": waits are easier to grasp in months once they pass a month. */
export function formatDuration(days: number | null | undefined) {
  if (days === null || days === undefined || Number.isNaN(days)) return "—";
  const total = Math.round(days);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if (total < 30) return plural(total, "day");
  let months = Math.floor(total / 30.4375);
  let rest = Math.round(total - months * 30.4375);
  if (rest >= 30) { months += 1; rest = 0; }
  return rest > 0 ? `${plural(months, "month")} ${plural(rest, "day")}` : plural(months, "month");
}
