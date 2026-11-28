import Icon, { type IconName } from "@/components/ui/Icon";

export default function AnalyticsEmptyState({
  icon = "inbox",
  title,
  hint,
  action,
  compact = false,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-paper-sunk/60 text-center ${
        compact ? "px-4 py-5" : "px-5 py-8"
      }`}
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-paper-raised text-mute">
        <Icon name={icon} size={16} />
      </span>
      <p className="mt-2.5 text-[13px] font-semibold text-ink-900">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-mute">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
