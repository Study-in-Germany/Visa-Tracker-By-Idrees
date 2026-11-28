"use client";

import Icon, { type IconName } from "@/components/ui/Icon";

export default function AnalyticsKpiCard({
  label,
  value,
  sublabel,
  icon,
  sparklineValues,
  testId,
}: {
  label: string;
  value: string | number;
  sublabel: string;
  icon: IconName;
  sparklineValues?: number[];
  testId?: string;
}) {
  const hasSpark = sparklineValues && sparklineValues.length >= 3;

  return (
    <div
      data-testid={testId}
      className="flex min-w-0 flex-col justify-between rounded-xl border border-line bg-card p-3.5 sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
          {label}
        </span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line bg-paper-sunk text-ink-700">
          <Icon name={icon} size={14} />
        </span>
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[20px] font-bold leading-tight tracking-tight text-ink-900 tabular-nums sm:text-[28px] sm:leading-none">
            {value}
          </div>
          <p className="mt-1.5 truncate text-[11px] text-mute sm:text-[12px]">{sublabel}</p>
        </div>

        {hasSpark && <MiniHistoricalBars values={sparklineValues!} />}
      </div>
    </div>
  );
}

function MiniHistoricalBars({ values }: { values: number[] }) {
  const slice = values.slice(-8);
  const max = Math.max(...slice, 1);
  return (
    <div
      className="hidden h-7 w-14 shrink-0 items-end gap-[2px] sm:flex"
      aria-hidden="true"
    >
      {slice.map((v, i) => {
        const h = Math.max(12, Math.round((v / max) * 100));
        const isLast = i === slice.length - 1;
        return (
          <span
            key={i}
            style={{ height: `${h}%` }}
            className={`flex-1 rounded-[1px] ${
              isLast ? "bg-ink-900" : "bg-ink-300/60"
            }`}
          />
        );
      })}
    </div>
  );
}
