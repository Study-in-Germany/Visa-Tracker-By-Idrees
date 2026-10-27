"use client";

import { VISA_STATUS_HEX, VISA_STATUS_SHORT, VISA_STATUS_LABELS } from "@/lib/constants";

export const CHIP_STATUSES = [
  "WAITING_LIST", "WAITING_FOR_SUBMISSION", "SUBMISSION_RECEIVED", "UNDER_CORRECTION",
  "APPOINTMENT_SCHEDULED", "PROCESSING", "VISA_ISSUED", "VISA_REJECTED", "WITHDRAWN",
] as const;

/**
 * One-line status filter. Each chip is a colour dot, a short label and a live count.
 * Scrolls sideways when it does not fit, so it never adds a second row.
 */
export default function StatusChips({
  value, onChange, counts, total,
}: {
  value: string;
  onChange: (v: string) => void;
  counts?: Record<string, number>;
  total?: number;
}) {
  const chip = "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition-colors";
  const count = (n?: number) => (n === undefined ? null : <span className="tabular-nums opacity-70">{n.toLocaleString("en-US")}</span>);
  return (
    <div
      role="group"
      aria-label="Filter by status"
      className="-mx-3 flex h-10 items-center gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <button type="button" aria-pressed={!value} onClick={() => onChange("")} className={`${chip} ${!value ? "border-ink-900 bg-ink-900 text-paper-raised" : "border-line-strong bg-card text-ink-800 hover:bg-paper-sunk"}`}>
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
            className={`${chip} ${on ? "text-white" : "text-ink-800 hover:brightness-95"}`}
            style={on ? { background: hex, borderColor: hex } : { background: `${hex}14`, borderColor: `${hex}55` }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: on ? "#fff" : hex }} aria-hidden="true" />
            {VISA_STATUS_SHORT[k]}
            {count(n ?? (counts ? 0 : undefined))}
          </button>
        );
      })}
    </div>
  );
}
