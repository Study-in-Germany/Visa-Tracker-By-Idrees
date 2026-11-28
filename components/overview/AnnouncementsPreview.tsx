import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { fmtDate } from "@/lib/format";

type Announcement = { id: string; title: string; body: string; pinned: boolean; consulate: string | null; createdAt: Date };

export default function AnnouncementsPreview({ announcements }: { announcements: Announcement[] }) {
  return <section className="card flex flex-col overflow-hidden xl:h-full" aria-labelledby="announcements-heading">
    <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-5"><h2 id="announcements-heading" className="text-[18px] font-semibold text-ink-900">Announcements</h2><Link href="/announcements" aria-label="View all announcements" className="grid min-h-11 min-w-11 place-items-center rounded-lg text-ink-700 hover:bg-paper-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700"><Icon name="arrowUpRight" size={15}/></Link></header>
    {announcements.length === 0 ? <div className="flex items-center justify-center px-5 py-6 xl:min-h-0 xl:flex-1"><div data-testid="announcements-empty-state" className="flex flex-col items-center gap-4 text-center"><span className="grid h-14 w-12 shrink-0 place-items-center rounded-full border border-line bg-paper-sunk text-ink-700"><Icon name="bell" size={24}/></span><div className="space-y-1 text-center"><p className="text-base font-semibold text-ink-900">You&apos;re all caught up.</p><p className="text-sm text-mute">No new announcements yet.</p></div></div></div> : <ul className="divide-y divide-line xl:min-h-0 xl:flex-1">{announcements.slice(0,3).map((a, i) => <li key={a.id} className={`px-4 py-3 sm:px-5 ${i === 0 ? "bg-paper-sunk/60" : ""}`}><Link href="/announcements" className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold text-ink-900">{a.title}</p><time className="shrink-0 text-[11px] text-mute">{fmtDate(a.createdAt)}</time></div>{(a.consulate || a.pinned) && <p className="mt-0.5 text-[11px] font-medium text-mute">{a.consulate || "Pinned"}</p>}<p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-700">{a.body}</p></Link></li>)}</ul>}
  </section>;
}
