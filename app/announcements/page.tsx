import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache";
import { fmtDate } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Chip";
import Icon from "@/components/ui/Icon";
import { EmptyState, ErrorState } from "@/components/ui/States";

export const revalidate = 60;

const getAnnouncements = unstable_cache(
  async () => {
    const rows = await prisma.announcement.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
  },
  ["announcements-list-v1"],
  { revalidate: 60, tags: [CACHE_TAGS.ANNOUNCEMENTS] },
);

type Row = Awaited<ReturnType<typeof getAnnouncements>>[number];

function Card({ a }: { a: Row }) {
  const isNew = Date.now() - new Date(a.createdAt).getTime() < 7 * 86_400_000;
  return (
    <li className={`card flex flex-col p-4 ${a.pinned ? "border-line-strong bg-paper-raised" : ""}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {a.pinned && <Chip tone="accent"><Icon name="flag" size={10} /> Pinned</Chip>}
        {isNew && <Chip tone="good">New</Chip>}
        {a.consulate && <Chip>{a.consulate}</Chip>}
        <time dateTime={a.createdAt} className="ml-auto text-xs tabular-nums text-mute">{fmtDate(a.createdAt)}</time>
      </div>
      <h2 className="mt-2.5 text-[15px] font-semibold leading-snug text-ink-900">{a.title}</h2>
      <p className="mt-1.5 whitespace-pre-line break-words text-[13px] leading-relaxed text-ink-700">{a.body}</p>
    </li>
  );
}

export default async function AnnouncementsPage() {
  let announcements: Row[] = [];
  let failed = false;
  try {
    announcements = await getAnnouncements();
  } catch (e) {
    console.error("[announcements] query failed", e);
    failed = true;
  }

  return (
    <>
      <PageHeader title="Announcements" description="Community updates and important notices." />
      {failed ? (
        <div className="card"><ErrorState error="The database isn't reachable right now." /></div>
      ) : announcements.length === 0 ? (
        <div className="card"><EmptyState title="No announcements yet" hint="Updates from the community admins will show up here." /></div>
      ) : (
        <ul className="grid items-start gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {announcements.map((a) => <Card key={a.id} a={a} />)}
        </ul>
      )}
    </>
  );
}
