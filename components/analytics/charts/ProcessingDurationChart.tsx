"use client";

import { useState } from "react";
import AnalyticsCard from "@/components/analytics/layout/AnalyticsCard";
import AnalyticsDataTable from "@/components/analytics/shared/AnalyticsDataTable";
import AnalyticsDetailsDrawer from "@/components/analytics/shared/AnalyticsDetailsDrawer";
import { useAnalyticsChartPalette } from "@/components/analytics/shared/useAnalyticsChartPalette";
import { formatDaysCompact } from "@/lib/analytics/chart-formatters";
import type { ProcessingStageStat } from "@/lib/analytics/dashboard-types";

export default function ProcessingDurationChart({
  stages,
  observedEndToEnd,
}: {
  stages: ProcessingStageStat[];
  observedEndToEnd: {
    sampleSize: number;
    medianDays: number | null;
    p25Days: number | null;
    p75Days: number | null;
    available: boolean;
  };
}) {
  const palette = useAnalyticsChartPalette();
  const [drawerMode, setDrawerMode] = useState<"data" | "info" | null>(null);

  // Shared days scale across all three stage tracks
  const maxScaleDays = Math.max(
    60,
    ...stages.map((s) => s.p75Days ?? s.medianDays ?? 0)
  );
  const scaleCeil = Math.ceil(maxScaleDays / 30) * 30;
  const ticks = [0, Math.round(scaleCeil * 0.25), Math.round(scaleCeil * 0.5), Math.round(scaleCeil * 0.75), scaleCeil];

  const primaryStage = stages[0];

  return (
    <>
      <AnalyticsCard
        testId="chart-processing-durations"
        title="Processing durations by stage"
        subtitle="Median wait and middle 50% range (P25–P75) on a shared time scale"
        primaryMetric={
          primaryStage?.available && primaryStage.medianDays !== null
            ? formatDaysCompact(primaryStage.medianDays)
            : "Unavailable"
        }
        primaryLabel={
          primaryStage?.available
            ? `median WL → invite (n=${primaryStage.sampleSize})`
            : "insufficient paired dates"
        }
        onInfoClick={() => setDrawerMode("info")}
        onViewDataClick={() => setDrawerMode("data")}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Observed end-to-end (WL → Decision):{" "}
              {observedEndToEnd.available && observedEndToEnd.medianDays !== null ? (
                <strong className="text-ink-900">
                  {formatDaysCompact(observedEndToEnd.medianDays)} (n={observedEndToEnd.sampleSize})
                </strong>
              ) : (
                <span>Unavailable (requires decided internal cases)</span>
              )}
            </span>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Shared scale axis header */}
          <div className="hidden items-center justify-between border-b border-line pb-1.5 text-[11px] text-mute tabular-nums sm:flex">
            {ticks.map((t) => (
              <span key={t}>{t}d</span>
            ))}
          </div>

          <div className="space-y-4">
            {stages.map((st) => {
              const p25Pct =
                st.available && st.p25Days !== null
                  ? Math.max(0, Math.min(100, (st.p25Days / scaleCeil) * 100))
                  : 0;
              const p75Pct =
                st.available && st.p75Days !== null
                  ? Math.max(p25Pct + 1.5, Math.min(100, (st.p75Days / scaleCeil) * 100))
                  : 0;
              const medPct =
                st.available && st.medianDays !== null
                  ? Math.max(1, Math.min(99, (st.medianDays / scaleCeil) * 100))
                  : 0;

              return (
                <div key={st.id} className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[13px] font-medium text-ink-900">{st.label}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[12px] tabular-nums">
                      {st.available && st.medianDays !== null ? (
                        <>
                          <span className="font-semibold text-ink-900">
                            {formatDaysCompact(st.medianDays)}
                          </span>
                          {st.p25Days !== null && st.p75Days !== null && (
                            <span className="text-mute">
                              ({st.p25Days}–{st.p75Days}d IQR · n={st.sampleSize})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-mute">{st.note ?? "Unavailable"}</span>
                      )}
                    </div>
                  </div>

                  {/* Horizontal shared-scale track */}
                  <div
                    className="relative h-5 w-full rounded-md bg-paper-sunk ring-1 ring-inset ring-line"
                    role="img"
                    aria-label={
                      st.available
                        ? `${st.label}: median ${st.medianDays} days, P25 to P75 ${st.p25Days} to ${st.p75Days} days, sample size ${st.sampleSize}`
                        : `${st.label}: unavailable`
                    }
                  >
                    {/* Faint scale grid lines */}
                    {[25, 50, 75].map((pct) => (
                      <span
                        key={pct}
                        aria-hidden="true"
                        style={{ left: `${pct}%` }}
                        className="absolute inset-y-0 w-px bg-line/70"
                      />
                    ))}

                    {st.available && st.medianDays !== null ? (
                      <>
                        {/* Base bar from 0 to median */}
                        <div
                          className="absolute inset-y-1.5 left-0 rounded-r-sm opacity-25"
                          style={{
                            width: `${medPct}%`,
                            backgroundColor: palette.primarySeries,
                          }}
                        />
                        {/* IQR range P25-P75 */}
                        <div
                          className="absolute inset-y-1 rounded-sm"
                          style={{
                            left: `${p25Pct}%`,
                            width: `${Math.max(1.5, p75Pct - p25Pct)}%`,
                            backgroundColor: palette.secondarySeries,
                            opacity: 0.45,
                          }}
                        />
                        {/* Median marker */}
                        <div
                          className="absolute top-0.5 bottom-0.5 w-1 -translate-x-1/2 rounded-full"
                          style={{
                            left: `${medPct}%`,
                            backgroundColor: palette.medianMarker,
                          }}
                        />
                      </>
                    ) : (
                      <div className="flex h-full items-center px-2.5 text-[11px] text-mute">
                        Unavailable
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-mute">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-1 rounded-full bg-ink-900" aria-hidden="true" />
              Median (P50)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-4 rounded-sm bg-ink-600/40" aria-hidden="true" />
              Central 50% (P25–P75)
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              Shared scale: 0–{scaleCeil} days
            </span>
          </div>
        </div>
      </AnalyticsCard>

      <AnalyticsDetailsDrawer
        open={drawerMode !== null}
        onClose={() => setDrawerMode(null)}
        title={drawerMode === "info" ? "Stage duration methodology" : "Stage duration breakdown"}
        subtitle="Computed directly from paired milestone dates in the filtered internal cohort; stage averages are never summed into an artificial end-to-end wait."
      >
        {drawerMode === "info" ? (
          <div className="space-y-3 text-[12px] leading-relaxed text-ink-700">
            {stages.map((st) => (
              <div key={st.id} className="rounded-lg border border-line bg-paper-sunk p-3">
                <p className="font-semibold text-ink-900">{st.label}</p>
                <p className="mt-1 text-mute">{st.definition}</p>
              </div>
            ))}
            <div className="rounded-lg border border-line bg-paper-sunk p-3">
              <p className="font-semibold text-ink-900">Why total wait is not summed</p>
              <p className="mt-1 text-mute">
                Because different applicants reach different stages, summing separate stage medians across disjoint samples is statistically invalid. Observed end-to-end wait is reported separately only for completed cases with both waiting-list and decision dates.
              </p>
            </div>
          </div>
        ) : (
          <AnalyticsDataTable
            caption="Processing durations by stage"
            rows={stages}
            rowKey={(r) => r.id}
            columns={[
              { key: "stage", label: "Transition", render: (r) => r.shortLabel },
              {
                key: "median",
                label: "Median",
                align: "right",
                render: (r) => (r.medianDays !== null ? `${r.medianDays}d` : "—"),
              },
              {
                key: "iqr",
                label: "P25–P75",
                align: "right",
                render: (r) =>
                  r.p25Days !== null && r.p75Days !== null ? `${r.p25Days}–${r.p75Days}d` : "—",
              },
              {
                key: "minmax",
                label: "Min–Max",
                align: "right",
                render: (r) =>
                  r.minDays !== null && r.maxDays !== null ? `${r.minDays}–${r.maxDays}d` : "—",
              },
              { key: "n", label: "n", align: "right", render: (r) => r.sampleSize },
            ]}
          />
        )}
      </AnalyticsDetailsDrawer>
    </>
  );
}
