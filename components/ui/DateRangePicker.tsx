"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import Popover from "./Popover";
import Calendar from "./Calendar";
import { PRESETS, describePeriod } from "@/lib/dates";
import type { Period } from "@/lib/period";

/**
 * Preset list + range calendar. Presets apply immediately; a custom range needs both
 * ends and is applied with the button. Shows what is selected before it is applied.
 */
export default function DateRangePicker({ value, onChange, label = "Joined", className = "" }: { value: Period; onChange: (p: Period) => void; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Period>(value);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const apply = (p: Period) => {
    onChange(p);
    setOpen(false);
  };
  const ready = !!draft.from && !!draft.to;
  const text = (s: string) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

  return (
    <div className={className}>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex min-h-[36px] w-full items-center gap-2 rounded-lg border bg-paper-raised px-3 text-[13px] transition-colors hover:border-ink-300 sm:w-auto ${open ? "border-ink-600 ring-1 ring-ink-600" : "border-line-strong"}`}
      >
        <Icon name="calendar" size={15} className="text-mute" />
        <span className="text-mute">{label}</span>
        <span className="font-medium">{describePeriod(value)}</span>
        <Icon name="chevronDown" size={14} className={`ml-auto text-mute transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref as React.RefObject<HTMLElement>} title="Select period" width={470} align="right">
        <div className="sm:flex">
          <div className="grid grid-cols-3 gap-1 border-b border-line p-2 sm:w-36 sm:grid-cols-1 sm:border-b-0 sm:border-r">
            {PRESETS.map((p) => {
              const r = p.range();
              const active = r.from === value.from && r.to === value.to;
              return (
                <button key={p.id} type="button" aria-pressed={active} onClick={() => apply(r)} className={`min-h-[34px] rounded-md px-2.5 text-left text-[13px] ${active ? "bg-ink-800 font-semibold text-paper-raised" : "hover:bg-paper-sunk"}`}>
                  {p.label}
                </button>
              );
            })}
          </div>
          <div>
            <Calendar mode="range" value={draft} onChange={setDraft} />
            <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
              <span className="text-xs text-mute">
                {text(draft.from)} <span aria-hidden="true">→</span> {text(draft.to)}
              </span>
              <div className="flex gap-1.5">
                <button type="button" className="btn-secondary !min-h-[32px] !px-3 !text-xs" onClick={() => apply({ from: "", to: "" })}>Clear</button>
                <button type="button" className="btn-primary !min-h-[32px] !px-3 !text-xs" disabled={!ready} onClick={() => apply(draft)}>Apply</button>
              </div>
            </div>
          </div>
        </div>
      </Popover>
    </div>
  );
}
