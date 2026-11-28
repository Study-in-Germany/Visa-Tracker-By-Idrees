"use client";

import StatusChip from "@/components/ui/StatusChip";

export const CHIP_STATUSES = [
  "WAITING_LIST",
  "WAITING_FOR_SUBMISSION",
  "SUBMISSION_RECEIVED",
  "UNDER_CORRECTION",
  "APPOINTMENT_SCHEDULED",
  "PROCESSING",
  "VISA_ISSUED",
  "VISA_REJECTED",
  "WITHDRAWN",
] as const;

/**
 * Wrapping rectangular status chip selector rendered inside the Tracker filter drawer & sheet.
 */
export default function TrackerStatusFilterGroup({
  value,
  onChange,
  counts,
  total,
}: {
  value: string;
  onChange: (v: string) => void;
  counts?: Record<string, number>;
  total?: number;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-ink-700">Application status</legend>
      <div
        role="group"
        aria-label="Filter by application status"
        className="flex flex-wrap gap-1.5"
      >
        <StatusChip
          status="ALL"
          label="All"
          count={total}
          selected={!value}
          size="md"
          onClick={() => onChange("")}
        />
        {CHIP_STATUSES.map((k) => {
          const selected = value === k;
          const n = counts?.[k];
          return (
            <StatusChip
              key={k}
              status={k}
              short
              count={n ?? (counts ? 0 : undefined)}
              selected={selected}
              size="md"
              onClick={() => onChange(selected ? "" : k)}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
