"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import { formatApproxStep } from "@/lib/analytics/formatters";
import type { VisaStageTimelineView } from "@/lib/analytics/types";

/** "Step details" – progressive disclosure for definitions, sample sizes and evidence scope. */
export default function ProcessingDetails({ data }: { data: VisaStageTimelineView }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[32px] shrink-0 items-center gap-1 rounded-md border border-line bg-paper-raised px-2.5 py-1 text-[12px] font-medium text-ink-700 transition-colors hover:bg-[rgb(var(--hover))]"
      >
        Step details
        <Icon name="arrowUpRight" size={12} className="text-mute" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Stage duration definitions" variant="drawer">
        <div className="space-y-4 text-xs text-ink-700">
          <div className="rounded-lg border border-line bg-paper-sunk p-3">
            <p className="font-semibold text-ink-900">Measurement window</p>
            <p className="mt-1 text-mute">{data.details.windowDescription}</p>
            <p className="mt-1 text-mute">
              Historical community entries, not a personal journey. Durations are medians of people who completed
              each transition; the range shows the middle half of them.
            </p>
          </div>

          <div className="space-y-2">
            {data.details.stageDefinitions.map((def) => (
              <div key={def.stage} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-ink-900">{def.stage}</p>
                  <span className="tabular-nums text-mute">{def.sampleSize} cases</span>
                </div>
                <p className="mt-1 text-mute">{def.definition}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-line p-3">
            <p className="font-semibold text-ink-900">What the counts mean</p>
            <ul className="mt-1 space-y-1 text-mute">
              <li>Tracked: approved community entries.</li>
              <li>Received: entries with a submission invitation, document submission, appointment or decision.</li>
              <li>Recorded: entries with an appointment date or a decision.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-line p-3">
            <p className="font-semibold text-ink-900">Decisions evidence</p>
            <p className="mt-1 text-mute">Internal recorded decisions: {data.details.internalDecidedCount}</p>
            {data.details.externalDecisionSampleSize > 0 && (
              <p className="mt-1 text-mute">
                External historical decision observations: {data.details.externalDecisionSampleSize}
                {data.details.externalDecisionMedianDays !== null
                  ? ` (typical wait ≈ ${formatApproxStep(data.details.externalDecisionMedianDays)} after interview)`
                  : ""}
              </p>
            )}
            {data.externalDecisionNote && <p className="mt-1 text-mute">{data.externalDecisionNote}</p>}
          </div>

          <div className="rounded-lg border border-line p-3">
            <p className="font-semibold text-ink-900">Document corrections</p>
            <p className="mt-1 text-mute">
              {data.correction.percent === null
                ? `Not enough submissions yet (${data.correction.submissionsCount} so far; at least 5 needed).`
                : `${data.correction.correctionCount} of ${data.correction.submissionsCount} submitted applications received a correction request. Waiting-list entries without a submission are excluded.`}
            </p>
            {data.correction.postCorrectionApprox !== null && (
              <p className="mt-1 text-mute">
                After a correction, the appointment usually follows within {data.correction.postCorrectionApprox} (
                {data.correction.postCorrectionSampleSize} cases).
              </p>
            )}
            {data.correction.postCorrectionSampleSize > 0 && data.correction.postCorrectionSampleSize < 5 && (
              <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                Post-correction appointment timing has only {data.correction.postCorrectionSampleSize} tracked
                observations — omitted until at least 5 are recorded.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
