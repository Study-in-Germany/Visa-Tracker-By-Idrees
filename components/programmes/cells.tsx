import Icon from "@/components/ui/Icon";
import DeadlineChip from "@/components/universities/DeadlineChip";
import { fmtDay } from "@/lib/deadline";
import { DEGREE_LABELS } from "@/lib/marketplace";
import { NOT_SPECIFIED, ROUTE_LABELS, VERIFICATION_REQUIRED, type ProgrammeRow } from "@/lib/programme-types";

export const Missing = ({ text = NOT_SPECIFIED }: { text?: string }) => <span className="text-mute">{text}</span>;

/** Application deadlines for international (non-EU) applicants, one chip per intake the programme offers. */
export function DeadlineCell({ p }: { p: Pick<ProgrammeRow, "intakes" | "winterDeadline" | "summerDeadline" | "verification"> }) {
  const verified = p.verification === "VERIFIED";
  const winter = p.intakes.includes("WINTER");
  const summer = p.intakes.includes("SUMMER");
  if (!p.winterDeadline && !p.summerDeadline) return <Missing text={VERIFICATION_REQUIRED} />;
  return (
    <div className="flex flex-col items-start gap-1">
      {winter && <DeadlineChip season="Winter" deadline={p.winterDeadline} verified={verified} />}
      {summer && <DeadlineChip season="Summer" deadline={p.summerDeadline} verified={verified} />}
    </div>
  );
}

export const IeltsCell = ({ value }: { value: number | null }) => (value == null ? <Missing /> : <span className="font-semibold tabular-nums">{value.toFixed(1)}</span>);

export function RouteChip({ route }: { route: string | null }) {
  if (!route) return <Missing />;
  return <span className="badge border-line-strong bg-paper-sunk text-ink-700">{ROUTE_LABELS[route]}</span>;
}

export function TuitionCell({ p }: { p: Pick<ProgrammeRow, "tuitionFree" | "tuitionFeeEur"> }) {
  if (p.tuitionFree) return <span className="badge border-emerald-300 bg-emerald-50 text-emerald-800">Tuition-free</span>;
  if (p.tuitionFeeEur != null) return <span className="tabular-nums">€{p.tuitionFeeEur.toLocaleString("en-US")} / sem.</span>;
  return <Missing />;
}

export const DegreeChip = ({ level }: { level: string }) => <span className="badge border-line-strong bg-paper-sunk text-ink-700">{DEGREE_LABELS[level]}</span>;

export function UpdatedCell({ p }: { p: Pick<ProgrammeRow, "lastCheckedAt" | "updatedAt" | "verification"> }) {
  const when = p.lastCheckedAt ?? p.updatedAt;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-mute">
      {p.verification === "VERIFIED" && <Icon name="check" size={12} className="text-emerald-600" />}
      {fmtDay(when)}
    </span>
  );
}
