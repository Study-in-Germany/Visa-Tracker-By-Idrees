import Link from "next/link";

/** Dashboard card: small title, big headline value with an optional pill, optional action, then free content. */
export default function MetricCard({
  title,
  value,
  pill,
  pillTone = "neutral",
  action,
  children,
  loading,
}: {
  title: string;
  value?: React.ReactNode;
  pill?: string;
  pillTone?: "neutral" | "good" | "bad" | "warn";
  action?: { label: string; href: string };
  children: React.ReactNode;
  loading?: boolean;
}) {
  const tones = {
    neutral: "bg-paper-sunk text-ink-700",
    good: "bg-emerald-50 text-emerald-700",
    bad: "bg-red-50 text-red-700",
    warn: "bg-ochre-50 text-ochre-700",
  };
  return (
    <section className="card flex h-full flex-col p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-medium text-ink-700">{title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {loading ? (
              <span className="h-7 w-20 animate-pulse rounded bg-paper-sunk" aria-hidden="true" />
            ) : (
              <span className="text-2xl font-semibold leading-tight tracking-tight">{value ?? "—"}</span>
            )}
            {pill && !loading && <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${tones[pillTone]}`}>{pill}</span>}
          </div>
        </div>
        {action && (
          <Link href={action.href} className="shrink-0 rounded-md border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-800 hover:bg-paper">
            {action.label}
          </Link>
        )}
      </header>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </section>
  );
}
