"use client";

import Icon from "@/components/ui/Icon";

export default function AnalyticsCard({
  title,
  subtitle,
  primaryMetric,
  primaryLabel,
  controls,
  onInfoClick,
  infoLabel = "About this metric",
  onViewDataClick,
  viewDataLabel = "View data",
  footer,
  className = "",
  children,
  testId,
}: {
  title: string;
  subtitle?: string;
  primaryMetric?: string | number | null;
  primaryLabel?: string;
  controls?: React.ReactNode;
  onInfoClick?: () => void;
  infoLabel?: string;
  onViewDataClick?: () => void;
  viewDataLabel?: string;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <section
      data-testid={testId}
      aria-label={title}
      className={`flex min-w-0 flex-col rounded-xl border border-line bg-card p-4 sm:p-5 ${className}`}
    >
      <header className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-ink-900 sm:truncate sm:text-[17px]">
              {title}
            </h3>
            {onInfoClick && (
              <button
                type="button"
                onClick={onInfoClick}
                aria-label={`${infoLabel}: ${title}`}
                title={infoLabel}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-mute transition-colors hover:bg-[rgb(var(--hover))] hover:text-ink-900"
              >
                <Icon name="info" size={14} />
              </button>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-[12px] leading-snug text-mute sm:text-[13px]">{subtitle}</p>
          )}
        </div>

        {(controls || onViewDataClick) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {controls}
            {onViewDataClick && (
              <button
                type="button"
                onClick={onViewDataClick}
                className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-line bg-paper-raised px-2.5 py-1 text-[12px] font-medium text-ink-700 transition-colors hover:bg-[rgb(var(--hover))] hover:text-ink-900"
              >
                <Icon name="file" size={13} className="text-mute" />
                <span>{viewDataLabel}</span>
              </button>
            )}
          </div>
        )}
      </header>

      {primaryMetric !== undefined && primaryMetric !== null && (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[28px] font-bold leading-none tracking-tight text-ink-900 tabular-nums sm:text-[32px]">
            {primaryMetric}
          </span>
          {primaryLabel && (
            <span className="text-[12px] font-medium text-mute sm:text-[13px]">{primaryLabel}</span>
          )}
        </div>
      )}

      <div className="mt-3 min-w-0 flex-1">{children}</div>

      {footer && (
        <footer className="mt-3 border-t border-line pt-2.5 text-[12px] text-mute">
          {footer}
        </footer>
      )}
    </section>
  );
}
