import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  let announcements: any[] = [];
  try {
    announcements = await prisma.announcement.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    });
  } catch {
    announcements = [];
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-navy-950">📢 Latest Updates</h1>
      {announcements.length === 0 && (
        <p className="text-gray-400 text-center py-12">No announcements yet.</p>
      )}
      <div className="space-y-4">
        {announcements.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-navy-950">
                {a.pinned && "📌 "}
                {a.title}
              </h2>
              <span className="text-xs text-gray-400 shrink-0">{fmtDate(a.createdAt)}</span>
            </div>
            {a.consulate && (
              <span className="badge bg-navy-50 text-navy-800 border-navy-100 mt-2">{a.consulate}</span>
            )}
            <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
