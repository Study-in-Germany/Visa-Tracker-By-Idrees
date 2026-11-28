"use client";

export interface TooltipMetricRow {
  label: string;
  value: string | number;
  color?: string;
  muted?: boolean;
}

export default function AnalyticsChartTooltip({
  title,
  subtitle,
  rows,
  footer,
}: {
  title: string;
  subtitle?: string | null;
  rows: TooltipMetricRow[];
  footer?: string | null;
}) {
  return (
    <div className="min-w-[170px] max-w-[260px] rounded-lg border border-line bg-paper-raised px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-ink-900">{title}</div>
      {subtitle && <div className="mt-0.5 text-[11px] text-mute">{subtitle}</div>}
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5 text-ink-700">
              {row.color && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{row.label}</span>
            </span>
            <span
              className={`shrink-0 font-semibold tabular-nums ${
                row.muted ? "text-mute" : "text-ink-900"
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
      {footer && (
        <div className="mt-1.5 border-t border-line pt-1.5 text-[11px] leading-snug text-mute">
          {footer}
        </div>
      )}
    </div>
  );
}
