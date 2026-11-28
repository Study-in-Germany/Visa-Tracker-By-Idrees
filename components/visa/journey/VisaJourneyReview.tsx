"use client";

import Icon from "@/components/ui/Icon";
import type { SubmissionMilestoneValues } from "@/lib/journey-validation";
import OptionalCorrectionMilestone from "./OptionalCorrectionMilestone";
import VisaJourneyTimeline from "./VisaJourneyTimeline";

/**
 * Step 4 read-only visual review of the applicant's entered visa journey.
 * Uses the same connected transit component as the dashboard, strictly excluding
 * forecast confidence, scenarios, or dashboard-only diagnostics.
 */
export default function VisaJourneyReview({
  consulate,
  values,
  onEdit,
  todayIso,
}: {
  consulate: string;
  values: Partial<SubmissionMilestoneValues>;
  onEdit?: () => void;
  todayIso?: string;
}) {
  return (
    <section
      data-testid="visa-journey-review"
      aria-labelledby="review-journey-heading"
      className="card p-4 sm:p-5"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 id="review-journey-heading" className="text-[16px] font-semibold tracking-tight text-ink-900">
            Your visa journey
          </h3>
          {consulate && (
            <p className="mt-0.5 text-xs text-mute">{consulate} embassy</p>
          )}
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex min-h-[32px] shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-[#202020]"
          >
            <Icon name="edit" size={13} /> Edit
          </button>
        )}
      </header>

      <VisaJourneyTimeline
        mode="review"
        values={values}
        todayIso={todayIso}
        idPrefix="review"
      />

      <OptionalCorrectionMilestone
        mode="review"
        correctionRequestDate={values.correctionRequestDate ?? ""}
        correctionSubmittedDate={values.correctionSubmittedDate ?? ""}
        todayIso={todayIso}
      />
    </section>
  );
}
