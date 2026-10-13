import Link from "next/link";
import Icon, { IconName } from "./Icon";
import { Skeleton } from "./States";

export type StatFormat = "number" | "days" | "percent";
export type StatTone = "neutral" | "good" | "bad" | "warn" | "accent" | "sage";

export type StatCardProps = {
  /** Short label, shown in uppercase under the figure. */
  label: string;
  /** null/undefined renders an em dash: the backend has no data for it. */
  value: number | null | undefined;
  format?: StatFormat;
  icon: IconName;
  tone?: StatTone;
  /** tile: stacked icon / figure / label. wide: icon at left, label over figure. */
  variant?: "tile" | "wide";
  /** Optional comparison from real data, shown as a small line under the label. */
  trend?: { delta: number; label?: string; goodWhen?: "up" | "down" };
  hint?: string;
  loading?: boolean;
  href?: string;
};

export function formatStat(value: number | null | undefined, format: StatFormat = "number") {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (format === "percent") return `${Math.round(value)}%`;
  return Math.round(value).toLocaleString("en-US");
}

// tinted icon tile + matching status dot (no blue / purple)
const TONES: Record<StatTone, { tile: string; dot: string }> = {
  neutral: { tile: "bg-paper-sunk text-ink-700", dot: "bg-ink-300" },
  sage: { tile: "bg-ink-50 text-ink-600", dot: "bg-ink-600" },
  good: { tile: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  bad: { tile: "bg-red-50 text-red-600", dot: "bg-red-500" },
  warn: { tile: "bg-ochre-50 text-ochre-700", dot: "bg-ochre-500" },
  accent: { tile: "bg-clay-50 text-clay-500", dot: "bg-clay-500" },
};

function Trend({ trend }: { trend: NonNullable<StatCardProps["trend"]> }) {
  if (trend.delta === 0) return <span className="text-[11px] text-mute">No change{trend.label ? ` ${trend.label}` : ""}</span>;
  const up = trend.delta > 0;
  const good = (trend.goodWhen ?? "up") === (up ? "up" : "down");
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${good ? "text-emerald-700" : "text-red-600"}`}>
      <Icon name={up ? "arrowUp" : "arrowDown"} size={11} />
      {Math.abs(trend.delta).toLocaleString("en-US")}
      {trend.label && <span className="ml-1 font-normal text-mute">{trend.label}</span>}
    </span>
  );
}

export default function StatCard({ label, value, format = "number", icon, tone = "neutral", variant = "tile", trend, hint, loading, href }: StatCardProps) {
  const t = TONES[tone];
  const figure = formatStat(value, format);
  const suffix = format === "days" && value != null ? <span className="ml-1 text-sm font-medium text-mute">d</span> : null;
  const wide = variant === "wide";

  const tile = (
    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${t.tile}`}>
      <Icon name={icon} size={16} />
    </span>
  );
  const dot = <span className={`h-2 w-2 shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />;

  const cls = `card block h-full ${"p-3.5"} ${href ? "transition-colors hover:bg-white" : ""}`;

  const body = loading ? (
    <div className="space-y-3" aria-busy="true">
      <Skeleton className="h-9 w-9" />
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  ) : wide ? (
    <div className="flex h-full items-center gap-4">
      {tile}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-mute">{label}</div>
        <div className="mt-0.5 text-2xl font-bold leading-tight tracking-tight">
          {figure}
          {suffix}
        </div>
        {(trend || hint) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
            {trend && <Trend trend={trend} />}
            {hint && <span className="text-[11px] text-mute">{hint}</span>}
          </div>
        )}
      </div>
      {dot}
    </div>
  ) : (
    <>
      <div className="flex items-start justify-between">
        {tile}
        {dot}
      </div>
      <div className="mt-3 text-2xl font-bold leading-none tracking-tight">
        {figure}
        {suffix}
      </div>
      <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-mute">{label}</div>
      {(trend || hint) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2">
          {trend && <Trend trend={trend} />}
          {hint && <span className="text-[11px] text-mute">{hint}</span>}
        </div>
      )}
    </>
  );

  return href ? (
    <Link href={href} className={cls}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
