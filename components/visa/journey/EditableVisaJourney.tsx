"use client";

import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import { CONSULATE_FIELD_OPTIONS } from "@/lib/options";
import type { SubmissionMilestoneKey, SubmissionMilestoneValues } from "@/lib/journey-validation";
import OptionalCorrectionMilestone from "./OptionalCorrectionMilestone";
import VisaJourneyTimeline from "./VisaJourneyTimeline";

/**
 * Step 3 editable visual visa journey for /submit.
 * Keeps Embassy selection above the connected transit timeline and preserves
 * optional correction milestones and inline per-milestone validation.
 */
export default function EditableVisaJourney({
  consulate,
  onConsulateChange,
  values,
  onDateChange,
  errors = {},
  todayIso,
}: {
  consulate: string;
  onConsulateChange: (consulate: string) => void;
  values: Partial<SubmissionMilestoneValues>;
  onDateChange: (key: SubmissionMilestoneKey, value: string) => void;
  errors?: Partial<Record<SubmissionMilestoneKey, string>>;
  todayIso?: string;
}) {
  return (
    <section aria-labelledby="submit-journey-heading" className="space-y-4">
      <div>
        <h2 id="submit-journey-heading" className="text-[17px] font-semibold tracking-tight text-ink-900">
          Your visa journey
        </h2>
        <p className="mt-0.5 text-[13px] text-mute">
          Add the dates you know. Leave upcoming milestones empty.
        </p>
      </div>

      <div className="max-w-xs [&_button[role=combobox]]:min-h-[44px]">
        <Field label="Embassy" htmlFor="s-consulate" required>
          <Select
            id="s-consulate"
            label="Embassy"
            value={consulate}
            onChange={onConsulateChange}
            options={CONSULATE_FIELD_OPTIONS}
          />
        </Field>
      </div>

      <div className="rounded-xl border border-line bg-card p-4 sm:p-5">
        <VisaJourneyTimeline
          mode="editable"
          values={values}
          errors={errors}
          todayIso={todayIso}
          onChange={onDateChange}
          idPrefix="submit"
        />

        <OptionalCorrectionMilestone
          mode="editable"
          correctionRequestDate={values.correctionRequestDate ?? ""}
          correctionSubmittedDate={values.correctionSubmittedDate ?? ""}
          onChange={onDateChange}
          errors={errors}
          todayIso={todayIso}
        />
      </div>
    </section>
  );
}
