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
import {
  formatMonthFull,
  formatMonthShort,
  formatWeekRange,
  formatWeekShort,
} from "@/lib/analytics/chart-formatters";
import type { ActivityBucket } from "@/lib/analytics/dashboard-types";

export default function ApplicantActivityChart({
  monthlyByJoinDate,
  weeklyByJoinDate,
  monthlyByEntryDate,
  weeklyByEntryDate,
  activeConsulate,
}: {
  monthlyByJoinDate: ActivityBucket[];
  weeklyByJoinDate: ActivityBucket[];
  monthlyByEntryDate: ActivityBucket[];
  weeklyByEntryDate: ActivityBucket[];
  activeConsulate: string;
}) {
  const palette = useAnalyticsChartPalette();
  const [granularity, setGranularity] = useState<"month" | "week">("month");
  const [dimension, setDimension] = useState<"join" | "entry">("join");
  const [selectedPeriod, setSelectedPeriod] = useState<ActivityBucket | null>(null);
  const [drawerMode, setDrawerMode] = useState<"data" | "info" | null>(null);

  const series = useMemo(() => {
    const raw =
      dimension === "join"
        ? granularity === "month"
          ? monthlyByJoinDate
          : weeklyByJoinDate
        : granularity === "month"
          ? monthlyByEntryDate
          : weeklyByEntryDate;
    // Keep weekly view focused on the latest 16 active weeks for readability
    return granularity === "week" ? raw.slice(-16) : raw.slice(-14);
  }, [dimension, granularity, monthlyByJoinDate, weeklyByJoinDate, monthlyByEntryDate, weeklyByEntryDate]);

  const totalCount = useMemo(() => series.reduce((s, b) => s + b.total, 0), [series]);
  const showStacked = !activeConsulate;

  const formatTick = (v: string) =>
    granularity === "month" ? formatMonthShort(v) : formatWeekShort(v);

  const formatLong = (v: string) =>
    granularity === "month" ? formatMonthFull(v) : `Week of ${formatWeekRange(v)}`;

  const dimensionTitle =
    dimension === "join" ? "Waiting-list registrations" : "Tracker record submissions";
  const dimensionNote =
    dimension === "join"
      ? "Grouped by applicant waiting-list registration date"
      : "Grouped by when the applicant submitted their record to the tracker";

  return (
    <>
      <AnalyticsCard
        testId="chart-applicant-activity"
        title="Applicant activity"
        subtitle={dimensionNote}
        primaryMetric={totalCount.toLocaleString("en-US")}
        primaryLabel={
          dimension === "join"
            ? `with dated WL joins (${granularity === "month" ? "monthly" : "weekly"})`
            : `tracker entries (${granularity === "month" ? "monthly" : "weekly"})`
        }
        onInfoClick={() => setDrawerMode("info")}
        onViewDataClick={() => setDrawerMode("data")}
        controls={
          <div className="flex flex-wrap items-center gap-1.5">
            <div
              role="group"
              aria-label="Date event dimension"
              className="inline-flex rounded-lg border border-line bg-paper-sunk p-0.5 text-[11px]"
            >
              {[
                { id: "join" as const, label: "WL date" },
                { id: "entry" as const, label: "Tracker entry" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={dimension === opt.id}
                  onClick={() => {
                    setDimension(opt.id);
                    setSelectedPeriod(null);
                  }}
                  className={`rounded-md px-2 py-1 font-medium transition-colors ${
                    dimension === opt.id
                      ? "bg-paper-raised font-semibold text-ink-900 shadow-xs"
                      : "text-mute hover:text-ink-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div
              role="group"
              aria-label="Activity aggregation interval"
              className="inline-flex rounded-lg border border-line bg-paper-sunk p-0.5 text-[11px]"
            >
              {[
                { id: "month" as const, label: "Monthly" },
                { id: "week" as const, label: "Weekly" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={granularity === opt.id}
                  onClick={() => {
                    setGranularity(opt.id);
                    setSelectedPeriod(null);
                  }}
                  className={`rounded-md px-2 py-1 font-medium transition-colors ${
                    granularity === opt.id
                      ? "bg-paper-raised font-semibold text-ink-900 shadow-xs"
                      : "text-mute hover:text-ink-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {showStacked ? (
              <AnalyticsChartLegend
                items={[
                  { key: "isb", label: "Islamabad", color: palette.islamabadBar },
                  { key: "khi", label: "Karachi", color: palette.karachiBar },
                ]}
              />
            ) : (
              <span className="text-[12px] text-mute">
                Filtered to {activeConsulate} · Zero-based count scale
              </span>
            )}
            {selectedPeriod && (
              <span className="text-[12px] font-medium text-ink-800 tabular-nums">
                {formatLong(selectedPeriod.period)}: {selectedPeriod.total} ({selectedPeriod.islamabad} ISB · {selectedPeriod.karachi} KHI)
              </span>
            )}
          </div>
        }
      >
        {series.length === 0 ? (
          <AnalyticsEmptyState
            icon="calendar"
            title={`No ${dimensionTitle.toLowerCase()} in this range`}
            hint="Adjust the date range or filters to inspect other periods."
            compact
          />
        ) : (
          <AnalyticsChartContainer
            ariaLabel={`${dimensionTitle} bar chart by ${granularity}`}
            srSummary={`${series.length} periods totaling ${totalCount} records.`}
            minHeight={230}
          >
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                data={series}
                margin={{ top: 8, right: 6, left: -18, bottom: 0 }}
                onClick={(state) => {
                  const payload = state?.activePayload?.[0]?.payload as ActivityBucket | undefined;
                  if (payload) setSelectedPeriod(payload);
                }}
              >
                <CartesianGrid stroke={palette.gridLine} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="period"
                  tickFormatter={formatTick}
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
                    const row = payload[0].payload as ActivityBucket;
                    return (
                      <AnalyticsChartTooltip
                        title={formatLong(row.period)}
                        subtitle={dimensionTitle}
                        rows={[
                          { label: "Total", value: row.total },
                          ...(showStacked
                            ? [
                                { label: "Islamabad", value: row.islamabad, color: palette.islamabadBar },
                                { label: "Karachi", value: row.karachi, color: palette.karachiBar },
                              ]
                            : []),
                        ]}
                      />
                    );
                  }}
                />
                {showStacked ? (
                  <>
                    <Bar
                      dataKey="islamabad"
                      stackId="emb"
                      name="Islamabad"
                      fill={palette.islamabadBar}
                      radius={[0, 0, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="karachi"
                      stackId="emb"
                      name="Karachi"
                      fill={palette.karachiBar}
                      radius={[3, 3, 0, 0]}
                      isAnimationActive={false}
                    />
                  </>
                ) : (
                  <Bar
                    dataKey="total"
                    name={activeConsulate}
                    fill={palette.primarySeries}
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsChartContainer>
        )}
      </AnalyticsCard>

      <AnalyticsDetailsDrawer
        open={drawerMode !== null}
        onClose={() => setDrawerMode(null)}
        title={drawerMode === "info" ? "Applicant activity methodology" : `${dimensionTitle} (${granularity})`}
        subtitle={
          drawerMode === "info"
            ? "Distinguishes waiting-list registration cohorts from when records were entered into the tracker."
            : `${series.length} chronological buckets totaling ${totalCount.toLocaleString("en-US")} records.`
        }
      >
        {drawerMode === "info" ? (
          <div className="space-y-3 text-[13px] leading-relaxed text-ink-700">
            <div className="rounded-lg border border-line bg-paper-sunk p-3">
              <p className="font-semibold text-ink-900">WL date vs. Tracker entry</p>
              <p className="mt-1 text-[12px] text-mute">
                <strong>WL date</strong> groups approved applicants by the date they joined the German embassy/consulate waiting list.{" "}
                <strong>Tracker entry</strong> groups them by when their record was created in Visa Tracker. Approved tracker entries only; unapproved or duplicate admin test records are excluded.
              </p>
            </div>
            <p className="text-[12px] text-mute">
              Bars use a zero-based vertical count axis without spline smoothing so periods with zero activity are never interpolated into artificial peaks.
            </p>
          </div>
        ) : (
          <AnalyticsDataTable
            caption={dimensionTitle}
            rows={[...series].reverse()}
            rowKey={(r) => r.period}
            columns={[
              { key: "period", label: "Period", render: (r) => formatLong(r.period) },
              { key: "isb", label: "Islamabad", align: "right", render: (r) => r.islamabad },
              { key: "khi", label: "Karachi", align: "right", render: (r) => r.karachi },
              {
                key: "total",
                label: "Total",
                align: "right",
                render: (r) => <strong className="text-ink-900">{r.total}</strong>,
              },
            ]}
          />
        )}
      </AnalyticsDetailsDrawer>
    </>
  );
}
