"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AnalyticsCard from "@/components/analytics/layout/AnalyticsCard";
import AnalyticsChartContainer from "@/components/analytics/shared/AnalyticsChartContainer";
import AnalyticsChartLegend from "@/components/analytics/shared/AnalyticsChartLegend";
import AnalyticsChartTooltip from "@/components/analytics/shared/AnalyticsChartTooltip";
import AnalyticsDataTable from "@/components/analytics/shared/AnalyticsDataTable";
import AnalyticsDetailsDrawer from "@/components/analytics/shared/AnalyticsDetailsDrawer";
import AnalyticsEmptyState from "@/components/analytics/shared/AnalyticsEmptyState";
import { useAnalyticsChartPalette } from "@/components/analytics/shared/useAnalyticsChartPalette";
import { formatWeekRange, formatWeekShort } from "@/lib/analytics/chart-formatters";
import type { WeeklyActivityItem } from "@/lib/analytics/dashboard-types";
import {
  adaptWeeklyActivitySeries,
  type AdaptedWeeklyActivityItem,
} from "@/lib/analytics/presentation-adapter";
import type { Embassy } from "@/lib/forecasting/types";

export default function WeeklyActivityChart({
  embassy,
  data,
  asOfDate,
}: {
  embassy: Embassy;
  data: WeeklyActivityItem[];
  asOfDate: string;
}) {
  const palette = useAnalyticsChartPalette();
  const [layout, setLayout] = useState<"grouped" | "stacked">("stacked");
  const [selectedWeek, setSelectedWeek] = useState<AdaptedWeeklyActivityItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const adapted = useMemo(
    () => adaptWeeklyActivitySeries(data, asOfDate),
    [data, asOfDate]
  );

  const totalEvents = useMemo(
    () => adapted.weeks.reduce((s, w) => s + w.totalEvents, 0),
    [adapted.weeks]
  );

  return (
    <>
      <AnalyticsCard
        testId="chart-weekly-activity"
        title={`Weekly processing activity (${embassy})`}
        subtitle={`${adapted.sourceLabel} by ISO week`}
        primaryMetric={totalEvents.toLocaleString("en-US")}
        primaryLabel={`events across ${adapted.weeks.length} completed/active weeks`}
        onViewDataClick={() => setDrawerOpen(true)}
        controls={
          <div
            role="group"
            aria-label="Weekly bar layout"
            className="inline-flex rounded-lg border border-line bg-paper-sunk p-0.5 text-[11px]"
          >
            {[
              { id: "stacked" as const, label: "Stacked" },
              { id: "grouped" as const, label: "Grouped" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={layout === opt.id}
                onClick={() => setLayout(opt.id)}
                className={`rounded-md px-2 py-1 font-medium transition-colors ${
                  layout === opt.id
                    ? "bg-paper-raised font-semibold text-ink-900 shadow-xs"
                    : "text-mute hover:text-ink-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AnalyticsChartLegend
              items={[
                { key: "sub", label: "Sub. invites", color: palette.primarySeries },
                { key: "corr", label: "Corrections", color: palette.semanticCorrection },
                { key: "appt", label: "Appt. invites", color: palette.tertiarySeries },
              ]}
            />
            {selectedWeek && (
              <span className="text-[11px] font-medium text-ink-800 tabular-nums">
                Wk {formatWeekShort(selectedWeek.weekStart)}
                {selectedWeek.isCurrentWeek ? " (In progress)" : ""}: {selectedWeek.submissions} sub ·{" "}
                {selectedWeek.corrections} corr · {selectedWeek.appointments} appt
              </span>
            )}
          </div>
        }
      >
        {adapted.weeks.length === 0 ? (
          <AnalyticsEmptyState
            icon="calendar"
            title="No weekly event counts yet"
            hint={`Dated submission, correction, and appointment events for ${embassy} will display here.`}
            compact
          />
        ) : (
          <AnalyticsChartContainer
            ariaLabel={`Weekly processing activity chart for ${embassy}`}
            srSummary={`${adapted.weeks.length} weeks totaling ${totalEvents} deduplicated timeline events.`}
            minHeight={225}
          >
            <ResponsiveContainer width="100%" height={225}>
              <BarChart
                data={adapted.weeks}
                margin={{ top: 8, right: 6, left: -18, bottom: 0 }}
                onClick={(state) => {
                  const row = state?.activePayload?.[0]?.payload as AdaptedWeeklyActivityItem | undefined;
                  if (row) setSelectedWeek(row);
                }}
              >
                <CartesianGrid stroke={palette.gridLine} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="weekStart"
                  tickFormatter={formatWeekShort}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke={palette.axisText}
                  minTickGap={22}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, "auto"]}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke={palette.axisText}
                />
                <Tooltip
                  cursor={{ fill: palette.surfaceSunk }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const w = payload[0].payload as AdaptedWeeklyActivityItem;
                    return (
                      <AnalyticsChartTooltip
                        title={`Week of ${formatWeekRange(w.weekStart)}`}
                        subtitle={w.isCurrentWeek ? "In-progress week · " + adapted.sourceLabel : adapted.sourceLabel}
                        rows={[
                          { label: "Submission invites", value: w.submissions, color: palette.primarySeries },
                          { label: "Correction requests", value: w.corrections, color: palette.semanticCorrection },
                          { label: "Appointment invites", value: w.appointments, color: palette.tertiarySeries },
                        ]}
                      />
                    );
                  }}
                />
                <Bar
                  dataKey="submissions"
                  stackId={layout === "stacked" ? "wk" : undefined}
                  name="Sub. invites"
                  fill={palette.primarySeries}
                  radius={layout === "grouped" ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="corrections"
                  stackId={layout === "stacked" ? "wk" : undefined}
                  name="Corrections"
                  fill={palette.semanticCorrection}
                  radius={layout === "grouped" ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="appointments"
                  stackId={layout === "stacked" ? "wk" : undefined}
                  name="Appt. invites"
                  fill={palette.tertiarySeries}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsChartContainer>
        )}
      </AnalyticsCard>

      <AnalyticsDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`Weekly processing activity (${embassy})`}
        subtitle={`${adapted.sourceLabel}. Future weeks beyond ${asOfDate} are excluded.`}
      >
        <AnalyticsDataTable
          caption={`Weekly activity for ${embassy}`}
          rows={[...adapted.weeks].reverse()}
          rowKey={(r) => r.weekStart}
          columns={[
            {
              key: "week",
              label: "ISO Week",
              render: (r) => (
                <span>
                  {formatWeekRange(r.weekStart)}
                  {r.isCurrentWeek && (
                    <span className="ml-1.5 rounded border border-line bg-paper-sunk px-1 py-0.5 text-[10px] font-medium text-mute">
                      In progress
                    </span>
                  )}
                </span>
              ),
            },
            { key: "sub", label: "Sub. invites", align: "right", render: (r) => r.submissions },
            { key: "corr", label: "Corrections", align: "right", render: (r) => r.corrections },
            { key: "appt", label: "Appts", align: "right", render: (r) => r.appointments },
            {
              key: "total",
              label: "Total",
              align: "right",
              render: (r) => <strong className="text-ink-900">{r.totalEvents}</strong>,
            },
          ]}
        />
      </AnalyticsDetailsDrawer>
    </>
  );
}
