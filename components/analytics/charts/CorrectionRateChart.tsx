"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import AnalyticsCard from "@/components/analytics/layout/AnalyticsCard";
import AnalyticsChartContainer from "@/components/analytics/shared/AnalyticsChartContainer";
import AnalyticsChartTooltip from "@/components/analytics/shared/AnalyticsChartTooltip";
import AnalyticsDetailsDrawer from "@/components/analytics/shared/AnalyticsDetailsDrawer";
import AnalyticsInsufficientData from "@/components/analytics/shared/AnalyticsInsufficientData";
import { useAnalyticsChartPalette } from "@/components/analytics/shared/useAnalyticsChartPalette";
import { formatDaysCompact } from "@/lib/analytics/chart-formatters";
import type { CorrectionAnalyticsStats } from "@/lib/analytics/dashboard-types";
import { adaptCorrectionView } from "@/lib/analytics/presentation-adapter";
import type { Embassy } from "@/lib/forecasting/types";

export default function CorrectionRateChart({
  embassy,
  corrections,
}: {
  embassy: Embassy;
  corrections: CorrectionAnalyticsStats;
}) {
  const palette = useAnalyticsChartPalette();
  const [infoOpen, setInfoOpen] = useState(false);

  const view = useMemo(() => adaptCorrectionView(corrections), [corrections]);

  const donutData = [
    {
      name: "Received correction",
      value: view.applicantsWithCorrection,
      color: palette.semanticCorrection,
    },
    {
      name: "No correction recorded",
      value: view.withoutCorrection,
      color: palette.rangeBand,
    },
  ];

  return (
    <>
      <AnalyticsCard
        testId="chart-correction-rate"
        title={`Document corrections (${embassy})`}
        subtitle="Applicants receiving corrections vs. total correction events"
        primaryMetric={
          view.correctionRatePct !== null ? `${view.correctionRatePct}%` : "Unavailable"
        }
        primaryLabel={
          view.hasSufficientDenominator
            ? `${view.applicantsWithCorrection} of ${view.eligibleSubmissionsCount} submissions`
            : `insufficient submissions (n=${view.eligibleSubmissionsCount})`
        }
        onInfoClick={() => setInfoOpen(true)}
        footer={
          <span>
            Denominator: {view.eligibleSubmissionsCount} submitted applications ({embassy} combined evidence).
          </span>
        }
      >
        {!view.hasSufficientDenominator ? (
          <AnalyticsInsufficientData
            title="Too few submitted applications"
            detail="At least 5 eligible submissions are required to calculate a meaningful correction rate."
            sampleSize={view.eligibleSubmissionsCount}
            minimumRequired={5}
          />
        ) : (
          <div className="space-y-4">
            <div className="relative mx-auto h-[146px] w-full max-w-[190px]">
              <AnalyticsChartContainer
                ariaLabel={`Correction rate donut chart for ${embassy}: ${view.correctionRatePct}%`}
                srSummary={`${view.applicantsWithCorrection} of ${view.eligibleSubmissionsCount} applicants received at least one correction (${view.totalCorrectionEvents} total correction events).`}
                minHeight={146}
              >
                <ResponsiveContainer width="100%" height={146}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={44}
                      outerRadius={62}
                      paddingAngle={2}
                      stroke={palette.surfaceCard}
                      strokeWidth={2}
                      isAnimationActive={false}
                    >
                      {donutData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload as (typeof donutData)[number];
                        return (
                          <AnalyticsChartTooltip
                            title={row.name}
                            rows={[
                              { label: "Applicants", value: row.value, color: row.color },
                              {
                                label: "Share",
                                value: `${Math.round((row.value / view.eligibleSubmissionsCount) * 1000) / 10}%`,
                              },
                            ]}
                          />
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </AnalyticsChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[20px] font-bold leading-none tabular-nums text-ink-900">
                  {view.applicantsWithCorrection}/{view.eligibleSubmissionsCount}
                </span>
                <span className="mt-0.5 text-[10px] font-medium text-mute">Applicants</span>
              </div>
            </div>

            <dl className="divide-y divide-line border-t border-line text-[12px]">
              <div className="flex items-center justify-between py-2">
                <dt className="text-mute">Applicants w/ correction</dt>
                <dd className="font-semibold tabular-nums text-ink-900">
                  {view.applicantsWithCorrection} ({view.correctionRatePct}%)
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-mute">Total correction events</dt>
                <dd className="font-semibold tabular-nums text-ink-900">
                  {view.totalCorrectionEvents}
                  {view.repeatCorrectionEvents > 0 && (
                    <span className="ml-1 font-normal text-mute">
                      (+{view.repeatCorrectionEvents} repeat)
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-mute">Post-correction wait</dt>
                <dd className="font-semibold tabular-nums text-ink-900">
                  {view.hasSufficientPostCorrection && view.postCorrectionMedianDays !== null ? (
                    `${formatDaysCompact(view.postCorrectionMedianDays)} (n=${view.postCorrectionSampleSize})`
                  ) : (
                    <span className="font-normal text-mute">
                      Limited data (n={view.postCorrectionSampleSize}/5)
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </AnalyticsCard>

      <AnalyticsDetailsDrawer
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="Correction metrics methodology"
        subtitle="Separates distinct applicants affected by corrections from total correction cycles."
      >
        <div className="space-y-3 text-[12px] leading-relaxed text-ink-700">
          <div className="rounded-lg border border-line bg-paper-sunk p-3">
            <p className="font-semibold text-ink-900">Applicants vs. correction events</p>
            <p className="mt-1 text-mute">
              A single submitted application can receive multiple correction requests. The correction rate divides distinct applicants who received at least one correction ({view.applicantsWithCorrection}) by eligible submitted applications ({view.eligibleSubmissionsCount}). Total events ({view.totalCorrectionEvents}) are tracked separately so repeat corrections never inflate the applicant rate above true share.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-paper-sunk p-3">
            <p className="font-semibold text-ink-900">Post-correction resolution window</p>
            <p className="mt-1 text-mute">
              Measures days from the last submitted correction response to appointment invitation. Requires at least 5 dated observations before surfacing a median so small samples do not suggest false precision.
            </p>
          </div>
        </div>
      </AnalyticsDetailsDrawer>
    </>
  );
}
