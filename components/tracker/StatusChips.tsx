"use client";

import { VISA_STATUS_HEX, VISA_STATUS_SHORT, VISA_STATUS_LABELS } from "@/lib/constants";

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
 * Compact neutral status filter bar. Active state uses primary dark neutral;
 * each item displays a subtle 6px semantic indicator dot and count.
 */
export default function StatusChips({
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
  const base =
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors";
  const count = (n?: number) =>
    n === undefined ? null : <span className="tabular-nums opacity-65">{n.toLocaleString("en-US")}</span>;

  return (
    <div
      role="group"
      aria-label="Filter by status"
      className="-mx-3 flex items-center gap-1.5 overflow-x-auto px-3 py-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        aria-pressed={!value}
        onClick={() => onChange("")}
        className={`${base} ${
          !value
            ? "border-ink-800 bg-ink-800 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
            : "border-line bg-card text-ink-700 hover:bg-paper-sunk"
        }`}
      >
        All {count(total)}
      </button>
      {CHIP_STATUSES.map((k) => {
        const on = value === k;
        const hex = VISA_STATUS_HEX[k];
        const n = counts?.[k];
        return (
          <button
            key={k}
            type="button"
            aria-pressed={on}
            title={VISA_STATUS_LABELS[k]}
            onClick={() => onChange(on ? "" : k)}
            className={`${base} ${
              on
                ? "border-ink-800 bg-ink-800 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                : "border-line bg-card text-ink-700 hover:bg-paper-sunk"
            }`}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: hex }} aria-hidden="true" />
            {VISA_STATUS_SHORT[k]}
            {count(n ?? (counts ? 0 : undefined))}
          </button>
        );
      })}
    </div>
  );
}
