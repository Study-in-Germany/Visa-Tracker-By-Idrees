"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
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
import { formatUtcDayFull, formatUtcDayShort } from "@/lib/analytics/chart-formatters";
import type { ProgressionHistoryPoint } from "@/lib/analytics/dashboard-types";
import {
  adaptQueueProgressionSeries,
  type AdaptedProgressionChartPoint,
} from "@/lib/analytics/presentation-adapter";
import type { Embassy } from "@/lib/forecasting/types";

export default function QueueProgressionChart({
  embassy,
  data,
  asOfDate,
}: {
  embassy: Embassy;
  data: ProgressionHistoryPoint[];
  asOfDate: string;
}) {
  const palette = useAnalyticsChartPalette();
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<AdaptedProgressionChartPoint | null>(null);
  const [drawerMode, setDrawerMode] = useState<"data" | "info" | null>(null);

  const adapted = useMemo(
    () => adaptQueueProgressionSeries(data, asOfDate),
    [data, asOfDate]
  );

  const hasApptSeries = useMemo(
    () => adapted.rawPoints.some((p) => p.apptMs !== null),
    [adapted.rawPoints]
  );

  const yDomain = useMemo(() => {
    const vals: number[] = [];
    for (const p of adapted.rawPoints) {
      const subVal = showAnomalies ? p.subMs : p.cleanSubMs;
      if (subVal !== null) vals.push(subVal);
      if (p.apptMs !== null) vals.push(p.apptMs);
    }
    if (vals.length === 0) return ["auto", "auto"] as ["auto", "auto"];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max(4 * 86_400_000, Math.round((max - min) * 0.04));
    return [min - pad, max + pad] as [number, number];
  }, [adapted.rawPoints, showAnomalies]);

  const ySpansYears = useMemo(() => {
    if (typeof yDomain[0] !== "number" || typeof yDomain[1] !== "number") return false;
    return new Date(yDomain[0]).getUTCFullYear() !== new Date(yDomain[1]).getUTCFullYear();
  }, [yDomain]);

  const fmtYTick = (ms: number) => {
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "—";
    if (ySpansYears) {
      const base = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
      return `${base} '${String(d.getUTCFullYear()).slice(-2)}`;
    }
    return formatUtcDayShort(ms);
  };

  const latestClean = [...adapted.rawPoints]
    .reverse()
    .find((p) => p.cleanSubMs !== null);

  return (
    <>
      <AnalyticsCard
        testId="chart-queue-progression"
        title={`Queue progression history (${embassy})`}
        subtitle="Observed waiting-list cohort dates reached over calendar time (gaps >14 days preserved)"
        primaryMetric={latestClean?.subDate ? formatUtcDayShort(latestClean.subDate) : undefined}
        primaryLabel={
          latestClean
            ? `latest checkpoint cohort (${adapted.checkpointCount} checkpoints · ${adapted.individualCount} individual reports)`
            : undefined
        }
        onInfoClick={() => setDrawerMode("info")}
        onViewDataClick={() => setDrawerMode("data")}
        controls={
          adapted.flaggedAnomalies.length > 0 ? (
            <button
              type="button"
              aria-pressed={showAnomalies}
              onClick={() => setShowAnomalies((v) => !v)}
              className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                showAnomalies
                  ? "border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                  : "border-line bg-paper-raised text-ink-700 hover:bg-[rgb(var(--hover))]"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full border-2"
                style={{ borderColor: palette.anomalyMarker }}
                aria-hidden="true"
              />
              <span>
                {showAnomalies ? "Hide" : "Show"} {adapted.flaggedAnomalies.length} flagged{" "}
                {adapted.flaggedAnomalies.length === 1 ? "report" : "reports"}
              </span>
            </button>
          ) : undefined
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AnalyticsChartLegend
              items={[
                {
                  key: "sub",
                  label: "Submission invites (WL cohort)",
                  color: palette.submissionFrontier,
                  variant: "line",
                },
                ...(hasApptSeries
                  ? [
                      {
                        key: "appt",
                        label: "Appointments (WL cohort)",
                        color: palette.appointmentFrontier,
                        variant: "dashed" as const,
                      },
                    ]
                  : []),
                ...(showAnomalies && adapted.flaggedAnomalies.length > 0
                  ? [
                      {
                        key: "outlier",
                        label: "Flagged individual reports",
                        color: palette.anomalyMarker,
                        variant: "hollow" as const,
                      },
                    ]
                  : []),
              ]}
            />
            {selectedPoint && !selectedPoint.isGapSpacer && (
              <span className="text-[12px] font-medium text-ink-800 tabular-nums">
                {formatUtcDayFull(selectedPoint.obsDate)}: Sub{" "}
                {selectedPoint.subDate ? formatUtcDayShort(selectedPoint.subDate) : "—"}
                {selectedPoint.apptDate ? ` · Appt ${formatUtcDayShort(selectedPoint.apptDate)}` : ""}
              </span>
            )}
          </div>
        }
      >
        {adapted.rawPoints.length < 2 ? (
          <AnalyticsEmptyState
            icon="pulse"
            title="Not enough queue progression points yet"
            hint={`At least two dated frontier observations for ${embassy} are needed to plot history.`}
            compact
          />
        ) : (
          <AnalyticsChartContainer
            ariaLabel={`Chronological queue progression history for ${embassy}`}
            srSummary={`${adapted.totalObservations} observations for ${embassy}, with ${adapted.flaggedAnomalies.length} flagged individual anomalies.`}
            minHeight={260}
          >
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart
                data={adapted.points}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                onClick={(state) => {
                  const pt = state?.activePayload?.[0]?.payload as AdaptedProgressionChartPoint | undefined;
                  if (pt && !pt.isGapSpacer) setSelectedPoint(pt);
                }}
              >
                <CartesianGrid stroke={palette.gridLine} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="obsMs"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) => formatUtcDayShort(Number(v))}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke={palette.axisText}
                  minTickGap={28}
                />
                <YAxis
                  type="number"
                  domain={yDomain}
                  tickFormatter={(v) => fmtYTick(Number(v))}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke={palette.axisText}
                  width={ySpansYears ? 68 : 56}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const pt = payload[0].payload as AdaptedProgressionChartPoint;
                    if (pt.isGapSpacer) return null;
                    return (
                      <AnalyticsChartTooltip
                        title={`Observed ${formatUtcDayFull(pt.obsDate)}`}
                        subtitle={
                          pt.source === "queue_checkpoint"
                            ? "Structured queue checkpoint"
                            : pt.source === "combined"
                              ? "Queue checkpoint"
                              : "Individual timeline report"
                        }
                        rows={[
                          ...(pt.subDate
                            ? [
                                {
                                  label: "Submission WL cohort",
                                  value: formatUtcDayFull(pt.subDate),
                                  color: pt.isAnomaly
                                    ? palette.anomalyMarker
                                    : palette.submissionFrontier,
                                },
                              ]
                            : []),
                          ...(pt.apptDate
                            ? [
                                {
                                  label: "Appointment WL cohort",
                                  value: formatUtcDayFull(pt.apptDate),
                                  color: palette.appointmentFrontier,
                                },
                              ]
                            : []),
                          ...(pt.reportedSubmissions !== null
                            ? [{ label: "Reported submissions", value: pt.reportedSubmissions, muted: true }]
                            : []),
                          ...(pt.reportedAppointments !== null
                            ? [{ label: "Reported appointments", value: pt.reportedAppointments, muted: true }]
                            : []),
                        ]}
                        footer={pt.isAnomaly ? pt.anomalyReason : null}
                      />
                    );
                  }}
                />
                <Line
                  type="linear"
                  dataKey="cleanSubMs"
                  name="Submission frontier"
                  stroke={palette.submissionFrontier}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: palette.submissionFrontier, strokeWidth: 0 }}
                  activeDot={{ r: 4.5 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                {hasApptSeries && (
                  <Line
                    type="linear"
                    dataKey="apptMs"
                    name="Appointment WL cohort"
                    stroke={palette.appointmentFrontier}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ r: 2.2, fill: palette.appointmentFrontier, strokeWidth: 0 }}
                    activeDot={{ r: 4.5 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
                {showAnomalies && adapted.flaggedAnomalies.length > 0 && (
                  <Line
                    type="linear"
                    dataKey="outlierSubMs"
                    name="Flagged individual reports"
                    stroke="none"
                    dot={{
                      r: 4,
                      fill: palette.surfaceCard,
                      stroke: palette.anomalyMarker,
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 5.5,
                      fill: palette.surfaceCard,
                      stroke: palette.anomalyMarker,
                      strokeWidth: 2,
                    }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
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
            ? "Queue progression methodology"
            : `Queue progression log (${embassy})`
        }
        subtitle={
          drawerMode === "info"
            ? "Explains how checkpoint observations, individual reports, gaps, and outliers are represented."
            : `${adapted.totalObservations} dated observations in chronological order.`
        }
      >
        {drawerMode === "info" ? (
          <div className="space-y-3 text-[12px] leading-relaxed text-ink-700">
            <div className="rounded-lg border border-line bg-paper-sunk p-3">
              <p className="font-semibold text-ink-900">Why spikes were flagged instead of smoothed</p>
              <p className="mt-1 text-mute">
                Days without structured queue checkpoints fall back to individual timeline reports. A few individual records list zero-day or off-trend waits (for example same-day waiting-list and invite dates). Instead of smoothing the curve or deleting raw data, those individual anomalies are flagged so the primary frontier remains readable while remaining inspectable via the toggle and table.
              </p>
            </div>
            <div className="rounded-lg border border-line bg-paper-sunk p-3">
              <p className="font-semibold text-ink-900">Time scale &amp; missing-data gaps</p>
              <p className="mt-1 text-mute">
                The horizontal axis uses true UTC calendar time rather than evenly spaced categories. Gaps longer than 14 days break the connecting line instead of interpolating across unreported weeks, and genuine backward cohort fluctuations in structured checkpoints are preserved.
              </p>
            </div>
          </div>
        ) : (
          <AnalyticsDataTable
            caption={`Queue progression observations for ${embassy}`}
            rows={[...adapted.rawPoints].reverse()}
            rowKey={(r) => r.obsDate}
            columns={[
              { key: "obs", label: "Observed", render: (r) => formatUtcDayFull(r.obsDate) },
              {
                key: "sub",
                label: "Sub. WL cohort",
                render: (r) => (r.subDate ? formatUtcDayFull(r.subDate) : "—"),
              },
              {
                key: "appt",
                label: "Appt. WL cohort",
                render: (r) => (r.apptDate ? formatUtcDayFull(r.apptDate) : "—"),
              },
              {
                key: "source",
                label: "Source",
                render: (r) =>
                  r.isAnomaly ? (
                    <span className="text-amber-700 dark:text-amber-400">Flagged individual</span>
                  ) : r.source === "individual_report" ? (
                    "Individual report"
                  ) : (
                    "Checkpoint"
                  ),
              },
            ]}
          />
        )}
      </AnalyticsDetailsDrawer>
    </>
  );
}
