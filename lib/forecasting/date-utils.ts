export const DAY_MS = 86_400_000;

export function toUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function toIsoDay(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export function addDays(date: Date, days: number): Date {
  return new Date(toUtcDay(date).getTime() + Math.round(days) * DAY_MS);
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((toUtcDay(b).getTime() - toUtcDay(a).getTime()) / DAY_MS);
}

export function parseValidUtcDay(v: Date | string | null | undefined, maxFutureMs?: number): Date | null {
  if (!v) return null;
  const dt = v instanceof Date ? v : new Date(v);
  const ms = dt.getTime();
  if (!Number.isFinite(ms)) return null;
  const year = dt.getUTCFullYear();
  if (year < 2020 || year > 2035) return null;
  if (maxFutureMs !== undefined && ms > maxFutureMs) return null;
  return toUtcDay(dt);
}

export function clampFutureDate(candidate: Date, minFloor: Date): Date {
  return candidate.getTime() < minFloor.getTime() ? toUtcDay(minFloor) : toUtcDay(candidate);
}
