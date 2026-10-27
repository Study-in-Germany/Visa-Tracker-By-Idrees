import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";
import { listingModerationSchema } from "@/lib/validations";

// PATCH /api/admin/listings/:id — approve, reject (with a reason for the owner) or send back to review. Admin only.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  if (actor.role !== "admin") return actor.role === "guest" ? unauthorized() : forbidden();

  const parsed = listingModerationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { status, rejectionReason } = parsed.data;

  const existing = await prisma.listing.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!existing) return apiError("Listing not found.", 404);

  await prisma.listing.update({
    where: { id: existing.id },
    data: {
      status,
      rejectionReason: status === "REJECTED" ? rejectionReason || null : null,
      approvedAt: status === "APPROVED" ? new Date() : null,
      rentedAt: null,
    },
  });
  return NextResponse.json({ ok: true });
}
