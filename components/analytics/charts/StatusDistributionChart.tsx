"use client";

import { useState } from "react";
import AnalyticsCard from "@/components/analytics/layout/AnalyticsCard";
import AnalyticsDataTable from "@/components/analytics/shared/AnalyticsDataTable";
import AnalyticsDetailsDrawer from "@/components/analytics/shared/AnalyticsDetailsDrawer";
import AnalyticsEmptyState from "@/components/analytics/shared/AnalyticsEmptyState";
import { ANALYTICS_STATUS_META } from "@/lib/analytics/chart-tokens";
import { formatSharePct } from "@/lib/analytics/chart-formatters";
import type { StatusDistributionRow } from "@/lib/analytics/dashboard-types";

export default function StatusDistributionChart({
  rows,
  total,
  activeApplicants,
  completedCases,
  activeStatus,
  onSelectStatus,
}: {
  rows: StatusDistributionRow[];
  total: number;
  activeApplicants: number;
  completedCases: number;
  activeStatus: string;
  onSelectStatus: (status: string) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <AnalyticsCard
        testId="chart-status-distribution"
        title="Application status distribution"
        subtitle="Current stage share across the filtered internal cohort"
        primaryMetric={total > 0 ? formatSharePct(activeApplicants, total) : "0%"}
        primaryLabel={
          total > 0
            ? `active (${activeApplicants.toLocaleString("en-US")} active · ${completedCases.toLocaleString("en-US")} terminal)`
            : "active"
        }
        onViewDataClick={() => setDrawerOpen(true)}
        footer={
          <span>
            Shares use all {total.toLocaleString("en-US")} filtered internal applicants as denominator (excludes external community records).
          </span>
        }
      >
        {total === 0 || rows.length === 0 ? (
          <AnalyticsEmptyState
            icon="layers"
            title="No status breakdown available"
            hint="Widen your filters to inspect applicant statuses."
            compact
          />
        ) : (
          <div className="space-y-4">
            {/* Stacked horizontal distribution bar */}
            <div
              className="flex h-3.5 w-full overflow-hidden rounded-md bg-paper-sunk ring-1 ring-inset ring-line"
              role="img"
              aria-label="Stacked horizontal status distribution bar"
            >
              {rows.map((r) => {
                const widthPct = Math.max(0.8, (r.count / total) * 100);
                const dimmed = Boolean(activeStatus && activeStatus !== r.status);
                return (
                  <button
                    key={r.status}
                    type="button"
                    onClick={() => onSelectStatus(r.status)}
                    title={`${ANALYTICS_STATUS_META.labels[r.status] ?? r.status}: ${r.count} (${r.sharePct}%)`}
                    aria-label={`${ANALYTICS_STATUS_META.labels[r.status] ?? r.status}: ${r.count} (${r.sharePct}%)`}
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: ANALYTICS_STATUS_META.hex[r.status] ?? "#94a3b8",
                      opacity: dimmed ? 0.35 : 1,
                    }}
                    className="h-full transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink-900"
                  />
                );
              })}
            </div>

            {/* Horizontal comparison rows */}
            <div className="space-y-2">
              {rows.map((r) => {
                const label = ANALYTICS_STATUS_META.labels[r.status] ?? r.status;
                const color = ANALYTICS_STATUS_META.hex[r.status] ?? "#94a3b8";
                const barWidth = Math.max(2, (r.count / total) * 100);
                const selected = activeStatus === r.status;
                return (
                  <button
                    key={r.status}
                    type="button"
                    onClick={() => onSelectStatus(r.status)}
                    aria-pressed={selected}
                    className={`group flex w-full flex-col gap-1 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[rgb(var(--hover))] ${
                      selected ? "bg-paper-sunk ring-1 ring-line-strong" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        <span className="truncate font-medium text-ink-900">{label}</span>
                        {r.isTerminal && (
                          <span className="rounded border border-line bg-paper-sunk px-1.5 py-0 text-[10px] font-medium text-mute">
                            Terminal
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 tabular-nums">
                        <span className="font-semibold text-ink-900">
                          {r.count.toLocaleString("en-US")}
                        </span>
                        <span className="w-12 text-right text-[12px] text-mute">
                          {r.sharePct}%
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-sunk">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${barWidth}%`, backgroundColor: color }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </AnalyticsCard>

      <AnalyticsDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Application status breakdown"
        subtitle={`Denominator: ${total.toLocaleString("en-US")} approved internal tracker applicants matching active filters.`}
      >
        <AnalyticsDataTable
          caption="Application status distribution"
          rows={rows}
          rowKey={(r) => r.status}
          columns={[
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: ANALYTICS_STATUS_META.hex[r.status] ?? "#94a3b8" }}
                  />
                  {ANALYTICS_STATUS_META.labels[r.status] ?? r.status}
                </span>
              ),
            },
            {
              key: "category",
              label: "Group",
              render: (r) => (r.isTerminal ? "Terminal outcome" : r.isActive ? "Active queue" : "Other"),
            },
            { key: "count", label: "Count", align: "right", render: (r) => r.count },
            { key: "share", label: "Share", align: "right", render: (r) => `${r.sharePct}%` },
          ]}
        />
      </AnalyticsDetailsDrawer>
    </>
  );
}
