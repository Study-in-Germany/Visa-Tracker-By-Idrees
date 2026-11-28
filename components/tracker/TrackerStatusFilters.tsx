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
 * Single-line horizontal status filter bar using shared compact rectangular StatusChip controls.
 */
export default function TrackerStatusFilters({
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
    <div
      role="group"
      aria-label="Filter by status"
      className="flex min-w-0 items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
  );
}
