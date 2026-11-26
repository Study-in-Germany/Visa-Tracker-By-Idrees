"use client";

import Link from "next/link";
import Icon, { IconName } from "@/components/ui/Icon";

export const TONES = {
  clay: { tile: "bg-blue-50 text-blue-700", ring: "border-line bg-paper-raised", text: "text-blue-600" },
  sage: { tile: "bg-paper-sunk text-ink-800", ring: "border-line bg-paper-raised", text: "text-ink-800" },
  amber: { tile: "bg-amber-50 text-amber-700", ring: "border-amber-200 bg-amber-50/50", text: "text-amber-800" },
  red: { tile: "bg-red-50 text-red-700", ring: "border-red-200 bg-red-50/50", text: "text-red-800" },
  green: { tile: "bg-emerald-50 text-emerald-700", ring: "border-emerald-200 bg-emerald-50/50", text: "text-emerald-800" },
  blue: { tile: "bg-blue-50 text-blue-700", ring: "border-blue-200 bg-blue-50/50", text: "text-blue-800" },
} as const;
export type Tone = keyof typeof TONES;

export function timeAgo(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Section card with a title row: used on every admin page so headings, spacing and actions line up. */
export function Section({ title, hint, action, children, className = "", flush = false }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold tracking-tight text-ink-900">{title}</h2>
          {hint && <p className="mt-0.5 truncate text-xs text-mute">{hint}</p>}
        </div>
        {action}
      </header>
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

/** A tile that says how many things need an admin and links straight to them. */
export function AttentionTile({ icon, tone, count, label, hint, href, loading }: { icon: IconName; tone: Tone; count: number | undefined; label: string; hint: string; href: string; loading?: boolean }) {
  const t = TONES[count ? tone : "sage"];
  return (
    <Link href={href} className={`group flex items-center gap-3.5 rounded-lg border p-3.5 transition-colors hover:border-line-strong ${t.ring}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${t.tile}`}><Icon name={icon} size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="text-[24px] font-semibold leading-none tabular-nums tracking-tight">{loading ? "–" : (count ?? 0).toLocaleString("en-US")}</span>
          <span className="truncate text-[13px] font-semibold text-ink-900">{label}</span>
        </p>
        <p className="mt-1 truncate text-xs text-mute">{count ? hint : "Nothing waiting"}</p>
      </div>
      <Icon name="chevronRight" size={16} className="shrink-0 text-mute" />
    </Link>
  );
}

export function Kpi({ icon, label, value, sub, tone = "sage", href }: { icon: IconName; label: string; value: number | undefined; sub?: string; tone?: Tone; href?: string }) {
  const body = (
    <div className="card flex h-full items-center gap-3 p-3.5 transition-colors hover:bg-paper-raised">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONES[tone].tile}`}><Icon name={icon} size={17} /></span>
      <div className="min-w-0">
        <p className="text-[22px] font-semibold leading-none tabular-nums tracking-tight text-ink-900">{value === undefined ? "–" : value.toLocaleString("en-US")}</p>
        <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-wider text-mute">{label}</p>
        {sub && <p className="truncate text-[11px] text-mute">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

/** Bars for a daily series. Pure SVG, scales to its container, labelled for screen readers. */
export function DailyBars({ data, height = 140 }: { data: { date: string; count: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  const W = 600;
  const step = W / data.length;
  const bw = Math.max(2, step - 4);
  const fmt = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${height + 18}`} className="w-full" role="img" aria-label={`${total} submissions over the last ${data.length} days`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={height - height * f} y2={height - height * f} stroke="rgb(var(--line))" strokeDasharray="3 4" />
        ))}
        <line x1="0" x2={W} y1={height} y2={height} stroke="rgb(var(--line-strong))" />
        {data.map((d, i) => {
          const h = d.count === 0 ? 2 : Math.max(4, (d.count / max) * (height - 6));
          return (
            <g key={d.date}>
              <title>{`${fmt(d.date)}: ${d.count}`}</title>
              <rect x={i * step + 2} y={height - h} width={bw} height={h} rx="2" fill={d.count ? "rgb(var(--accent-600))" : "rgb(var(--line-strong))"} opacity={d.count ? 1 : 0.6} />
            </g>
          );
        })}
        <text x="0" y={height + 14} fontSize="10" fill="rgb(var(--mute))">{fmt(data[0].date)}</text>
        <text x={W} y={height + 14} fontSize="10" textAnchor="end" fill="rgb(var(--mute))">{fmt(data[data.length - 1].date)}</text>
        <text x={W} y="10" fontSize="10" textAnchor="end" fill="rgb(var(--mute))">peak {max}</text>
      </svg>
    </figure>
  );
}

export function QuickLink({ href, icon, title, desc }: { href: string; icon: IconName; title: string; desc: string }) {
  return (
    <Link href={href} className="group flex items-start gap-3 rounded-lg border border-line bg-card p-3.5 transition-colors hover:border-line-strong hover:bg-paper-raised">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-paper-sunk text-ink-700"><Icon name={icon} size={17} /></span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold">{title}</span>
        <span className="block text-xs leading-snug text-mute">{desc}</span>
      </span>
    </Link>
  );
}
