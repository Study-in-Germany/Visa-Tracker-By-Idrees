"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import { fmtDate } from "@/lib/format";
import type { SubmissionMilestoneKey } from "@/lib/journey-validation";
import MilestoneDateControl from "./MilestoneDateControl";

/**
 * Optional document correction milestone section for Step 3 (editable) and Step 4 (review).
 * Automatically displays whenever correction dates exist so existing data is never hidden or discarded.
 */
export default function OptionalCorrectionMilestone({
  mode,
  correctionRequestDate,
  correctionSubmittedDate,
  onChange,
  errors = {},
  todayIso,
}: {
  mode: "editable" | "review";
  correctionRequestDate: string;
  correctionSubmittedDate: string;
  onChange?: (key: SubmissionMilestoneKey, value: string) => void;
  errors?: Partial<Record<SubmissionMilestoneKey, string>>;
  todayIso?: string;
}) {
  const hasCorrectionData = Boolean(
    correctionRequestDate.trim() ||
      correctionSubmittedDate.trim() ||
      errors.correctionRequestDate ||
      errors.correctionSubmittedDate
  );
  const [expanded, setExpanded] = useState(hasCorrectionData);

  useEffect(() => {
    if (hasCorrectionData) setExpanded(true);
  }, [hasCorrectionData]);

  if (mode === "review") {
    if (!hasCorrectionData) return null;
    return (
      <div
        data-testid="review-correction-milestone"
        className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-paper-sunk/60 px-3.5 py-2.5 text-xs"
      >
        <div className="flex items-center gap-2 font-medium text-ink-800">
          <Icon name="wrench" size={13} className="text-amber-600 dark:text-amber-400" />
          <span>Document correction</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-700">
          {correctionRequestDate && (
            <span className="tabular-nums">
              Requested: <strong className="font-semibold text-ink-900">{fmtDate(correctionRequestDate)}</strong>
            </span>
          )}
          {correctionSubmittedDate && (
            <span className="tabular-nums">
              Submitted: <strong className="font-semibold text-ink-900">{fmtDate(correctionSubmittedDate)}</strong>
            </span>
          )}
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-line-strong bg-paper-sunk/40 px-3.5 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[13px] font-medium text-ink-800">Document correction</span>
          <span className="text-xs text-mute">Optional milestone</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex min-h-[32px] items-center gap-1 rounded-md border border-line-strong bg-paper-raised px-2.5 text-xs font-medium text-ink-800 transition-colors hover:bg-[rgb(var(--hover))]"
        >
          <Icon name="plus" size={13} />
          Add correction
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="editable-correction-milestone"
      className="mt-4 rounded-lg border border-line bg-paper-sunk/50 p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="wrench" size={14} className="text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-[13px] font-semibold text-ink-900">Document correction</p>
            <p className="text-[11px] text-mute">Optional milestone — leave empty if not requested.</p>
          </div>
        </div>
        {!hasCorrectionData && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded-md px-2 py-1 text-xs font-medium text-mute hover:bg-paper-sunk hover:text-ink-900"
          >
            Hide
          </button>
        )}
      </div>

      {onChange && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-card p-3">
            <p className="text-xs font-medium text-ink-700">Correction requested</p>
            <MilestoneDateControl
              id="s-correctionRequestDate"
              label="Correction requested"
              value={correctionRequestDate}
              onChange={(v) => onChange("correctionRequestDate", v)}
              allowFuture={false}
              todayIso={todayIso}
              error={errors.correctionRequestDate}
              align="left"
            />
          </div>

          <div className="rounded-lg border border-line bg-card p-3">
            <p className="text-xs font-medium text-ink-700">Correction submitted</p>
            <MilestoneDateControl
              id="s-correctionSubmittedDate"
              label="Correction submitted"
              value={correctionSubmittedDate}
              onChange={(v) => onChange("correctionSubmittedDate", v)}
              allowFuture={false}
              todayIso={todayIso}
              error={errors.correctionSubmittedDate}
              align="left"
            />
          </div>
        </div>
      )}
    </div>
  );
}
