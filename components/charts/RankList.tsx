/** Ranked horizontal bars rendered in plain HTML so long labels wrap instead of clipping. */
export default function RankList({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 break-words">
              <span className="mr-2 text-xs tabular-nums text-ink-300">{i + 1}</span>
              {r.label}
            </span>
            <span className="tabular-nums text-ink-600">{r.value.toLocaleString("en-US")}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-sunk">
            <div className="h-full rounded-full bg-clay-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
