"use client";

import { useMemo, useState } from "react";
import Icon from "./Icon";
import { ymd } from "@/lib/dates";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const parse = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

type SingleProps = { mode?: "single"; value: string; onChange: (v: string) => void };
type RangeProps = { mode: "range"; value: { from: string; to: string }; onChange: (v: { from: string; to: string }) => void };

/**
 * Month grid with month / year pickers. Dates are "YYYY-MM-DD" strings so there is no
 * timezone drift. Weeks start on Monday.
 */
export default function Calendar(props: (SingleProps | RangeProps) & { min?: string; max?: string }) {
  const { min, max } = props;
  const range = props.mode === "range" ? props.value : null;
  const single = props.mode === "range" ? "" : props.value;
  const anchor = parse(range ? range.from || range.to : single) ?? new Date();
  const [view, setView] = useState<"days" | "months" | "years">("days");
  const [cursor, setCursor] = useState({ y: anchor.getFullYear(), m: anchor.getMonth() });
  const [decade, setDecade] = useState(Math.floor(anchor.getFullYear() / 12) * 12);
  const todayStr = ymd(new Date());

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first
    return Array.from({ length: 42 }, (_, i) => new Date(cursor.y, cursor.m, 1 - lead + i));
  }, [cursor]);

  const disabled = (s: string) => (!!min && s < min) || (!!max && s > max);

  function pickDay(s: string) {
    if (disabled(s)) return;
    if (props.mode === "range") {
      const { from, to } = props.value;
      if (!from || (from && to)) props.onChange({ from: s, to: "" });
      else if (s < from) props.onChange({ from: s, to: "" });
      else props.onChange({ from, to: s });
    } else {
      props.onChange(s);
    }
  }

  const shift = (delta: number) => setCursor((c) => {
    const d = new Date(c.y, c.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const navBtn = "grid h-8 w-8 place-items-center rounded-md text-ink-700 hover:bg-paper-sunk";

  return (
    <div className="w-full select-none p-3 sm:w-[17.5rem]">
      <div className="mb-2 flex items-center justify-between">
        {view === "days" ? (
          <button type="button" onClick={() => setView("months")} className="flex h-8 items-center gap-1 rounded-md px-2 text-sm font-semibold hover:bg-paper-sunk" aria-label="Choose month and year">
            {MONTHS_LONG[cursor.m]} {cursor.y}
            <Icon name="chevronDown" size={14} className="text-mute" />
          </button>
        ) : view === "months" ? (
          <button type="button" onClick={() => { setDecade(Math.floor(cursor.y / 12) * 12); setView("years"); }} className="flex h-8 items-center gap-1 rounded-md px-2 text-sm font-semibold hover:bg-paper-sunk">
            {cursor.y}
            <Icon name="chevronDown" size={14} className="text-mute" />
          </button>
        ) : (
          <span className="px-2 text-sm font-semibold">{decade} – {decade + 11}</span>
        )}
        <div className="flex">
          <button type="button" className={navBtn} aria-label="Previous" onClick={() => (view === "days" ? shift(-1) : view === "months" ? setCursor((c) => ({ ...c, y: c.y - 1 })) : setDecade((d) => d - 12))}>
            <Icon name="chevronLeft" size={16} />
          </button>
          <button type="button" className={navBtn} aria-label="Next" onClick={() => (view === "days" ? shift(1) : view === "months" ? setCursor((c) => ({ ...c, y: c.y + 1 })) : setDecade((d) => d + 12))}>
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </div>

      {view === "months" && (
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((m, i) => (
            <button key={m} type="button" onClick={() => { setCursor((c) => ({ ...c, m: i })); setView("days"); }} className={`h-10 rounded-md text-sm hover:bg-paper-sunk ${i === cursor.m ? "bg-ink-800 text-paper-raised hover:bg-ink-800" : ""}`}>
              {m}
            </button>
          ))}
        </div>
      )}

      {view === "years" && (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 12 }, (_, i) => decade + i).map((y) => (
            <button key={y} type="button" onClick={() => { setCursor((c) => ({ ...c, y })); setView("months"); }} className={`h-10 rounded-md text-sm hover:bg-paper-sunk ${y === cursor.y ? "bg-ink-800 text-paper-raised hover:bg-ink-800" : ""}`}>
              {y}
            </button>
          ))}
        </div>
      )}

      {view === "days" && (
        <>
          <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase text-mute">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7" role="grid">
            {cells.map((d) => {
              const s = ymd(d);
              const outside = d.getMonth() !== cursor.m;
              const off = disabled(s);
              const isStart = range ? s === range.from : s === single;
              const isEnd = range ? s === range.to : false;
              const inRange = !!range && !!range.from && !!range.to && s > range.from && s < range.to;
              const edge = isStart || isEnd;
              return (
                <div key={s} className={`flex justify-center ${inRange ? "bg-ink-100" : ""} ${range && range.from && range.to && isStart && range.from !== range.to ? "rounded-l-full bg-ink-100" : ""} ${isEnd && range!.from !== range!.to ? "rounded-r-full bg-ink-100" : ""}`}>
                  <button
                    type="button"
                    role="gridcell"
                    disabled={off}
                    aria-selected={edge}
                    aria-label={d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    onClick={() => pickDay(s)}
                    className={`grid h-9 w-9 place-items-center rounded-full text-[13px] tabular-nums transition-colors ${
                      edge
                        ? "bg-ink-800 font-semibold text-paper-raised"
                        : off
                        ? "cursor-not-allowed text-ink-300/60"
                        : outside
                        ? "text-ink-300 hover:bg-paper-sunk"
                        : "hover:bg-paper-sunk"
                    } ${s === todayStr && !edge ? "font-semibold text-clay-600 ring-1 ring-clay-400/60" : ""}`}
                  >
                    {d.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
