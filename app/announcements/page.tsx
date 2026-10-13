import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, ErrorState } from "@/components/ui/States";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  let announcements: Awaited<ReturnType<typeof prisma.announcement.findMany>> = [];
  let failed = false;
  try {
    announcements = await prisma.announcement.findMany({ orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] });
  } catch (e) {
    console.error("[announcements] query failed", e);
    failed = true;
  }

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Announcements" title="Latest updates" description="Notes from the community admins." />
      {failed ? (
        <div className="card"><ErrorState error="The database isn't reachable right now." /></div>
      ) : announcements.length === 0 ? (
        <div className="card"><EmptyState title="No announcements yet" hint="Check back soon." /></div>
      ) : (
        <ul className="space-y-3">
          {announcements.map((a) => (
            <li key={a.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <h2 className="font-semibold text-lg">{a.title}</h2>
                <time dateTime={a.createdAt.toISOString()} className="text-xs text-ink-600">{fmtDate(a.createdAt)}</time>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {a.pinned && <Chip tone="accent">Pinned</Chip>}
                {a.consulate && <Chip>{a.consulate}</Chip>}
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-ink-700">{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
