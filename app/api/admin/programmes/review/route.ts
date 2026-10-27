import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { forbidden, getActor, unauthorized } from "@/lib/permissions";

// GET /api/admin/programmes/review — programmes with an imported value that conflicts with verified data, or flagged NEEDS_REVIEW.
export async function GET() {
  const a = await getActor();
  if (a.role !== "admin") return a.role === "guest" ? unauthorized() : forbidden();
  const items = await prisma.programme.findMany({
    where: { OR: [{ verification: "NEEDS_REVIEW" }, { pendingChange: { not: Prisma.DbNull } }] },
    select: { id: true, name: true, degreeLevel: true, winterDeadline: true, summerDeadline: true, verification: true, sourceUrl: true, pendingChange: true, university: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ items });
}
