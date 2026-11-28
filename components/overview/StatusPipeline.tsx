import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { VISA_STATUS_HEX, VISA_STATUS_LABELS, VISA_STATUS_ORDER, VISA_STATUS_SHORT } from "@/lib/constants";

const LABELS: Record<string, string> = {
  WAITING_LIST: "Waiting list", WAITING_FOR_SUBMISSION: "Awaiting submission", SUBMISSION_RECEIVED: "Submitted",
  UNDER_CORRECTION: "Correction", APPOINTMENT_SCHEDULED: "Appointment", PROCESSING: "Processing",
  VISA_ISSUED: "Visa issued", VISA_REJECTED: "Rejected", WITHDRAWN: "Withdrawn", OTHER: "Other status",
};

export default function StatusPipeline({ total, statusCounts }: { total: number; statusCounts: Record<string, number> }) {
  const statuses = VISA_STATUS_ORDER.filter((status) => status !== "OTHER" || (statusCounts[status] ?? 0) > 0);
  const terminal = ["VISA_ISSUED", "VISA_REJECTED", "WITHDRAWN"];
  const active = statuses.filter((status) => !terminal.includes(status));
  return <section className="card p-4 sm:p-5" aria-labelledby="status-pipeline-heading">
    <header className="flex items-center justify-between gap-3"><h2 id="status-pipeline-heading" className="text-[18px] font-semibold text-ink-900">Status pipeline</h2><Link href="/tracker" className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700">View all <Icon name="arrowUpRight" size={14}/></Link></header>
    <div className="mt-2 flex items-baseline gap-2"><span className="text-[30px] font-semibold leading-none tabular-nums tracking-tight text-ink-900">{total.toLocaleString("en-US")}</span><span className="text-xs text-mute">Tracked applicants</span></div>
    {total === 0 ? <div className="mt-4 rounded-lg bg-paper-sunk px-3 py-3 text-sm text-mute">No approved applicants yet.</div> : <>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-paper-sunk" role="img" aria-label={`Distribution of ${total} tracked applicants by status: ${statuses.filter(s => (statusCounts[s] ?? 0) > 0).map(s => `${LABELS[s]} ${(statusCounts[s] ?? 0).toLocaleString("en-US")}`).join(", ")}`}>
        {statuses.filter((status) => (statusCounts[status] ?? 0) > 0).map((status) => <span key={status} className="h-full shrink-0 border-r border-white/70 last:border-0" style={{ width: `${((statusCounts[status] ?? 0) / total) * 100}%`, backgroundColor: VISA_STATUS_HEX[status] || VISA_STATUS_HEX.OTHER }} title={`${LABELS[status]}: ${statusCounts[status]}`} />)}
      </div>
      <ul className="mt-3 space-y-1">
        {active.map((status) => {
          const count = statusCounts[status] ?? 0; const color = VISA_STATUS_HEX[status] || VISA_STATUS_HEX.OTHER;
          return <li key={status}><Link href={`/tracker?status=${encodeURIComponent(status)}`} aria-label={`${VISA_STATUS_LABELS[status]}: ${count} applicants`} className="group grid min-h-7 grid-cols-[minmax(0,1fr)_minmax(40px,24%)_3.5rem] items-center gap-2 rounded px-1 text-xs hover:bg-paper-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700 active:bg-paper-sunk">
            <span className="flex min-w-0 items-center gap-2"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true"/><span className="truncate text-ink-700" title={VISA_STATUS_LABELS[status]}>{LABELS[status] || VISA_STATUS_SHORT[status]}</span></span>
            <span className="h-1 overflow-hidden rounded-full bg-paper-sunk" aria-hidden="true"><span className="block h-full rounded-full" style={{ width: `${total ? (count / total) * 100 : 0}%`, backgroundColor: color }}/></span>
            <span className="text-right font-semibold tabular-nums text-ink-900">{count.toLocaleString("en-US")}</span>
          </Link></li>;
        })}
      </ul>
    </>}
    <footer className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-2.5">
      {terminal.map((status) => <div key={status} className="flex min-w-0 items-center gap-1.5 text-[11px] text-mute"><i className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: VISA_STATUS_HEX[status] }} aria-hidden="true"/><span className="truncate">{LABELS[status]}</span><span className="ml-auto font-semibold tabular-nums text-ink-800">{(statusCounts[status] ?? 0).toLocaleString("en-US")}</span></div>)}
    </footer>
  </section>;
}
