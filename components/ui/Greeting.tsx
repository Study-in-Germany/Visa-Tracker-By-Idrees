"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

function part(d: Date) {
  const h = d.getHours();
  return h < 5 ? "night" : h < 12 ? "morning" : h < 17 ? "afternoon" : h < 22 ? "evening" : "night";
}

const GLYPH = {
  morning: <path d="M12 3v2m0 14v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M3 12h2m14 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />,
  afternoon: <path d="M12 3v2m0 14v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M3 12h2m14 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />,
  evening: <path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 5v3M5.2 9.2l1.6 1.6M18.8 9.2l-1.6 1.6" />,
  night: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
} as const;

/** Time-aware greeting with live date and clock pills. Rendered client-side only, after data has loaded. */
export default function Greeting({ name, subtitle, actions }: { name: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const p = part(now);
  const pill = "inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-[12px] font-medium text-ink-700 shadow-[0_1px_2px_rgba(35,47,39,0.04)]";
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-clay-500" aria-hidden="true">{GLYPH[p]}</svg>
          <span className="min-w-0 truncate"><span className="font-normal text-ink-600">Good {p}, </span>{name}</span>
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={pill}><Icon name="calendar" size={13} className="text-mute" />{now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span>
          <span className={`${pill} tabular-nums`}><Icon name="clock" size={13} className="text-mute" />{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        {subtitle && <p className="mt-2 text-[13px] text-mute">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
