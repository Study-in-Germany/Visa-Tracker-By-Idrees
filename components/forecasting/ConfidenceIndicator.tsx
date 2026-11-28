import type { ConfidenceLevel } from "@/lib/forecasting/types";

const CONFIG: Record<ConfidenceLevel, { label: string; cls: string }> = {
  high: {
    label: "Higher confidence candidate",
    cls: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  moderate: {
    label: "Moderate confidence",
    cls: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700/60 dark:bg-blue-950/40 dark:text-blue-300",
  },
  low: {
    label: "Low confidence",
    cls: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  insufficient: {
    label: "Insufficient evidence",
    cls: "border-line-strong bg-paper-sunk text-mute",
  },
};

export default function ConfidenceIndicator({
  level,
  compact = false,
}: {
  level: ConfidenceLevel;
  compact?: boolean;
}) {
  const cfg = CONFIG[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {compact ? level.charAt(0).toUpperCase() + level.slice(1) : cfg.label}
    </span>
  );
}
