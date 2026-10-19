// Shared period handling. A "period" is an inclusive YYYY-MM-DD range applied to
// the waiting-list join date (the cohort an applicant belongs to). The same
// params (`from`, `to`) are accepted by /api/analytics and /api/applicants so
// charts, stats and tables always describe the same set of people.

export type Period = { from: string; to: string }; // "" means open-ended

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Strict calendar check: a real YYYY-MM-DD between 2000 and 2100 (rejects 2026-13-01, 2026-02-31, 0002-01-31). */
export function parseCalendarDay(value: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? dt : null;
}

export function parseDay(value: string | null | undefined): Date | null {
  if (!value || !ISO_DAY.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

/** Prisma `where` fragment for waitingListDate, or undefined when no period is set. */
export function waitingListWhere(from?: string | null, to?: string | null) {
  const start = parseDay(from);
  const end = parseDay(to);
  if (!start && !end) return undefined;
  const range: { gte?: Date; lt?: Date } = {};
  if (start) range.gte = start;
  if (end) range.lt = new Date(end.getTime() + 24 * 60 * 60 * 1000); // inclusive end day
  return range;
}

export function periodParams(period: Period): URLSearchParams {
  const p = new URLSearchParams();
  if (period.from) p.set("from", period.from);
  if (period.to) p.set("to", period.to);
  return p;
}
