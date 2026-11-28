"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AnalyticsCard from "@/components/analytics/layout/AnalyticsCard";
import AnalyticsChartContainer from "@/components/analytics/shared/AnalyticsChartContainer";
import AnalyticsChartTooltip from "@/components/analytics/shared/AnalyticsChartTooltip";
import AnalyticsDataTable from "@/components/analytics/shared/AnalyticsDataTable";
import AnalyticsDetailsDrawer from "@/components/analytics/shared/AnalyticsDetailsDrawer";
import AnalyticsEmptyState from "@/components/analytics/shared/AnalyticsEmptyState";
import { useAnalyticsChartPalette } from "@/components/analytics/shared/useAnalyticsChartPalette";
import { formatDaysCompact, formatMonthFull, formatMonthShort } from "@/lib/analytics/chart-formatters";
import type { WaitByInviteMonthItem } from "@/lib/analytics/dashboard-types";
import {
  adaptHistoricalWaitSeries,
  type AdaptedWaitMonthPoint,
} from "@/lib/analytics/presentation-adapter";
import type { Embassy } from "@/lib/forecasting/types";

type ChartWaitRow = AdaptedWaitMonthPoint & { iqrSpan: number };

export default function HistoricalWaitChart({
  embassy,
  data,
  asOfDate,
}: {
  embassy: Embassy;
  data: WaitByInviteMonthItem[];
  asOfDate: string;
}) {
  const palette = useAnalyticsChartPalette();
  const [drawerMode, setDrawerMode] = useState<"data" | "info" | null>(null);

  const adapted = useMemo(
    () => adaptHistoricalWaitSeries(data, asOfDate),
    [data, asOfDate]
  );

  const chartRows: ChartWaitRow[] = useMemo(
    () =>
      adapted.points.map((p) => ({
        ...p,
        iqrSpan: Math.max(0, p.p75Days - p.p25Days),
      })),
    [adapted.points]
  );

  const latestWellSupported = [...adapted.points]
    .reverse()
    .find((p) => !p.isSmallSample && !p.isSuspiciousZeroDay);

  return (
    <>
      <AnalyticsCard
        testId="chart-historical-wait"
        title={`Historical wait by invitation month (${embassy})`}
        subtitle="Median waiting time (WL → invite) with P25–P75 dispersion"
        primaryMetric={
          latestWellSupported ? formatDaysCompact(latestWellSupported.medianDays) : undefined
        }
        primaryLabel={
          latestWellSupported
            ? `latest well-supported month (${formatMonthShort(latestWellSupported.month)}, n=${latestWellSupported.sampleSize})`
            : undefined
        }
        onInfoClick={() => setDrawerMode("info")}
        onViewDataClick={() => setDrawerMode("data")}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: palette.medianMarker }}
                  aria-hidden="true"
                />
                Median (n≥5)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full border-2"
                  style={{
                    borderColor: palette.secondarySeries,
                    backgroundColor: palette.surfaceCard,
                  }}
                  aria-hidden="true"
                />
                Small sample (n&lt;5)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-3 w-2.5 rounded-sm"
                  style={{ backgroundColor: palette.rangeBand }}
                  aria-hidden="true"
                />
                P25–P75 range
              </span>
            </div>
            {adapted.futureExcluded.length > 0 && (
              <span className="text-mute">
                {adapted.futureExcluded.length} future-dated month excluded from chart
              </span>
            )}
          </div>
        }
      >
        {chartRows.length === 0 ? (
          <AnalyticsEmptyState
            icon="clock"
            title="Not enough historical invitation pairs"
            hint={`Paired waiting-list and invitation dates for ${embassy} will appear here once recorded.`}
            compact
          />
        ) : (
          <AnalyticsChartContainer
            ariaLabel={`Monthly median waiting time and P25-P75 range for ${embassy}`}
            srSummary={`${chartRows.length} historical invitation months totaling ${adapted.totalSamples} observations.`}
            minHeight={235}
          >
            <ResponsiveContainer width="100%" height={235}>
              <ComposedChart
                data={chartRows}
                margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid stroke={palette.gridLine} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthShort}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke={palette.axisText}
                  minTickGap={20}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, "auto"]}
                  tickFormatter={(v) => `${v}d`}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke={palette.axisText}
                />
                <Tooltip
                  cursor={{ fill: palette.surfaceSunk }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as ChartWaitRow;
                    const footerNotes: string[] = [];
                    if (row.isSmallSample) footerNotes.push(`Small sample (n=${row.sampleSize} < 5) — treat cautiously.`);
                    if (row.isSuspiciousZeroDay) footerNotes.push("0-day median indicates same-day WL & invite dates in raw entries.");
                    return (
                      <AnalyticsChartTooltip
                        title={`Invited ${formatMonthFull(row.month)}`}
                        subtitle={`${row.sampleSize} ${row.sampleSize === 1 ? "observation" : "observations"}`}
                        rows={[
                          {
                            label: "Median wait",
                            value: `${row.medianDays}d (${formatDaysCompact(row.medianDays)})`,
                            color: row.isSuspiciousZeroDay
                              ? palette.anomalyMarker
                              : palette.medianMarker,
                          },
                          {
                            label: "P25–P75 range",
                            value: `${row.p25Days}d – ${row.p75Days}d`,
                          },
                        ]}
                        footer={footerNotes.length > 0 ? footerNotes.join(" ") : null}
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="p25Days"
                  stackId="iqr"
                  fill="transparent"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="iqrSpan"
                  stackId="iqr"
                  barSize={14}
                  radius={[3, 3, 3, 3]}
                  isAnimationActive={false}
                >
                  {chartRows.map((entry) => (
                    <Cell
                      key={entry.month}
                      fill={palette.rangeBand}
                      fillOpacity={entry.isSmallSample ? 0.45 : 0.85}
                    />
                  ))}
                </Bar>
                <Line
                  type="linear"
                  dataKey="medianDays"
                  stroke={palette.secondarySeries}
                  strokeWidth={1.5}
                  strokeOpacity={0.45}
                  isAnimationActive={false}
                  dot={(props: { cx?: number; cy?: number; payload?: ChartWaitRow }) => {
                    const { cx, cy, payload } = props;
                    if (cx === undefined || cy === undefined || !payload) return <g />;
                    const strokeColor = payload.isSuspiciousZeroDay
                      ? palette.anomalyMarker
                      : payload.isSmallSample
                        ? palette.secondarySeries
                        : palette.medianMarker;
                    const fillColor =
                      payload.isSmallSample || payload.isSuspiciousZeroDay
                        ? palette.surfaceCard
                        : palette.medianMarker;
                    return (
                      <circle
                        key={payload.month}
                        cx={cx}
                        cy={cy}
                        r={payload.isSmallSample ? 4 : 5}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </AnalyticsChartContainer>
        )}
      </AnalyticsCard>

      <AnalyticsDetailsDrawer
        open={drawerMode !== null}
        onClose={() => setDrawerMode(null)}
        title={
          drawerMode === "info"
            ? "Historical waiting time methodology"
            : `Historical wait by invitation month (${embassy})`
        }
        subtitle="Measured across combined deduplicated journeys with valid waiting-list and submission invitation dates."
      >
        {drawerMode === "info" ? (
          <div className="space-y-3 text-[12px] leading-relaxed text-ink-700">
            <div className="rounded-lg border border-line bg-paper-sunk p-3">
              <p className="font-semibold text-ink-900">Small samples &amp; zero-day entries</p>
              <p className="mt-1 text-mute">
                Months with fewer than 5 observations are visually muted (hollow markers) because a single entry can swing the median dramatically. Months showing a 0-day median reflect raw reports with identical waiting-list and invite dates and are highlighted with an amber ring rather than silently deleted.
              </p>
            </div>
            <p className="text-[12px] text-mute">
              Records dated beyond the current calendar month ({asOfDate.slice(0, 7)}) are excluded from the historical bars and disclosed separately.
            </p>
          </div>
        ) : (
          <AnalyticsDataTable
            caption={`Historical wait table for ${embassy}`}
            rows={[...data].reverse()}
            rowKey={(r) => r.month}
            columns={[
              { key: "month", label: "Invite month", render: (r) => formatMonthFull(r.month) },
              {
                key: "median",
                label: "Median",
                align: "right",
                render: (r) => `${r.medianDays}d (${formatDaysCompact(r.medianDays)})`,
              },
              {
                key: "iqr",
                label: "P25–P75",
                align: "right",
                render: (r) => `${r.p25Days}d – ${r.p75Days}d`,
              },
              {
                key: "n",
                label: "Sample",
                align: "right",
                render: (r) => (
                  <span className={r.sampleSize < 5 ? "text-mute" : "font-semibold text-ink-900"}>
                    n={r.sampleSize}
                    {r.sampleSize < 5 ? " (low)" : ""}
                  </span>
                ),
              },
            ]}
          />
        )}
      </AnalyticsDetailsDrawer>
    </>
  );
}
