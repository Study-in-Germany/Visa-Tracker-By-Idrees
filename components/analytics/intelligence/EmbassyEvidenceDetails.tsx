"use client";

import AnalyticsDetailsDrawer from "@/components/analytics/shared/AnalyticsDetailsDrawer";
import {
  formatConfidenceLabel,
  formatDisplayDate,
  formatWeeklyDays,
} from "@/lib/analytics/formatters";
import type { AnalyticsEmbassyIntelligence } from "@/lib/analytics/dashboard-types";

export default function EmbassyEvidenceDetails({
  open,
  onClose,
  report,
  modelVersion,
  datasetSummary,
}: {
  open: boolean;
  onClose: () => void;
  report: AnalyticsEmbassyIntelligence;
  modelVersion: string;
  datasetSummary: {
    internalApprovedCount: number;
    externalTimelineCount: number;
    combinedDeduplicatedCount: number;
    queueObservationsCount: number;
  };
}) {
  const sub = report.frontiers.submission;
  const apptSub = report.frontiers.appointmentBySubmission;
  const apptWl = report.frontiers.appointmentByWaitingList;
  const vel = report.velocity;

  return (
    <AnalyticsDetailsDrawer
      open={open}
      onClose={onClose}
      title={`${report.embassy} intelligence evidence`}
      subtitle="Community-derived queue frontier & velocity diagnostics. Not an official German embassy announcement."
    >
      <div className="space-y-4 text-[12px] text-ink-700">
        <div className="rounded-lg border border-line bg-paper-sunk p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-ink-900">Combined evidence corpus</span>
            <span className="rounded border border-line bg-paper-raised px-2 py-0.5 text-[11px] font-medium">
              {modelVersion}
            </span>
          </div>
          <p className="mt-1.5 text-mute">
            {datasetSummary.internalApprovedCount.toLocaleString("en-US")} internal verified entries ·{" "}
            {datasetSummary.externalTimelineCount.toLocaleString("en-US")} external historical timelines ·{" "}
            {datasetSummary.combinedDeduplicatedCount.toLocaleString("en-US")} deduplicated journeys ·{" "}
            {datasetSummary.queueObservationsCount.toLocaleString("en-US")} queue checkpoints
          </p>
        </div>

        <div className="space-y-2.5">
          {[
            { title: "Submission invitation frontier (WL joining date)", f: sub },
            { title: "Appointment invitation frontier (Submission date)", f: apptSub },
            { title: "Waiting-list cohort reaching appointments", f: apptWl },
          ].map(({ title, f }) => (
            <div key={title} className="rounded-lg border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink-900">{title}</p>
                <span className="rounded border border-line bg-paper-sunk px-2 py-0.5 text-[11px] font-medium">
                  Confidence: {formatConfidenceLabel(f.confidence)}
                </span>
              </div>
              <dl className="mt-2 space-y-1.5">
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Combined frontier</dt>
                  <dd className="font-semibold tabular-nums text-ink-900">
                    {formatDisplayDate(f.combinedFrontierDate)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Internal recorded cohort</dt>
                  <dd className="tabular-nums">
                    {f.internalLatestCohort
                      ? `${formatDisplayDate(f.internalLatestCohort)} (n=${f.internalSampleSize})`
                      : "Unavailable"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Observed date span</dt>
                  <dd className="tabular-nums">
                    {f.observedRangeStart && f.observedRangeEnd
                      ? `${formatDisplayDate(f.observedRangeStart)} – ${formatDisplayDate(f.observedRangeEnd)}`
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Recent sample / effective N</dt>
                  <dd className="tabular-nums">
                    {f.sampleSize} obs. (eff. {f.effectiveSampleSize})
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-mute">Latest observation</dt>
                  <dd className="tabular-nums">{formatDisplayDate(f.lastUpdatedDate)}</dd>
                </div>
              </dl>
              {f.hasConflict && f.conflictSummary && (
                <p className="mt-2 rounded bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  {f.conflictSummary}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-line p-3">
          <p className="font-semibold text-ink-900">Queue movement velocity windows</p>
          <p className="mt-0.5 text-[11px] text-mute">
            Theil–Sen robust slope across sliding lookback windows (joining-days cleared per week).
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {[7, 30, 90].map((win) => {
              const w = vel.windows.find((item) => item.windowDays === win);
              return (
                <div key={win} className="rounded-lg border border-line bg-paper-sunk px-2.5 py-2 text-center">
                  <div className="text-[11px] text-mute">{win}-day window</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-ink-900">
                    {formatWeeklyDays(w?.weeklyRateDays) ?? "Unavailable"}
                  </div>
                  <div className="text-[10px] text-mute tabular-nums">
                    {w ? `${w.observationsCount} obs.` : "0 obs."}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-line p-3">
          <p className="font-semibold text-ink-900">Survival analysis &amp; limitations</p>
          <dl className="mt-1.5 space-y-1">
            <div className="flex justify-between">
              <dt className="text-mute">Kaplan–Meier median (WL → Invite)</dt>
              <dd className="font-semibold tabular-nums text-ink-900">
                {report.durations.survivalMedianDays !== null
                  ? `${report.durations.survivalMedianDays} days`
                  : "Unavailable"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mute">Evidence classification</dt>
              <dd>{sub.sourceClassification}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] leading-relaxed text-mute">
            Frontiers represent community-reported cohorts currently receiving invitations and may vary across applicants on the same day or pause without notice.
          </p>
        </div>
      </div>
    </AnalyticsDetailsDrawer>
  );
}
