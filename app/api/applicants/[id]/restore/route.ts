import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await getSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // A single conditional write makes concurrent restores deterministic and
  // preserves approval, status, credentials, history, and the reserved public ID.
  const result = await prisma.applicant.updateMany({
    where: { id: params.id, deletedAt: { not: null } },
    data: { deletedAt: null },
  });
  if (!result.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
