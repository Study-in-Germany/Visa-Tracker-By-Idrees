"use client";

import { useRef, useState } from "react";
import Icon from "./Icon";
import Popover from "./Popover";
import Calendar from "./Calendar";
import { ymd } from "@/lib/dates";

const fmt = (s: string) =>
  s ? new Date(`${s}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

/**
 * Single-date field. A visible clear button (separate from the trigger, 32px target)
 * removes the value, so a date can always be emptied again.
 */
export default function DatePicker({
  value,
  onChange,
  label,
  id,
  placeholder = "Select date",
  min,
  max,
  disabled,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  /** Accessible name and sheet title. */
  label: string;
  id?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={ref}
        id={id}
        type="button"
        aria-label={value ? `${label}: ${fmt(value)}` : label}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-[36px] w-full items-center gap-2 rounded-lg border bg-paper-raised px-3 text-left text-[13px] transition-colors hover:border-ink-300 disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "border-ink-600 ring-1 ring-ink-600" : "border-line-strong"
        } ${value ? "pr-9" : ""}`}
      >
        <Icon name="calendar" size={15} className="shrink-0 text-mute" />
        <span className={`truncate ${value ? "text-ink-900" : "text-ink-300"}`}>{value ? fmt(value) : placeholder}</span>
      </button>
      {value && !disabled && (
        <button
          type="button"
          aria-label={`Clear ${label}`}
          onClick={() => onChange("")}
          className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-mute hover:bg-paper-sunk hover:text-ink-900"
        >
          <Icon name="close" size={14} />
        </button>
      )}

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref as React.RefObject<HTMLElement>} title={label} width={280}>
        <Calendar value={value} min={min} max={max} onChange={(v) => { onChange(v); setOpen(false); }} />
        <div className="flex items-center justify-between border-t border-line px-3 py-2">
          <button type="button" className="rounded-md px-2 py-1.5 text-xs font-medium text-ink-700 hover:bg-paper-sunk" onClick={() => { onChange(ymd(new Date())); setOpen(false); }}>
            Today
          </button>
          <button type="button" disabled={!value} className="rounded-md px-2 py-1.5 text-xs font-medium text-clay-600 hover:bg-clay-50 disabled:text-ink-300 disabled:hover:bg-transparent" onClick={() => { onChange(""); setOpen(false); }}>
            Clear date
          </button>
        </div>
      </Popover>
    </div>
  );
}
