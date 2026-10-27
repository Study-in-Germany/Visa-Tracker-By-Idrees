import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";
import { pageMeta, parsePaging } from "@/lib/pagination";

// GET /api/admin/reports?status=OPEN|RESOLVED|DISMISSED — listing reports for moderators.
export async function GET(req: NextRequest) {
  const actor = await getActor();
  if (actor.role !== "admin") return actor.role === "guest" ? unauthorized() : forbidden();
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") || "OPEN";
  if (!["OPEN", "RESOLVED", "DISMISSED"].includes(status)) return apiError("Invalid status", 400);

  const { page, pageSize, skip, take } = parsePaging(sp, 20);
  const where = { status: status as "OPEN" | "RESOLVED" | "DISMISSED" };
  const [count, rows] = await Promise.all([
    prisma.listingReport.count({ where }),
    prisma.listingReport.findMany({
      where, orderBy: { createdAt: "desc" }, skip, take,
      select: { id: true, reason: true, details: true, status: true, createdAt: true, listing: { select: { id: true, title: true, city: true, status: true } } },
    }),
  ]);
  return NextResponse.json({ items: rows, ...pageMeta(count, page, pageSize) });
}
