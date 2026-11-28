"use client";

import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { CONSULATE_OPTIONS } from "@/components/PeriodFilters";
import type { TrackerFilterValues } from "@/hooks/useTrackerFilters";
import TrackerStatusFilterGroup from "./TrackerStatusFilterGroup";

export type { TrackerFilterValues };

/**
 * Shared filter form consumed by both the desktop full-height overlay drawer
 * and the mobile modal bottom sheet.
 */
export default function TrackerFilterForm({
  values,
  onChange,
  intakeOptions,
  universityOptions,
  statusCounts,
  totalCount,
  idPrefix = "tf",
}: {
  values: TrackerFilterValues;
  onChange: (next: TrackerFilterValues) => void;
  intakeOptions: { value: string; label: string }[];
  universityOptions: { value: string; label: string }[];
  statusCounts?: Record<string, number>;
  totalCount?: number;
  idPrefix?: string;
}) {
  return (
    <div className="space-y-5">
      <TrackerStatusFilterGroup
        value={values.visaStatus}
        onChange={(visaStatus) => onChange({ ...values, visaStatus })}
        counts={statusCounts}
        total={totalCount}
      />

      <Field label="Waiting-list registration" htmlFor={`${idPrefix}-date`}>
        <DateRangePicker
          value={values.period}
          onChange={(period) => onChange({ ...values, period })}
          label=""
          className="w-full"
          fullWidth
        />
      </Field>

      <Field label="Embassy" htmlFor={`${idPrefix}-consulate`}>
        <Select
          id={`${idPrefix}-consulate`}
          label="Embassy"
          value={values.consulate}
          onChange={(consulate) => onChange({ ...values, consulate })}
          options={CONSULATE_OPTIONS}
          clearable
        />
      </Field>

      <Field label="Intake" htmlFor={`${idPrefix}-intake`}>
        <Select
          id={`${idPrefix}-intake`}
          label="Intake"
          value={values.intake}
          onChange={(intake) => onChange({ ...values, intake })}
          options={intakeOptions}
          clearable
        />
      </Field>

      <Field label="University" htmlFor={`${idPrefix}-university`}>
        <Select
          id={`${idPrefix}-university`}
          label="University"
          value={values.university}
          onChange={(university) => onChange({ ...values, university })}
          options={universityOptions}
          clearable
        />
      </Field>
    </div>
  );
}
