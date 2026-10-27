import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Chip";
import Icon from "@/components/ui/Icon";
import { EmptyState, ErrorState } from "@/components/ui/States";

export const dynamic = "force-dynamic";

type Row = Awaited<ReturnType<typeof prisma.announcement.findMany>>[number];

function Card({ a }: { a: Row }) {
  const isNew = Date.now() - a.createdAt.getTime() < 7 * 86_400_000;
  return (
    <li className={`card flex flex-col p-5 ${a.pinned ? "border-clay-400/50 bg-clay-50/40" : ""}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {a.pinned && <Chip tone="accent"><Icon name="flag" size={10} /> Pinned</Chip>}
        {isNew && <Chip tone="good">New</Chip>}
        {a.consulate && <Chip>{a.consulate}</Chip>}
        <time dateTime={a.createdAt.toISOString()} className="ml-auto text-xs text-mute">{fmtDate(a.createdAt)}</time>
      </div>
      <h2 className="mt-3 text-[16px] font-semibold leading-snug">{a.title}</h2>
      <p className="mt-2 whitespace-pre-line break-words text-[14px] leading-relaxed text-ink-700">{a.body}</p>
    </li>
  );
}

export default async function AnnouncementsPage() {
  let announcements: Row[] = [];
  let failed = false;
  try {
    announcements = await prisma.announcement.findMany({ orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] });
  } catch (e) {
    console.error("[announcements] query failed", e);
    failed = true;
  }

  return (
    <>
      <PageHeader title="Announcements" />
      {failed ? (
        <div className="card"><ErrorState error="The database isn't reachable right now." /></div>
      ) : announcements.length === 0 ? (
        <div className="card"><EmptyState title="No announcements yet" hint="Updates from the community admins will show up here." /></div>
      ) : (
        <ul className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {announcements.map((a) => <Card key={a.id} a={a} />)}
        </ul>
      )}
    </>
  );
}
