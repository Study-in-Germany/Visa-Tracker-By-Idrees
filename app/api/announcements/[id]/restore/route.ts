import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await getSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await prisma.announcement.updateMany({
    where: { id: params.id, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
