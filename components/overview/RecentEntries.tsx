import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { VISA_STATUS_HEX, VISA_STATUS_LABELS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";

type Applicant = { publicId: string; university: string | null; consulate: string; visaStatus: keyof typeof VISA_STATUS_LABELS; waitingListDate: Date | null };

export default function RecentEntries({ applicants }: { applicants: Applicant[] }) {
  return <section className="card overflow-hidden" aria-labelledby="recent-entries-heading">
    <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div><h2 id="recent-entries-heading" className="text-[18px] font-semibold text-ink-900">Recent entries</h2><p className="mt-0.5 text-xs text-mute">Latest approved applications</p></div>
      <Link href="/tracker" className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700">View all <Icon name="arrowUpRight" size={14}/></Link>
    </header>
    {applicants.length === 0 ? <p className="px-5 py-5 text-sm text-mute">No approved entries yet.</p> : <ul className="divide-y divide-line">
      {applicants.map((a) => { const color = VISA_STATUS_HEX[a.visaStatus] || "#64748b"; return <li key={a.publicId}>
        <Link href={`/tracker/${a.publicId}`} className="group flex min-h-16 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-paper-sunk active:bg-paper-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink-700 sm:px-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-paper-sunk text-ink-700"><Icon name="school" size={17}/></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink-900">{a.university || "University not listed"}</span><span className="mt-0.5 block truncate text-xs text-mute">{a.publicId} · {a.waitingListDate ? fmtDate(a.waitingListDate) : "Date not recorded"}</span></span>
          <span className="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium text-ink-900" style={{ backgroundColor: `${color}1a` }}><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true"/> {VISA_STATUS_LABELS[a.visaStatus]}</span>
          <Icon name="chevronRight" size={15} className="shrink-0 text-mute"/>
        </Link>
      </li>; })}
    </ul>}
  </section>;
}
