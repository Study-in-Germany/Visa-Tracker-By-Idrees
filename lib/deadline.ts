// Deadlines are stored as UTC calendar days, so they are formatted and compared in UTC to avoid off-by-one days.

export const fmtDay = (iso: string | Date | null | undefined) => {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

export function daysUntil(iso: string): number {
  const n = new Date();
  const today = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  return Math.round((new Date(iso).getTime() - today) / 86_400_000);
}

export type Urgency = "closed" | "soon" | "near" | "open";

export function deadlineUrgency(days: number): Urgency {
  if (days < 0) return "closed";
  if (days <= 14) return "soon";
  if (days <= 45) return "near";
  return "open";
}

export function relativeDays(days: number) {
  if (days < 0) return "Closed";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 60) return `${days} days left`;
  return `${Math.round(days / 30)} months left`;
}

/** "2026-03-05" for <input type="date">. */
export const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");
