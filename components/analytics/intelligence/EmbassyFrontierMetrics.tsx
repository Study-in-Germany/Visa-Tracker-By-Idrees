"use client";

import Icon from "@/components/ui/Icon";
import { formatDisplayDate, formatWeeklyDays } from "@/lib/analytics/formatters";
import type { AnalyticsEmbassyIntelligence } from "@/lib/analytics/dashboard-types";

export default function EmbassyFrontierMetrics({
  report,
  onOpenEvidence,
}: {
  report: AnalyticsEmbassyIntelligence;
  onOpenEvidence: () => void;
}) {
  const sub = report.frontiers.submission;
  const apptSub = report.frontiers.appointmentBySubmission;
  const apptWl = report.frontiers.appointmentByWaitingList;
  const vel = report.velocity;

  const hasSub = Boolean(sub.combinedFrontierDate && sub.sampleSize > 0);
  const hasApptSub = Boolean(apptSub.combinedFrontierDate && apptSub.sampleSize > 0);
  const paceStr = formatWeeklyDays(vel.weightedWeeklyDays);

  const metrics = [
    {
      key: "sub",
      label: "Submission invitation frontier",
      value: hasSub ? formatDisplayDate(sub.combinedFrontierDate) : "Unavailable",
      eventCaption: "Waiting-list joining date currently receiving invites",
      meta: hasSub
        ? sub.internalLatestCohort && sub.internalLatestCohort !== sub.combinedFrontierDate
          ? `Tracker cohort: ${formatDisplayDate(sub.internalLatestCohort)}`
          : `${sub.sampleSize} recent obs.`
        : "Insufficient verified observations",
    },
    {
      key: "appt",
      label: "Appointment invitation frontier",
      value: hasApptSub ? formatDisplayDate(apptSub.combinedFrontierDate) : "Unavailable",
      eventCaption: "Document submission date currently getting appointments",
      meta: apptWl.combinedFrontierDate
        ? `WL cohort at appointments: ${formatDisplayDate(apptWl.combinedFrontierDate)}`
        : "Insufficient appointment observations",
    },
    {
      key: "vel",
      label: "Weekly queue movement",
      value: paceStr ? `${paceStr} / wk` : "Unavailable",
      eventCaption: "Weighted cohort advancement pace (7d / 30d / 90d)",
      meta: vel.isStalled
        ? "Recent movement appears slow or paused"
        : sub.hasConflict && sub.conflictSummary
          ? sub.conflictSummary
          : "Community-derived pace · Not official",
      warn: vel.isStalled || sub.hasConflict,
    },
  ];

  return (
    <div className="rounded-xl border border-line bg-card">
      <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
        {metrics.map((m) => (
          <div key={m.key} className="flex flex-col justify-between p-4 sm:p-5">
            <div>
              <p className="text-[12px] font-medium text-mute">{m.label}</p>
              <p className="mt-1.5 text-[24px] font-bold leading-tight tracking-tight text-ink-900 tabular-nums sm:text-[28px]">
                {m.value}
              </p>
              <p className="mt-1 text-[12px] text-ink-700">{m.eventCaption}</p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/70 pt-2.5 text-[11px]">
              <span
                className={`flex min-w-0 items-center gap-1.5 ${
                  m.warn ? "text-amber-700 dark:text-amber-400" : "text-mute"
                }`}
              >
                {m.warn && <Icon name="alert" size={12} className="shrink-0" />}
                <span className="truncate">{m.meta}</span>
              </span>
              <button
                type="button"
                onClick={onOpenEvidence}
                className="shrink-0 font-medium text-ink-700 underline-offset-2 hover:text-ink-900 hover:underline"
              >
                Evidence
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
