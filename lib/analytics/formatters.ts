import { formatDuration } from "@/lib/format";
import type { ConfidenceLevel } from "@/lib/forecasting/types";

function parseUtcDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d =
    value instanceof Date
      ? value
      : /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00Z`)
        : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  if (year < 2000 || year > 2100) return null;
  return d;
}

/** Formats a date as concise human-readable UTC string, e.g. "5 Mar 2026". */
export function formatDisplayDate(value: string | Date | null | undefined): string {
  const d = parseUtcDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Formats a date as compact day + month, e.g. "5 Mar". */
export function formatShortMonthDay(value: string | Date | null | undefined): string {
  const d = parseUtcDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Formats a date range concisely without repeating identical months or years. */
export function formatConciseDateRange(startIso: string | null | undefined, endIso: string | null | undefined): string {
  const s = parseUtcDate(startIso);
  const e = parseUtcDate(endIso);
  if (!s && !e) return "Unavailable";
  if (s && !e) return formatDisplayDate(s);
  if (!s && e) return formatDisplayDate(e);
  const start = s!;
  const end = e!;

  if (start.getTime() === end.getTime()) {
    return formatDisplayDate(start);
  }

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    const monYear = end.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
    return `${start.getUTCDate()}–${end.getUTCDate()} ${monYear}`;
  }

  if (sameYear) {
    return `${formatShortMonthDay(start)} – ${formatDisplayDate(end)}`;
  }

  return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`;
}

/** Formats elapsed wait days using the shared human-readable duration formatter. */
export function formatElapsedWait(days: number | null | undefined): string {
  return formatDuration(days);
}

/** Formats typical stage duration (~2 weeks, ~8.5 months). */
export function formatApproxStep(days: number): string {
  if (days < 14) {
    const d = Math.max(1, Math.round(days));
    return `${d} ${d === 1 ? "day" : "days"}`;
  }
  if (days < 45) {
    const weeks = Math.round((days / 7) * 2) / 2;
    return `${weeks % 1 === 0 ? weeks : weeks.toFixed(1)} ${weeks === 1 ? "week" : "weeks"}`;
  }
  const months = Math.round((days / 30.44) * 10) / 10;
  return `${months % 1 === 0 ? months.toFixed(0) : months.toFixed(1)} months`;
}

/** Formats an interquartile range cleanly (e.g. "8.4–8.6 months" or "8–25 days"). */
export function formatStepRange(q1Days: number, q3Days: number): string {
  if (q3Days >= 45) {
    const m1 = (q1Days / 30.44).toFixed(1).replace(/\.0$/, "");
    const m2 = (q3Days / 30.44).toFixed(1).replace(/\.0$/, "");
    return m1 === m2 ? `~${m1} months` : `${m1}–${m2} months`;
  }
  return q1Days === q3Days ? `${q1Days} days` : `${q1Days}–${q3Days} days`;
}

export function formatConfidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case "high":
      return "High";
    case "moderate":
      return "Moderate";
    case "low":
      return "Low";
    default:
      return "Limited";
  }
}

export function formatWeeklyDays(rate: number | null | undefined): string | null {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return null;
  const rounded = Math.round(rate * 10) / 10;
  if (rounded === 1) return "1 day";
  return Number.isInteger(rounded) ? `${rounded} days` : `${rounded.toFixed(1)} days`;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export function formatUtcShortMonth(monthIndex: number): string {
  return SHORT_MONTHS[((monthIndex % 12) + 12) % 12];
}

/** Concise queue date without leading zero, e.g. "9 Mar" or "9 Mar '25" when includeYear is true. */
export function formatCompactQueueDate(
  value: string | Date | null | undefined,
  options: { includeYear?: boolean; shortYear?: boolean } = {}
): string | null {
  const d = parseUtcDate(value);
  if (!d) return null;
  const day = d.getUTCDate();
  const mon = formatUtcShortMonth(d.getUTCMonth());
  if (options.includeYear) {
    const yr = options.shortYear ? `'${String(d.getUTCFullYear()).slice(-2)}` : String(d.getUTCFullYear());
    return `${day} ${mon} ${yr}`;
  }
  return `${day} ${mon}`;
}

/** Compact tabular weekly pace string matching Option B, e.g. "7.3d" or "4d". */
export function formatCompactWeeklyPace(rate: number | null | undefined): string | null {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return null;
  const rounded = Math.round(rate * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}d`;
}

/** Zero-padded editorial date format, e.g. "09 Mar" or "09 Mar 2026" when includeYear is true. */
export function formatEditorialMonthDay(
  value: string | Date | null | undefined,
  options: { includeYear?: boolean; shortYear?: boolean } = {}
): string | null {
  const d = parseUtcDate(value);
  if (!d) return null;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  if (options.includeYear) {
    const yr = options.shortYear ? `'${String(d.getUTCFullYear()).slice(-2)}` : String(d.getUTCFullYear());
    return `${day} ${mon} ${yr}`;
  }
  return `${day} ${mon}`;
}

/** Compact tabular weekly movement string for editorial metrics, e.g. "7.3 d". */
export function formatEditorialWeeklyMovement(rate: number | null | undefined): string | null {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return null;
  const rounded = Math.round(rate * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} d`;
}

/** Concise confidence text for the editorial queue header without pill badges. */
export function formatCompactConfidenceNote(
  confidence: ConfidenceLevel,
  options: { isStalled?: boolean; hasEnoughData?: boolean; hasConflict?: boolean; effectiveSampleSize?: number | null } = {}
): string | null {
  if (options.hasEnoughData === false || confidence === "insufficient") {
    return "Insufficient data";
  }
  if (options.isStalled) {
    return "Slow or paused";
  }
  if (confidence === "low") {
    if (options.effectiveSampleSize !== null && options.effectiveSampleSize !== undefined && options.effectiveSampleSize < 8) {
      return "Limited evidence";
    }
    return "Low confidence";
  }
  if (options.hasConflict) {
    return "Limited evidence";
  }
  return null;
}

/** Freshness date label, e.g. "26 Nov", including year when different from asOfDate. */
export function formatFreshnessDate(
  iso: string | null | undefined,
  asOfIso?: string | null
): string | null {
  const d = parseUtcDate(iso);
  if (!d) return null;
  const asOf = parseUtcDate(asOfIso);
  const includeYear = Boolean(asOf && d.getUTCFullYear() !== asOf.getUTCFullYear());
  return formatEditorialMonthDay(d, { includeYear });
}
