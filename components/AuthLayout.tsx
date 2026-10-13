import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import Icon, { IconName } from "@/components/ui/Icon";

const STAGES = [
  { label: "Waiting list", done: true },
  { label: "Submission invitation", done: true },
  { label: "Documents submitted", done: true },
  { label: "Appointment", done: false, current: true },
  { label: "Decision", done: false },
];

/**
 * Standalone sign-in layout. Left: brand panel (hidden on phones) with the seal, a
 * journey illustration and benefits. Right: the form in a compact card.
 */
export default function AuthLayout({
  title,
  subtitle,
  points,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  points: { icon: IconName; text: string }[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-ink-900 text-paper-raised lg:flex lg:flex-col">
        {/* flag stripe from the seal */}
        <div className="flex h-1.5" aria-hidden="true">
          <span className="flex-1 bg-black" />
          <span className="flex-1 bg-[#d40000]" />
          <span className="flex-1 bg-[#ffcc00]" />
        </div>

        <div className="flex flex-1 flex-col justify-between p-8 xl:p-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <LogoMark size={48} />
            <span className="leading-tight">
              <span className="block text-base font-semibold">Visa Tracker</span>
              <span className="block text-xs text-ink-300">by Idrees</span>
            </span>
          </Link>

          <div className="space-y-6">
            <div>
              <h2 className="max-w-md text-[28px] font-semibold leading-tight tracking-tight xl:text-3xl">Your German visa journey, in one place.</h2>
              <p className="mt-2 max-w-sm text-[13px] text-ink-300">Real timelines shared by the community, so you always know what comes next.</p>
            </div>

            {/* Journey illustration (decorative) */}
            <div className="max-w-sm rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10" aria-hidden="true">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-300">Journey</p>
              <ol className="relative mt-3 space-y-2.5 border-l border-white/15 pl-5">
                {STAGES.map((s) => (
                  <li key={s.label} className="relative flex items-center justify-between text-[13px]">
                    <span className={`absolute -left-[26px] grid h-3 w-3 place-items-center rounded-full ${s.done ? "bg-emerald-400" : s.current ? "bg-[#ffcc00] ring-4 ring-[#ffcc00]/20" : "bg-white/20"}`} />
                    <span className={s.done || s.current ? "text-paper-raised" : "text-ink-300"}>{s.label}</span>
                    {s.current && <span className="rounded bg-[#ffcc00]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#ffcc00]">You are here</span>}
                  </li>
                ))}
              </ol>
            </div>

            <ul className="space-y-2.5">
              {points.map((p) => (
                <li key={p.text} className="flex items-center gap-3 text-[13px] text-ink-100">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10">
                    <Icon name={p.icon} size={14} />
                  </span>
                  {p.text}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-ink-300">Independent and community-run. Not affiliated with any embassy or government body.</p>
        </div>

        <span className="pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full border border-white/10" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-14 -right-14 h-52 w-52 rounded-full border border-white/10" aria-hidden="true" />
      </aside>

      {/* Form panel */}
      <main className="flex flex-col px-4 py-4 sm:px-8">
        <div className="flex h-10 items-center justify-between lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="text-sm font-semibold">Visa Tracker</span>
          </Link>
          <Link href="/tracker" className="text-xs font-medium text-ink-700 hover:underline">Browse tracker</Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[400px]">
            <div className="card p-5 shadow-[0_8px_30px_-12px_rgba(35,47,39,0.18)] sm:p-6">
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1 text-[13px] text-mute">{subtitle}</p>
              <div className="mt-4">{children}</div>
            </div>
            {footer && <div className="mt-4 text-center text-[13px] text-mute">{footer}</div>}
          </div>
        </div>

        <p className="py-2 text-center text-xs text-mute lg:text-right">
          <Link href="/" className="hover:underline">Back to the tracker</Link>
        </p>
      </main>
    </div>
  );
}
