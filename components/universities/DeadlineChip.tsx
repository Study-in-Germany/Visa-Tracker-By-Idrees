import { daysUntil, deadlineUrgency, fmtDay, relativeDays } from "@/lib/deadline";

const TONES = {
  closed: "bg-paper-sunk text-mute border-line-strong",
  soon: "bg-red-50 text-red-800 border-red-300",
  near: "bg-amber-50 text-amber-800 border-amber-300",
  open: "bg-emerald-50 text-emerald-800 border-emerald-300",
} as const;

/**
 * One intake's application deadline. Confirmed deadlines are coloured by urgency;
 * unconfirmed ones are shown neutral and marked, so nobody mistakes them for official dates.
 */
export default function DeadlineChip({ season, deadline, verified }: { season: "Summer" | "Winter"; deadline: string | null; verified: boolean }) {
  if (!deadline) {
    return (
      <span className="badge border-dashed border-line-strong text-mute" title={`${season} deadline not published here. Check the university's website.`}>
        {season} · check website
      </span>
    );
  }
  const days = daysUntil(deadline);
  if (!verified) {
    return (
      <span className="badge border-dashed border-line-strong bg-paper-raised text-ink-700" title="Not confirmed against the official page yet. Check the university's website before relying on it.">
        <span className="font-semibold">{season}</span> {fmtDay(deadline)} · unconfirmed
      </span>
    );
  }
  return (
    <span className={`badge ${TONES[deadlineUrgency(days)]}`} title={`${season} intake application deadline, confirmed`}>
      <span className="font-semibold">{season}</span> {fmtDay(deadline)}
      <span className="opacity-75">· {relativeDays(days)}</span>
    </span>
  );
}
