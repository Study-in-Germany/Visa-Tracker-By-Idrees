"use client";

import { useEffect, useRef, useState } from "react";
import Calendar from "@/components/ui/Calendar";
import Icon from "@/components/ui/Icon";
import Popover from "@/components/ui/Popover";
import { ymd } from "@/lib/dates";
import type { Period } from "@/lib/period";

interface AnalyticsPreset {
  id: string;
  label: string;
  range: () => Period;
}

function rollingRange(daysBack: number): Period {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (daysBack - 1));
  return { from: ymd(from), to: ymd(to) };
}

function rollingMonthsRange(monthsBack: number): Period {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - monthsBack);
  return { from: ymd(from), to: ymd(to) };
}

export const ANALYTICS_DATE_PRESETS: AnalyticsPreset[] = [
  { id: "all", label: "All time", range: () => ({ from: "", to: "" }) },
  { id: "30d", label: "Last 30 days", range: () => rollingRange(30) },
  { id: "90d", label: "Last 90 days", range: () => rollingRange(90) },
  { id: "6m", label: "Last 6 months", range: () => rollingMonthsRange(6) },
  { id: "12m", label: "Last 12 months", range: () => rollingMonthsRange(12) },
];

export function describeAnalyticsPeriod(p: Period): string {
  if (!p.from && !p.to) return "All time";
  const match = ANALYTICS_DATE_PRESETS.find(
    (x) => x.id !== "all" && x.range().from === p.from && x.range().to === p.to
  );
  if (match) return match.label;
  const f = (s: string) =>
    new Date(`${s}T00:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (p.from && p.to) return `${f(p.from)} – ${f(p.to)}`;
  return p.from ? `From ${f(p.from)}` : `Until ${f(p.to)}`;
}

export default function AnalyticsDateRangeControl({
  value,
  onChange,
  fullWidth = false,
  className = "",
}: {
  value: Period;
  onChange: (p: Period) => void;
  fullWidth?: boolean;
  className?: string;
}) {
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

  const ready = Boolean(draft.from && draft.to);
  const fmt = (s: string) =>
    s
      ? new Date(`${s}T00:00:00`).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className={className}>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Date range (waiting-list join date): ${describeAnalyticsPeriod(value)}`}
        className={`flex min-h-[36px] items-center gap-1.5 rounded-lg border bg-paper-raised px-2.5 text-[13px] transition-colors hover:border-ink-300 ${
          fullWidth ? "w-full" : "w-full sm:w-auto sm:min-h-[34px]"
        } ${open ? "border-ink-600 ring-1 ring-ink-600" : "border-line-strong"}`}
      >
        <Icon name="calendar" size={14} className="shrink-0 text-mute" />
        <span className="shrink-0 text-[12px] text-mute">Joined:</span>
        <span className="truncate font-medium text-ink-900">{describeAnalyticsPeriod(value)}</span>
        <Icon
          name="chevronDown"
          size={14}
          className={`ml-auto shrink-0 text-mute transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={ref as React.RefObject<HTMLElement>}
        title="Filter by waiting-list join date"
        width={480}
        align="left"
      >
        <div className="border-b border-line bg-paper-sunk/60 px-3 py-2 text-[11px] text-mute">
          Filters tracked applicants by their <strong className="text-ink-800">waiting-list registration date</strong>.
        </div>
        <div className="sm:flex">
          <div className="grid grid-cols-2 gap-1 border-b border-line p-2 sm:w-40 sm:grid-cols-1 sm:border-b-0 sm:border-r">
            {ANALYTICS_DATE_PRESETS.map((p) => {
              const r = p.range();
              const active = r.from === value.from && r.to === value.to;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => apply(r)}
                  className={`min-h-[34px] rounded-md px-2.5 text-left text-[12px] transition-colors ${
                    active
                      ? "bg-slate-900 font-semibold text-white dark:bg-[#FAFAFA] dark:text-[#0A0A0A]"
                      : "text-ink-700 hover:bg-paper-sunk"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="min-w-0 flex-1">
            <Calendar mode="range" value={draft} onChange={setDraft} />
            <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
              <span className="truncate text-[11px] text-mute tabular-nums">
                {fmt(draft.from)} → {fmt(draft.to)}
              </span>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  className="btn-secondary !min-h-[30px] !px-2.5 !text-xs"
                  onClick={() => apply({ from: "", to: "" })}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="btn-primary !min-h-[30px] !px-2.5 !text-xs"
                  disabled={!ready}
                  onClick={() => apply(draft)}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </Popover>
    </div>
  );
}
