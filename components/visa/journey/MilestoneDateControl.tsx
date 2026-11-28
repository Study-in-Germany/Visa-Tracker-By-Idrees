"use client";

import { useRef, useState } from "react";
import Calendar from "@/components/ui/Calendar";
import Icon from "@/components/ui/Icon";
import Popover from "@/components/ui/Popover";
import { ymd } from "@/lib/dates";
import { fmtDate } from "@/lib/format";
import { getMaxPlausibleDate, getTodayIsoLocal } from "@/lib/journey-validation";

/**
 * Compact milestone date control reusing the shared Popover + Calendar date picker.
 * Allows adding, editing, and clearing a single milestone date with inline validation feedback.
 */
export default function MilestoneDateControl({
  id,
  label,
  value,
  onChange,
  allowFuture = false,
  todayIso,
  error,
  align = "center",
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  allowFuture?: boolean;
  todayIso?: string;
  error?: string;
  align?: "center" | "left";
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const resolvedToday = todayIso || getTodayIsoLocal();
  const maxDate = allowFuture ? getMaxPlausibleDate(resolvedToday) : resolvedToday;
  const isScheduled = Boolean(value && allowFuture && value > resolvedToday);

  const pickDate = (next: string) => {
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const clearDate = () => {
    onChange("");
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div className={align === "center" ? "mt-1.5 flex flex-col items-center" : "mt-1 flex flex-col items-start"}>
      {value ? (
        <div
          className={`flex flex-wrap items-center gap-1 ${
            align === "center" ? "justify-center" : "justify-start"
          }`}
        >
          <span
            className={`text-[12px] font-semibold tabular-nums ${
              error ? "text-red-600 dark:text-red-400" : "text-ink-900"
            }`}
          >
            {fmtDate(value)}
          </span>
          {isScheduled && !error && (
            <span className="rounded border border-line-strong bg-paper-sunk px-1 py-0.5 text-[10px] font-medium text-ink-700">
              Scheduled
            </span>
          )}
          <div className="inline-flex items-center gap-0.5">
            <button
              ref={triggerRef}
              id={id}
              type="button"
              aria-label={`Edit ${label}: ${fmtDate(value)}`}
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="inline-flex min-h-[26px] items-center rounded px-1.5 text-[11px] font-medium text-blue-600 transition-colors hover:bg-paper-sunk dark:text-blue-400"
            >
              Edit
            </button>
            <button
              type="button"
              aria-label={`Clear ${label}`}
              onClick={clearDate}
              className="grid h-6 w-6 place-items-center rounded text-mute transition-colors hover:bg-paper-sunk hover:text-ink-900"
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        </div>
      ) : (
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-label={`Add ${label} date`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex min-h-[30px] items-center gap-1 rounded-md border border-dashed px-2.5 text-[11.5px] font-medium transition-colors ${
            error
              ? "border-red-500 text-red-600 dark:border-red-400 dark:text-red-400"
              : "border-line-strong bg-paper-raised text-ink-700 hover:border-ink-600 hover:text-ink-900"
          }`}
        >
          <Icon name="calendar" size={12} className="text-mute" />
          <span>Add date</span>
        </button>
      )}

      {error && (
        <p
          role="alert"
          className={`mt-1 text-[11px] leading-snug text-red-600 dark:text-red-400 ${
            align === "center" ? "text-center" : "text-left"
          }`}
        >
          {error}
        </p>
      )}

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef as React.RefObject<HTMLElement>}
        title={label}
        width={280}
      >
        <Calendar value={value} min="2018-01-01" max={maxDate} onChange={pickDate} />
        <div className="flex items-center justify-between border-t border-line px-3 py-2">
          <button
            type="button"
            className="rounded-md px-2 py-1.5 text-xs font-medium text-ink-700 hover:bg-paper-sunk"
            onClick={() => pickDate(ymd(new Date()))}
          >
            Today
          </button>
          <button
            type="button"
            disabled={!value}
            className="rounded-md px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:text-ink-300 disabled:hover:bg-transparent dark:text-red-400"
            onClick={clearDate}
          >
            Clear date
          </button>
        </div>
      </Popover>
    </div>
  );
}
