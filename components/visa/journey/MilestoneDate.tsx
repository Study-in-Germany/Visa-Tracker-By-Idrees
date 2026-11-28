import type { TransitMilestoneView } from "@/lib/analytics/types";

export default function MilestoneDate({
  milestone,
  align = "center",
}: {
  milestone: TransitMilestoneView;
  align?: "center" | "left";
}) {
  const alignCls = align === "center" ? "text-center" : "text-left";

  if (milestone.state === "completed") {
    return (
      <p className={`mt-0.5 text-[12px] font-semibold tabular-nums text-ink-900 ${alignCls}`}>
        {milestone.formattedActualDate ?? "Recorded"}
      </p>
    );
  }

  if (milestone.state === "terminal") {
    const toneCls =
      milestone.terminalOutcome === "issued"
        ? "text-emerald-700 dark:text-emerald-400"
        : milestone.terminalOutcome === "rejected"
          ? "text-red-700 dark:text-red-400"
          : "text-mute";

    return (
      <div className={`mt-0.5 ${alignCls}`}>
        <p className={`text-[12px] font-semibold tabular-nums ${toneCls}`}>
          {milestone.formattedActualDate ?? milestone.statusLabel}
        </p>
        {milestone.formattedActualDate && milestone.statusLabel && (
          <p className="text-[11px] text-mute">{milestone.statusLabel}</p>
        )}
      </div>
    );
  }

  if (milestone.state === "action-required") {
    return (
      <p className={`mt-0.5 text-[12px] font-semibold text-amber-700 dark:text-amber-400 ${alignCls}`}>
        {milestone.statusLabel ?? "Confirm date"}
      </p>
    );
  }

  if (milestone.estimatedRange) {
    return (
      <div className={`mt-0.5 ${alignCls}`}>
        <p className="text-[12px] font-medium tabular-nums text-ink-800">
          {milestone.estimatedRange.formatted}
        </p>
        <p className="text-[11px] text-mute">Estimated</p>
      </div>
    );
  }

  if (milestone.formattedActualDate) {
    return (
      <div className={`mt-0.5 ${alignCls}`}>
        <p className="text-[12px] font-semibold tabular-nums text-ink-900">
          {milestone.formattedActualDate}
        </p>
        {milestone.statusLabel && (
          <p className="text-[11px] text-mute">{milestone.statusLabel}</p>
        )}
      </div>
    );
  }

  return (
    <p className={`mt-0.5 text-[12px] text-mute ${alignCls}`}>
      {milestone.statusLabel ?? "Pending"}
    </p>
  );
}
