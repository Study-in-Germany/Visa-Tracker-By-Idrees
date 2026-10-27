import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";

const bodySchema = z.object({ action: z.enum(["accept", "reject", "verify"]) });

// PATCH /api/admin/programmes/:id/review
//   accept: apply the imported (conflicting) deadlines   reject: keep the current data   verify: confirm the current data as correct today
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await getActor();
  if (a.role !== "admin") return a.role === "guest" ? unauthorized() : forbidden();
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("Unknown action.", 400);
  const p = await prisma.programme.findUnique({ where: { id: params.id } });
  if (!p) return apiError("Programme not found.", 404);

  const day = (s: unknown) => (typeof s === "string" ? new Date(`${s}T00:00:00Z`) : undefined);
  const change = p.pendingChange as { winterDeadline?: string | null; summerDeadline?: string | null; sourceUrl?: string | null; verified?: boolean } | null;

  if (parsed.data.action === "accept" && change) {
    await prisma.programme.update({
      where: { id: p.id },
      data: {
        winterDeadline: day(change.winterDeadline), summerDeadline: day(change.summerDeadline), sourceUrl: change.sourceUrl ?? undefined,
        verification: change.verified ? "VERIFIED" : "UNVERIFIED", deadlinesVerifiedAt: change.verified ? new Date() : null, pendingChange: Prisma.DbNull,
      },
    });
  } else if (parsed.data.action === "verify") {
    await prisma.programme.update({ where: { id: p.id }, data: { verification: "VERIFIED", deadlinesVerifiedAt: new Date(), pendingChange: Prisma.DbNull } });
  } else {
    await prisma.programme.update({ where: { id: p.id }, data: { pendingChange: Prisma.DbNull, ...(p.verification === "NEEDS_REVIEW" ? { verification: "UNVERIFIED" as const } : {}) } });
  }
  return NextResponse.json({ ok: true });
}
