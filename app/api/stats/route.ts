import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { waitingListWhere } from "@/lib/period";
import { ACTIVE_STATUSES, CONSULATES } from "@/lib/constants";

// GET /api/stats?from=&to=&consulate=
// Lightweight headline numbers for the tracker: one grouped COUNT, no rows transferred.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const consulate = sp.get("consulate") || undefined;
  if (consulate && !CONSULATES.includes(consulate)) return NextResponse.json({ error: "Invalid consulate filter" }, { status: 400 });
  const waitingListDate = waitingListWhere(sp.get("from"), sp.get("to"));

  const groups = await prisma.applicant.groupBy({
    by: ["visaStatus"],
    where: { approval: "APPROVED", ...(consulate ? { consulate } : {}), ...(waitingListDate ? { waitingListDate } : {}) },
    _count: { _all: true },
  });

  const byStatus: Record<string, number> = {};
  for (const g of groups) byStatus[g.visaStatus] = g._count._all;
  const total = Object.values(byStatus).reduce((s, n) => s + n, 0);
  const active = new Set<string>(ACTIVE_STATUSES);
  const activeApplicants = Object.entries(byStatus).reduce((s, [k, n]) => s + (active.has(k) ? n : 0), 0);

  return NextResponse.json(
    { total, activeApplicants, visaIssued: byStatus.VISA_ISSUED || 0, visaRejected: byStatus.VISA_REJECTED || 0, byStatus },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
  );
}
