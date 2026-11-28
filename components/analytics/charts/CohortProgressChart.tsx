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
import { formatMonthFull, formatMonthShort } from "@/lib/analytics/chart-formatters";
import { ANALYTICS_STATUS_META } from "@/lib/analytics/chart-tokens";
import type { CohortProgressItem } from "@/lib/analytics/dashboard-types";
import { adaptCohortMatrix, type CohortChartRow } from "@/lib/analytics/presentation-adapter";
import type { Embassy } from "@/lib/forecasting/types";
import CohortHeatmap from "./CohortHeatmap";

const COHORT_SERIES = [
  { key: "waitingList", pctKey: "waitingListPct", label: "Waiting list", color: ANALYTICS_STATUS_META.hex.WAITING_LIST },
  { key: "submissionInvited", pctKey: "submissionInvitedPct", label: "Sub. invite", color: ANALYTICS_STATUS_META.hex.WAITING_FOR_SUBMISSION },
  { key: "documentsSubmitted", pctKey: "documentsSubmittedPct", label: "Docs submitted", color: ANALYTICS_STATUS_META.hex.SUBMISSION_RECEIVED },
  { key: "appointmentStage", pctKey: "appointmentStagePct", label: "Appointment", color: ANALYTICS_STATUS_META.hex.APPOINTMENT_SCHEDULED },
  { key: "visaIssued", pctKey: "visaIssuedPct", label: "Visa issued", color: ANALYTICS_STATUS_META.hex.VISA_ISSUED },
  { key: "visaRejected", pctKey: "visaRejectedPct", label: "Rejected", color: ANALYTICS_STATUS_META.hex.VISA_REJECTED },
  { key: "withdrawn", pctKey: "withdrawnPct", label: "Withdrawn", color: ANALYTICS_STATUS_META.hex.WITHDRAWN },
] as const;

export default function CohortProgressChart({
  embassy,
  data,
}: {
  embassy: Embassy;
  data: CohortProgressItem[];
}) {
  const palette = useAnalyticsChartPalette();
  const [view, setView] = useState<"bars" | "matrix">("bars");
  const [scale, setScale] = useState<"count" | "percent">("count");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const rows = useMemo(() => adaptCohortMatrix(data), [data]);
  const selectedRow = useMemo(
    () => rows.find((r) => r.month === selectedMonth) ?? rows[rows.length - 1] ?? null,
    [rows, selectedMonth]
  );

  return (
    <>
      <AnalyticsCard
        testId="chart-cohort-progress"
        title={`Cohort progress by joining month (${embassy})`}
        subtitle="Current mutually exclusive status across internal waiting-list cohorts"
        onViewDataClick={() => setDrawerOpen(true)}
        controls={
          <div className="flex flex-wrap items-center gap-1.5">
            <div
              role="group"
              aria-label="Cohort metric mode"
              className="inline-flex rounded-lg border border-line bg-paper-sunk p-0.5 text-[11px]"
            >
              {[
                { id: "count" as const, label: "Counts" },
                { id: "percent" as const, label: "% Share" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={scale === opt.id}
                  onClick={() => setScale(opt.id)}
                  className={`rounded-md px-2 py-1 font-medium transition-colors ${
                    scale === opt.id
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
              aria-label="Cohort visualization type"
              className="inline-flex rounded-lg border border-line bg-paper-sunk p-0.5 text-[11px]"
            >
              {[
                { id: "bars" as const, label: "Bars" },
                { id: "matrix" as const, label: "Matrix" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={view === opt.id}
                  onClick={() => setView(opt.id)}
                  className={`rounded-md px-2 py-1 font-medium transition-colors ${
                    view === opt.id
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
          <AnalyticsChartLegend
            items={COHORT_SERIES.map((s) => ({
              key: s.key,
              label: s.label,
              color: s.color,
            }))}
          />
        }
      >
        {rows.length === 0 ? (
          <AnalyticsEmptyState
            icon="layers"
            title="No joining-month cohorts available"
            hint={`No internal dated waiting-list entries for ${embassy} yet.`}
            compact
          />
        ) : (
          <div className="space-y-3">
            {view === "matrix" ? (
              <CohortHeatmap
                rows={rows}
                mode={scale}
                selectedMonth={selectedRow?.month ?? null}
                onSelectMonth={setSelectedMonth}
              />
            ) : (
              <AnalyticsChartContainer
                ariaLabel={`Cohort status breakdown by waiting-list month for ${embassy}`}
                srSummary={`${rows.length} joining-month cohorts shown as ${scale === "percent" ? "percentage shares" : "applicant counts"}.`}
                minHeight={250}
              >
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={rows}
                    margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                    onClick={(state) => {
                      const row = state?.activePayload?.[0]?.payload as CohortChartRow | undefined;
                      if (row) setSelectedMonth(row.month);
                    }}
                  >
                    <CartesianGrid stroke={palette.gridLine} strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonthShort}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      stroke={palette.axisText}
                      minTickGap={22}
                    />
                    <YAxis
                      allowDecimals={false}
                      domain={scale === "percent" ? [0, 100] : [0, "auto"]}
                      tickFormatter={(v) => (scale === "percent" ? `${v}%` : String(v))}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      stroke={palette.axisText}
                    />
                    <Tooltip
                      cursor={{ fill: palette.surfaceSunk }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload as CohortChartRow;
                        return (
                          <AnalyticsChartTooltip
                            title={`Joined ${formatMonthFull(row.month)}`}
                            subtitle={`${row.total} internal applicants`}
                            rows={COHORT_SERIES.filter((s) => row[s.key] > 0).map((s) => ({
                              label: s.label,
                              value: `${row[s.key]} (${row[s.pctKey]}%)`,
                              color: s.color,
                            }))}
                          />
                        );
                      }}
                    />
                    {COHORT_SERIES.map((s) => (
                      <Bar
                        key={s.key}
                        dataKey={scale === "percent" ? s.pctKey : s.key}
                        stackId="cohort"
                        name={s.label}
                        fill={s.color}
                        isAnimationActive={false}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </AnalyticsChartContainer>
            )}

            {/* Mobile & touch inspection panel */}
            {selectedRow && (
              <div className="rounded-lg border border-line bg-paper-sunk/60 px-3 py-2 text-[12px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink-900">
                    {formatMonthFull(selectedRow.month)} cohort · {selectedRow.total} applicants
                  </span>
                  <div className="flex flex-wrap gap-1 md:hidden">
                    <select
                      aria-label="Inspect cohort month"
                      value={selectedRow.month}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="rounded border border-line bg-paper-raised px-2 py-0.5 text-[11px] font-medium text-ink-900"
                    >
                      {rows.map((r) => (
                        <option key={r.month} value={r.month}>
                          {formatMonthShort(r.month)} ({r.total})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] tabular-nums text-ink-700">
                  {COHORT_SERIES.filter((s) => selectedRow[s.key] > 0).map((s) => (
                    <span key={s.key} className="inline-flex items-center gap-1">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                        aria-hidden="true"
                      />
                      {s.label}: <strong>{selectedRow[s.key]}</strong> ({selectedRow[s.pctKey]}%)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </AnalyticsCard>

      <AnalyticsDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`Cohort table (${embassy})`}
        subtitle="Internal approved applicants grouped by waiting-list joining month."
      >
        <AnalyticsDataTable
          caption={`Cohort breakdown for ${embassy}`}
          rows={[...rows].reverse()}
          rowKey={(r) => r.month}
          columns={[
            { key: "month", label: "WL Month", render: (r) => formatMonthFull(r.month) },
            { key: "total", label: "Total", align: "right", render: (r) => r.total },
            { key: "wl", label: "Waiting", align: "right", render: (r) => r.waitingList },
            { key: "inv", label: "Invited", align: "right", render: (r) => r.submissionInvited },
            { key: "sub", label: "Submitted", align: "right", render: (r) => r.documentsSubmitted },
            { key: "appt", label: "Appt.", align: "right", render: (r) => r.appointmentStage },
            { key: "dec", label: "Issued", align: "right", render: (r) => r.visaIssued },
          ]}
        />
      </AnalyticsDetailsDrawer>
    </>
  );
}
