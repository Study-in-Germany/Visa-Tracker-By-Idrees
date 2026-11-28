"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import { formatConfidenceLabel, formatDisplayDate, formatWeeklyDays } from "@/lib/analytics/formatters";
import type { CanonicalQueueOverview } from "@/lib/analytics/types";

export default function QueueDetails({ data }: { data: CanonicalQueueOverview }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[28px] items-center gap-1 rounded-md border border-line bg-paper-raised px-2.5 py-1 text-[11px] font-medium text-ink-700 transition-colors hover:bg-[rgb(var(--hover))]"
      >
        <Icon name="info" size={12} className="text-mute" />
        Queue details
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Queue methodology & details" variant="drawer">
        <div className="space-y-4 text-xs text-ink-700">
          <div className="rounded-lg border border-line bg-paper-sunk p-3">
            <p className="font-semibold text-ink-900">Evidence dataset</p>
            <p className="mt-1 text-mute">
              {data.datasetSummary.internalApprovedCount.toLocaleString("en-US")} verified applicant records ·{" "}
              {data.datasetSummary.externalTimelineCount.toLocaleString("en-US")} external timelines ·{" "}
              {data.datasetSummary.queueObservationsCount.toLocaleString("en-US")} queue checkpoints
            </p>
            <p className="mt-1 text-[11px] text-mute">
              Model {data.modelVersion} · As of {formatDisplayDate(data.asOfDate)}
            </p>
          </div>

          <p className="text-[11px] leading-relaxed text-mute">
            Cohorts reached reflects the latest waiting-list dates receiving invitations in community reports; individual invitations can still arrive at different times.
          </p>

          {data.embassies.map((emb) => {
            const d = emb.diagnostics;
            return (
              <div key={emb.embassy} className="space-y-2.5 rounded-lg border border-line p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-900">{emb.embassy}</h3>
                  <span className="rounded-full border border-line bg-paper-sunk px-2 py-0.5 text-[11px] font-medium text-ink-700">
                    Confidence: {formatConfidenceLabel(d.confidence)}
                  </span>
                </div>

                <dl className="space-y-1.5">
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">Combined submission frontier</dt>
                    <dd className="font-semibold tabular-nums">{formatDisplayDate(d.combinedFrontierDate)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">Our recorded cohort</dt>
                    <dd className="font-semibold tabular-nums">
                      {d.internalLatestCohort ? `${formatDisplayDate(d.internalLatestCohort)} (${d.internalSampleSize})` : "Unavailable"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">Observed frontier span</dt>
                    <dd className="tabular-nums">
                      {d.observedRangeStart && d.observedRangeEnd
                        ? `${formatDisplayDate(d.observedRangeStart)} – ${formatDisplayDate(d.observedRangeEnd)}`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">Recent observations</dt>
                    <dd className="tabular-nums">
                      {d.sampleSize} obs. (eff. {d.effectiveSampleSize})
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">Waiting-list cohort reaching appointments</dt>
                    <dd className="font-semibold tabular-nums">
                      {d.appointmentByWaitingListDate ? formatDisplayDate(d.appointmentByWaitingListDate) : "Unavailable"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-mute">Last observation</dt>
                    <dd className="tabular-nums">{formatDisplayDate(d.lastUpdatedDate)}</dd>
                  </div>
                </dl>

                <div className="border-t border-line pt-2">
                  <p className="mb-1 text-[11px] font-semibold text-ink-800">Weekly pace windows</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[7, 30, 90].map((winDays) => {
                      const w = d.velocityWindows.find((item) => item.windowDays === winDays);
                      return (
                        <div key={winDays} className="rounded bg-paper-sunk px-2 py-1.5 text-center">
                          <div className="text-[10px] text-mute">{winDays}d pace</div>
                          <div className="font-semibold tabular-nums text-ink-900">
                            {formatWeeklyDays(w?.weeklyRateDays) ?? "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-mute">Source: {d.sourceClassification}</p>
                {d.hasConflict && d.conflictSummary && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">{d.conflictSummary}</p>
                )}
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
