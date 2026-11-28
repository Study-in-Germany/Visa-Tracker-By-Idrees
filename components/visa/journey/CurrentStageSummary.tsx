import Icon, { type IconName } from "@/components/ui/Icon";
import type { TransitJourneyViewModel } from "@/lib/analytics/types";

export default function CurrentStageSummary({
  embassy,
  currentStage,
}: {
  embassy: TransitJourneyViewModel["embassy"];
  currentStage: TransitJourneyViewModel["currentStage"];
}) {
  let iconBoxCls = "border-line bg-paper-sunk text-ink-700";
  let statusTextCls = "text-mute";
  let iconName: IconName = "calendarClock";

  if (currentStage.tone === "action") {
    iconBoxCls = "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300";
    statusTextCls = "text-amber-700 dark:text-amber-400";
  } else if (currentStage.tone === "completed") {
    iconBoxCls = "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300";
    statusTextCls = "text-emerald-700 dark:text-emerald-400";
    iconName = "badgeCheck";
  } else if (currentStage.tone === "terminal-rejected") {
    iconBoxCls = "border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300";
    statusTextCls = "text-red-700 dark:text-red-400";
    iconName = "xcircle";
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-4 border-b border-line pb-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
          Current stage
        </p>
        <p className="mt-0.5 text-[18px] font-semibold tracking-tight text-ink-900 sm:text-[20px]">
          {currentStage.label}
        </p>
        <p className={`mt-0.5 text-[13px] ${statusTextCls}`}>
          {embassy} · {currentStage.statusText}
        </p>
      </div>

      <span
        aria-hidden="true"
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${iconBoxCls}`}
      >
        <Icon name={iconName} size={18} />
      </span>
    </div>
  );
}
