"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import Popover from "./Popover";
import Calendar from "./Calendar";
import { describePeriod } from "@/lib/dates";
import type { Period } from "@/lib/period";

export type ColumnFilterConfig =
  | { type: "select"; label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }
  | { type: "text"; label: string; value: string; placeholder?: string; onChange: (v: string) => void }
  | { type: "range"; label: string; value: Period; onChange: (p: Period) => void };

const isActive = (f: ColumnFilterConfig) => (f.type === "range" ? !!(f.value.from || f.value.to) : !!f.value);

/** Funnel button in a table header that opens a small filter popover for that column. */
export default function ColumnFilter({ filter }: { filter: ColumnFilterConfig }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const active = isActive(filter);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Filter ${filter.label}${active ? " (active)" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`relative grid h-6 w-6 place-items-center rounded-md normal-case transition-colors ${active ? "bg-clay-50 text-clay-600" : "text-mute hover:bg-paper-sunk hover:text-ink-900"}`}
      >
        <Icon name="filter" size={13} />
        {active && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-clay-500" />}
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref as React.RefObject<HTMLElement>} title={`Filter: ${filter.label}`} width={filter.type === "range" ? 280 : 220}>
        {filter.type === "select" && (
          <ul role="listbox" aria-label={filter.label} className="max-h-72 overflow-y-auto p-1 normal-case tracking-normal">
            {[{ value: "", label: "All" }, ...filter.options.filter((o) => o.value !== "")].map((o) => {
              const sel = o.value === filter.value;
              return (
                <li key={o.value || "__all"} role="option" aria-selected={sel}>
                  <button type="button" onClick={() => { filter.onChange(o.value); setOpen(false); }} className={`flex min-h-[34px] w-full items-center justify-between gap-2 rounded-md px-2.5 text-left text-[13px] hover:bg-paper-sunk ${sel ? "font-semibold" : ""}`}>
                    <span className="truncate">{o.label}</span>
                    {sel && <Icon name="check" size={14} className="text-clay-500" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {filter.type === "text" && <TextBody filter={filter} close={() => setOpen(false)} />}
        {filter.type === "range" && <RangeBody filter={filter} close={() => setOpen(false)} />}
      </Popover>
    </>
  );
}

function TextBody({ filter, close }: { filter: Extract<ColumnFilterConfig, { type: "text" }>; close: () => void }) {
  const [text, setText] = useState(filter.value);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  return (
    <form
      className="space-y-2 p-3 normal-case tracking-normal"
      onSubmit={(e) => { e.preventDefault(); filter.onChange(text.trim()); close(); }}
    >
      <input ref={input} className="input" value={text} placeholder={filter.placeholder || "Contains…"} aria-label={filter.label} onChange={(e) => setText(e.target.value)} />
      <div className="flex gap-1.5">
        <button type="button" className="btn-secondary !min-h-[30px] flex-1 !text-xs" onClick={() => { filter.onChange(""); close(); }}>Clear</button>
        <button className="btn-primary !min-h-[30px] flex-1 !text-xs">Apply</button>
      </div>
    </form>
  );
}

function RangeBody({ filter, close }: { filter: Extract<ColumnFilterConfig, { type: "range" }>; close: () => void }) {
  const [draft, setDraft] = useState<Period>(filter.value);
  const ready = !!draft.from && !!draft.to;
  return (
    <div className="normal-case tracking-normal">
      <Calendar mode="range" value={draft} onChange={setDraft} />
      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
        <span className="truncate text-xs text-mute">{ready ? describePeriod(draft) : "Pick start and end"}</span>
        <div className="flex gap-1.5">
          <button type="button" className="btn-secondary !min-h-[30px] !px-2.5 !text-xs" onClick={() => { filter.onChange({ from: "", to: "" }); close(); }}>Clear</button>
          <button type="button" className="btn-primary !min-h-[30px] !px-2.5 !text-xs" disabled={!ready} onClick={() => { filter.onChange(draft); close(); }}>Apply</button>
        </div>
      </div>
    </div>
  );
}
