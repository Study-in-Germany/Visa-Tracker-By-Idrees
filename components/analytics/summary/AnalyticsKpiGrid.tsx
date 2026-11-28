"use client";

import type { AnalyticsDashboardPayload } from "@/lib/analytics/dashboard-types";
import { formatDaysCompact, formatSharePct } from "@/lib/analytics/chart-formatters";
import AnalyticsKpiCard from "./AnalyticsKpiCard";

export default function AnalyticsKpiGrid({
  data,
}: {
  data: AnalyticsDashboardPayload;
}) {
  const s = data.summary;
  const monthlySpark = data.activity.monthlyByJoinDate.map((m) => m.total);

  const activeShare =
    s.total > 0 ? `${formatSharePct(s.activeApplicants, s.total)} of cohort` : "No entries";

  const decisionValue =
    s.decidedCases === 0
      ? "0"
      : s.approvalRatePct !== null
        ? `${s.approvalRatePct}%`
        : `${s.visaIssued}/${s.decidedCases}`;

  const decisionSublabel =
    s.decidedCases === 0
      ? s.withdrawn > 0
        ? `No decisions · ${s.withdrawn} withdrawn`
        : "No internal decisions recorded"
      : `${s.visaIssued} issued · ${s.visaRejected} rejected${
          s.withdrawn > 0 ? ` · ${s.withdrawn} w/d` : ""
        }`;

  const waitValue =
    s.medianWaitDays !== null ? formatDaysCompact(s.medianWaitDays) : "Unavailable";
  const waitSublabel =
    s.waitSampleSize > 0
      ? `WL → Invite · n=${s.waitSampleSize} (P25–P75: ${s.waitP25Days}–${s.waitP75Days}d)`
      : "No paired WL → invite dates";

  return (
    <section
      aria-label="Key metrics"
      data-testid="analytics-kpi-grid"
      className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4"
    >
      <AnalyticsKpiCard
        testId="kpi-tracked-applicants"
        label="Tracked applicants"
        value={s.total.toLocaleString("en-US")}
        sublabel={`${s.withWaitingListDate.toLocaleString("en-US")} with WL date`}
        icon="users"
        sparklineValues={monthlySpark}
      />

      <AnalyticsKpiCard
        testId="kpi-active-applications"
        label="Active applications"
        value={s.activeApplicants.toLocaleString("en-US")}
        sublabel={activeShare}
        icon="hourglass"
      />

      <AnalyticsKpiCard
        testId="kpi-median-wait"
        label="Median invite wait"
        value={waitValue}
        sublabel={waitSublabel}
        icon="clock"
      />

      <AnalyticsKpiCard
        testId="kpi-visa-decisions"
        label={s.decidedCases > 0 ? "Tracker approval rate" : "Visa decisions"}
        value={decisionValue}
        sublabel={decisionSublabel}
        icon="badgeCheck"
      />
    </section>
  );
}
