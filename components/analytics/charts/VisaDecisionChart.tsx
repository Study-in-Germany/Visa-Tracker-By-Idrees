"use client";

import { useState } from "react";
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
import AnalyticsChartTooltip from "@/components/analytics/shared/AnalyticsChartTooltip";
import AnalyticsDetailsDrawer from "@/components/analytics/shared/AnalyticsDetailsDrawer";
import AnalyticsEmptyState from "@/components/analytics/shared/AnalyticsEmptyState";
import { useAnalyticsChartPalette } from "@/components/analytics/shared/useAnalyticsChartPalette";
import { formatDaysCompact, formatMonthFull, formatMonthShort } from "@/lib/analytics/chart-formatters";
import type {
  AnalyticsDashboardPayload,
  EmbassyDecisionComparison,
} from "@/lib/analytics/dashboard-types";
import type { Embassy } from "@/lib/forecasting/types";

export default function VisaDecisionChart({
  internal,
  externalEmbassy,
  externalComparison,
}: {
  internal: AnalyticsDashboardPayload["internalDecisions"];
  externalEmbassy: Embassy;
  externalComparison: EmbassyDecisionComparison;
}) {
  const palette = useAnalyticsChartPalette();
  const [infoOpen, setInfoOpen] = useState(false);

  const hasInternalDecisions = internal.decided > 0;
  const issuedPct = hasInternalDecisions
    ? Math.round((internal.issued / internal.decided) * 1000) / 10
    : 0;
  const rejectedPct = hasInternalDecisions
    ? Math.round((internal.rejected / internal.decided) * 1000) / 10
    : 0;

  return (
    <>
      <AnalyticsCard
        testId="chart-visa-decisions"
        title="Visa decision outcomes"
        subtitle="Internal tracker cohort strictly separated from external community evidence"
        primaryMetric={
          hasInternalDecisions && internal.approvalRatePct !== null
            ? `${internal.approvalRatePct}%`
            : "0 recorded"
        }
        primaryLabel={
          hasInternalDecisions
            ? `tracker approval (${internal.issued} issued / ${internal.decided} decided)`
            : "internal tracker decisions"
        }
        onInfoClick={() => setInfoOpen(true)}
        footer={
          <span>
            Approval rate = Issued / (Issued + Rejected). Withdrawals ({internal.withdrawn} internal) are excluded from approval denominator.
          </span>
        }
      >
        <div className="space-y-4">
          {/* Population 1: Filtered internal tracker cohort */}
          <div>
            <div className="mb-2 flex items-center justify-between text-[12px]">
              <span className="font-semibold text-ink-900">Internal tracker outcomes</span>
              <span className="tabular-nums text-mute">
                {internal.decided} decided · {internal.withdrawn} withdrawn
              </span>
            </div>

            {!hasInternalDecisions ? (
              <AnalyticsEmptyState
                icon="badgeCheck"
                title="No internal visa decisions recorded yet"
                hint="Approval rate is not calculated until approved tracker applicants record Visa Issued or Visa Rejected outcomes."
                compact
              />
            ) : (
              <div className="space-y-3">
                <div
                  className="flex h-3.5 w-full overflow-hidden rounded-md bg-paper-sunk ring-1 ring-inset ring-line"
                  role="img"
                  aria-label={`Internal decisions: ${internal.issued} issued (${issuedPct}%), ${internal.rejected} rejected (${rejectedPct}%)`}
                >
                  {internal.issued > 0 && (
                    <div
                      style={{ width: `${issuedPct}%`, backgroundColor: palette.semanticIssued }}
                      className="h-full"
                    />
                  )}
                  {internal.rejected > 0 && (
                    <div
                      style={{ width: `${rejectedPct}%`, backgroundColor: palette.semanticRejected }}
                      className="h-full"
                    />
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[12px]">
                  <div className="rounded-lg border border-line bg-paper-sunk/60 px-2.5 py-2">
                    <span className="text-[11px] text-mute">Issued</span>
                    <div className="mt-0.5 font-semibold tabular-nums text-ink-900">
                      {internal.issued} ({issuedPct}%)
                    </div>
                  </div>
                  <div className="rounded-lg border border-line bg-paper-sunk/60 px-2.5 py-2">
                    <span className="text-[11px] text-mute">Rejected</span>
                    <div className="mt-0.5 font-semibold tabular-nums text-ink-900">
                      {internal.rejected} ({rejectedPct}%)
                    </div>
                  </div>
                  <div className="rounded-lg border border-line bg-paper-sunk/60 px-2.5 py-2">
                    <span className="text-[11px] text-mute">Appt → Decision</span>
                    <div className="mt-0.5 font-semibold tabular-nums text-ink-900">
                      {internal.medianDecisionDays !== null
                        ? `${formatDaysCompact(internal.medianDecisionDays)} (n=${internal.decisionDurationSampleSize})`
                        : "—"}
                    </div>
                  </div>
                </div>

                {internal.monthlyOutcomes.length >= 2 && (
                  <AnalyticsChartContainer
                    ariaLabel="Monthly internal visa decisions"
                    minHeight={120}
                  >
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart
                        data={internal.monthlyOutcomes}
                        margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
                      >
                        <CartesianGrid stroke={palette.gridLine} strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickFormatter={formatMonthShort}
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          stroke={palette.axisText}
                        />
                        <YAxis
                          allowDecimals={false}
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          stroke={palette.axisText}
                        />
                        <Tooltip
                          cursor={{ fill: palette.surfaceSunk }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const r = payload[0].payload as { month: string; issued: number; rejected: number };
                            return (
                              <AnalyticsChartTooltip
                                title={formatMonthFull(r.month)}
                                rows={[
                                  { label: "Issued", value: r.issued, color: palette.semanticIssued },
                                  { label: "Rejected", value: r.rejected, color: palette.semanticRejected },
                                ]}
                              />
                            );
                          }}
                        />
                        <Bar dataKey="issued" stackId="d" fill={palette.semanticIssued} isAnimationActive={false} />
                        <Bar dataKey="rejected" stackId="d" fill={palette.semanticRejected} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </AnalyticsChartContainer>
                )}
              </div>
            )}
          </div>

          {/* Population 2: External historical community evidence (kept strictly separate) */}
          <div className="rounded-lg border border-line bg-paper-sunk/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-ink-900">
                External community evidence ({externalEmbassy})
              </span>
              <span className="rounded border border-line bg-paper-raised px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-mute">
                n={externalComparison.externalDecidedCount} decided
              </span>
            </div>

            {externalComparison.externalDecidedCount === 0 ? (
              <p className="mt-1.5 text-[12px] text-mute">
                No external historical visa decisions recorded for {externalEmbassy}.
              </p>
            ) : (
              <div className="mt-2 space-y-1.5 text-[12px]">
                <div className="flex flex-wrap items-center justify-between gap-2 tabular-nums">
                  <span className="text-ink-700">
                    {externalComparison.externalApprovedCount} issued ·{" "}
                    {externalComparison.externalRejectedCount} rejected
                    {externalComparison.externalWithdrawnCount > 0
                      ? ` · ${externalComparison.externalWithdrawnCount} withdrawn`
                      : ""}
                  </span>
                  <span className="font-semibold text-ink-900">
                    {externalComparison.externalDecisionMedianDays !== null
                      ? `~${formatDaysCompact(externalComparison.externalDecisionMedianDays)} post-interview (n=${externalComparison.externalDecisionSampleSize})`
                      : "Wait unavailable"}
                  </span>
                </div>
                {externalComparison.externalDecidedCount < 10 && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Small external sample (n={externalComparison.externalDecidedCount}) — shown as historical context only, not a tracker-wide approval rate.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </AnalyticsCard>

      <AnalyticsDetailsDrawer
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="Decision statistics & populations"
        subtitle="Why internal tracker decisions and external community evidence are never merged into one approval rate."
      >
        <div className="space-y-3 text-[12px] leading-relaxed text-ink-700">
          <div className="rounded-lg border border-line bg-paper-sunk p-3">
            <p className="font-semibold text-ink-900">Population separation</p>
            <p className="mt-1 text-mute">
              External historical timelines often come from applicants who voluntarily shared completed outcomes after receiving a visa, creating survivorship/reporting bias if merged with active tracker cohorts. Keeping internal tracker decisions separate prevents a handful of external reports from appearing as the approval rate of the whole tracker.
            </p>
          </div>
        </div>
      </AnalyticsDetailsDrawer>
    </>
  );
}
