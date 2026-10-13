import { VISA_STATUS_HEX, VISA_STATUS_LABELS, VISA_STATUS_ORDER } from "@/lib/constants";

/** One stacked bar for the whole pipeline plus a legend with exact counts. */
export default function StatusBar({ counts, hideLegend = false }: { counts: Record<string, number>; hideLegend?: boolean }) {
  const rows = VISA_STATUS_ORDER.filter((k) => counts[k] > 0).map((k) => ({ key: k, value: counts[k] }));
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total === 0) return null;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-paper-sunk" role="img" aria-label="Share of applicants by status">
        {rows.map((r) => (
          <div key={r.key} title={`${VISA_STATUS_LABELS[r.key]}: ${r.value}`} style={{ width: `${(r.value / total) * 100}%`, background: VISA_STATUS_HEX[r.key] }} />
        ))}
      </div>
      {!hideLegend && <ul className="mt-4 space-y-1.5 text-sm">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: VISA_STATUS_HEX[r.key] }} />
              <span className="truncate">{VISA_STATUS_LABELS[r.key]}</span>
            </span>
            <span className="whitespace-nowrap tabular-nums text-ink-600">
              {r.value.toLocaleString("en-US")} <span className="text-xs">({Math.round((r.value / total) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>}
    </div>
  );
}
