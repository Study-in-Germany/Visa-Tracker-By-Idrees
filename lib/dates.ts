// Client-side date helpers and presets for the DateRangePicker.
import type { Period } from "./period";

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

export type Preset = { id: string; label: string; range: () => Period };

export const PRESETS: Preset[] = [
  { id: "all", label: "All time", range: () => ({ from: "", to: "" }) },
  {
    id: "30d",
    label: "Last 30 days",
    range: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 29);
      return { from: ymd(from), to: ymd(to) };
    },
  },
  {
    id: "90d",
    label: "Last 90 days",
    range: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 89);
      return { from: ymd(from), to: ymd(to) };
    },
  },
  {
    id: "this-month",
    label: "This month",
    range: () => ({ from: ymd(startOfMonth(new Date())), to: ymd(endOfMonth(new Date())) }),
  },
  {
    id: "last-month",
    label: "Last month",
    range: () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return { from: ymd(startOfMonth(d)), to: ymd(endOfMonth(d)) };
    },
  },
  {
    id: "year",
    label: "This year",
    range: () => {
      const y = new Date().getFullYear();
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    },
  },
];

export function describePeriod(p: Period): string {
  if (!p.from && !p.to) return "All time";
  const match = PRESETS.find((x) => x.id !== "all" && x.range().from === p.from && x.range().to === p.to);
  if (match) return match.label;
  const f = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (p.from && p.to) return `${f(p.from)} – ${f(p.to)}`;
  return p.from ? `From ${f(p.from)}` : `Until ${f(p.to)}`;
}
