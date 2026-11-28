"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import AnalyticsCard from "@/components/analytics/layout/AnalyticsCard";
import AnalyticsChartContainer from "@/components/analytics/shared/AnalyticsChartContainer";
import AnalyticsChartTooltip from "@/components/analytics/shared/AnalyticsChartTooltip";
import AnalyticsEmptyState from "@/components/analytics/shared/AnalyticsEmptyState";
import { useAnalyticsChartPalette } from "@/components/analytics/shared/useAnalyticsChartPalette";
import { formatSharePct } from "@/lib/analytics/chart-formatters";
import type { EmbassyDistributionRow } from "@/lib/analytics/dashboard-types";

export default function EmbassyDistributionChart({
  rows,
  total,
  activeConsulate,
  onSelectConsulate,
}: {
  rows: EmbassyDistributionRow[];
  total: number;
  activeConsulate: string;
  onSelectConsulate: (consulate: string) => void;
}) {
  const palette = useAnalyticsChartPalette();
  const nonEmpty = rows.filter((r) => r.total > 0);

  const colorFor = (consulate: string) =>
    consulate === "Islamabad" ? palette.islamabadBar : palette.karachiBar;

  return (
    <AnalyticsCard
      testId="chart-embassy-distribution"
      title="Embassy distribution"
      subtitle="Click an embassy to filter the dashboard"
      footer={
        <span className="text-[12px] text-mute">
          {activeConsulate
            ? `Filtered to ${activeConsulate} — click again to clear`
            : "Canonical approved cohort split by mission"}
        </span>
      }
    >
      {total === 0 || nonEmpty.length === 0 ? (
        <AnalyticsEmptyState
          icon="building"
          title="No embassy records"
          hint="No approved applicants match the active filters."
          compact
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative mx-auto h-[176px] w-full max-w-[220px]">
            <AnalyticsChartContainer
              ariaLabel="Embassy distribution donut chart"
              srSummary={nonEmpty
                .map((r) => `${r.consulate}: ${r.total} (${r.sharePct}%)`)
                .join(", ")}
              minHeight={176}
            >
              <ResponsiveContainer width="100%" height={176}>
                <PieChart>
                  <Pie
                    data={nonEmpty}
                    dataKey="total"
                    nameKey="consulate"
                    innerRadius={54}
                    outerRadius={76}
                    paddingAngle={nonEmpty.length > 1 ? 2 : 0}
                    stroke={palette.surfaceCard}
                    strokeWidth={2}
                    isAnimationActive={false}
                    onClick={(entry: EmbassyDistributionRow) => {
                      if (entry?.consulate) onSelectConsulate(entry.consulate);
                    }}
                    className="cursor-pointer outline-none"
                  >
                    {nonEmpty.map((entry) => {
                      const dimmed = Boolean(activeConsulate && activeConsulate !== entry.consulate);
                      return (
                        <Cell
                          key={entry.consulate}
                          fill={colorFor(entry.consulate)}
                          fillOpacity={dimmed ? 0.35 : 1}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as EmbassyDistributionRow;
                      return (
                        <AnalyticsChartTooltip
                          title={d.consulate}
                          rows={[
                            { label: "Applicants", value: d.total, color: colorFor(d.consulate) },
                            { label: "Share", value: `${d.sharePct}%` },
                            { label: "Active", value: d.active },
                          ]}
                        />
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </AnalyticsChartContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[24px] font-bold leading-none tracking-tight text-ink-900 tabular-nums">
                {total.toLocaleString("en-US")}
              </span>
              <span className="mt-1 text-[11px] font-medium text-mute">
                {activeConsulate || "Total"}
              </span>
            </div>
          </div>

          <div className="divide-y divide-line border-t border-line">
            {rows.map((r) => {
              const selected = activeConsulate === r.consulate;
              return (
                <button
                  key={r.consulate}
                  type="button"
                  onClick={() => onSelectConsulate(r.consulate)}
                  aria-pressed={selected}
                  className={`flex w-full items-center justify-between gap-2 px-1.5 py-2 text-left text-[13px] transition-colors hover:bg-[rgb(var(--hover))] ${
                    selected ? "bg-paper-sunk font-semibold" : ""
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: colorFor(r.consulate) }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-ink-900">{r.consulate}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2.5 tabular-nums">
                    <span className="text-[12px] text-mute">
                      {formatSharePct(r.total, total)}
                    </span>
                    <span className="min-w-[2.25rem] text-right font-semibold text-ink-900">
                      {r.total.toLocaleString("en-US")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </AnalyticsCard>
  );
}
