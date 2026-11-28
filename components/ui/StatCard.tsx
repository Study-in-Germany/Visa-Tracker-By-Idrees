import Link from "next/link";
import Icon, { IconName } from "./Icon";
import { Skeleton } from "./States";
import { formatDuration } from "@/lib/format";

export type StatFormat = "number" | "days" | "percent";
export type StatTone = "neutral" | "good" | "bad" | "warn" | "accent" | "sage";

export type StatCardProps = {
  /** Short uppercase label shown below or beside the value. */
  label: string;
  /** null/undefined renders an em dash. */
  value: number | string | null | undefined;
  format?: StatFormat;
  icon: IconName;
  tone?: StatTone;
  /** tile: compact Valley Admin Overview card. wide: horizontal lead card. */
  variant?: "tile" | "wide";
  trend?: { delta: number; label?: string; goodWhen?: "up" | "down" };
  hint?: string;
  visual?: React.ReactNode;
  sparkline?: React.ReactNode;
  loading?: boolean;
  href?: string;
};

export function formatStat(value: number | string | null | undefined, format: StatFormat = "number") {
  if (typeof value === "string") return value || "—";
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (format === "days") return formatDuration(value);
  if (format === "percent") return `${Math.round(value)}%`;
  return Math.round(value).toLocaleString("en-US");
}

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

/**
 * Statistics card replicating the clean Valley Admin Overview style:
 * pure white surface, subtle neutral border, restrained icon container, clear figure and uppercase label.
 */
export default function StatCard({
  label,
  value,
  format = "number",
  icon,
  variant = "tile",
  trend,
  hint,
  visual,
  sparkline,
  loading,
  href,
}: StatCardProps) {
  const figure = formatStat(value, format);
  const wide = variant === "wide";

  const iconBox = (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line bg-paper-sunk text-ink-600">
      <Icon name={icon} size={14} />
    </span>
  );

  const cls = `block h-full rounded-xl border border-line bg-card p-3 transition-colors ${
    wide ? "min-h-[64px]" : "min-h-[78px]"
  } ${href ? "hover:border-line-strong hover:bg-[rgb(var(--hover)/0.6)]" : ""}`;

  const body = loading ? (
    <div className="space-y-2" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="h-2.5 w-20" />
    </div>
  ) : wide ? (
    <div className="flex h-full items-center gap-3">
      {iconBox}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-mute">{label}</div>
        <div className="mt-0.5 text-xl font-bold leading-none tracking-tight text-ink-900 tabular-nums sm:text-2xl">{figure}</div>
        {(trend || hint) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2">
            {trend && <Trend trend={trend} />}
            {hint && <span className="truncate text-[11px] text-mute">{hint}</span>}
          </div>
        )}
      </div>
      {sparkline && <div className="hidden shrink-0 sm:block">{sparkline}</div>}
    </div>
  ) : (
    <div className="flex h-full flex-col justify-between gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xl font-bold leading-none tracking-tight text-ink-900 tabular-nums sm:text-2xl">{figure}</div>
          <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wider text-mute">{label}</div>
        </div>
        {iconBox}
      </div>
      {(visual || trend || hint || sparkline) && (
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            {visual}
            {(trend || hint) && (
              <div className="flex flex-wrap items-center gap-x-2">
                {trend && <Trend trend={trend} />}
                {hint && <span className="truncate text-[11px] text-mute">{hint}</span>}
              </div>
            )}
          </div>
          {sparkline && <div className="hidden shrink-0 sm:block">{sparkline}</div>}
        </div>
      )}
    </div>
  );

  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
