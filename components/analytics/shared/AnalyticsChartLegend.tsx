"use client";

export interface ChartLegendItem {
  key: string;
  label: string;
  color: string;
  variant?: "dot" | "line" | "dashed" | "hollow";
  valueText?: string;
  active?: boolean;
  onClick?: () => void;
}

export default function AnalyticsChartLegend({
  items,
  className = "",
}: {
  items: ChartLegendItem[];
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-700 ${className}`}>
      {items.map((item) => {
        const marker =
          item.variant === "line" ? (
            <span
              className="inline-block h-0.5 w-3.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
          ) : item.variant === "dashed" ? (
            <span
              className="inline-block h-0 w-3.5 shrink-0 border-t-2 border-dashed"
              style={{ borderColor: item.color }}
              aria-hidden="true"
            />
          ) : item.variant === "hollow" ? (
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border-2 bg-transparent"
              style={{ borderColor: item.color }}
              aria-hidden="true"
            />
          ) : (
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
          );

        const content = (
          <>
            {marker}
            <span className="truncate">{item.label}</span>
            {item.valueText && (
              <span className="font-semibold tabular-nums text-ink-900">{item.valueText}</span>
            )}
          </>
        );

        if (item.onClick) {
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              aria-pressed={item.active}
              className={`inline-flex min-h-[28px] items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:bg-[rgb(var(--hover))] ${
                item.active === false ? "opacity-45" : ""
              }`}
            >
              {content}
            </button>
          );
        }

        return (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            {content}
          </span>
        );
      })}
    </div>
  );
}
