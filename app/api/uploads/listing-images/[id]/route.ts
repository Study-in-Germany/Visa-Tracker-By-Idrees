import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, canManageListing, forbidden, getActor, unauthorized } from "@/lib/permissions";
import { deleteImageFiles } from "@/lib/listings";

// DELETE /api/uploads/listing-images/:id — removes the photo and its stored files. Owner or admin.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  if (actor.role === "guest") return unauthorized();
  const image = await prisma.listingImage.findUnique({ where: { id: params.id }, select: { id: true, ownerId: true, storageKey: true, listingId: true } });
  if (!image) return apiError("Photo not found.", 404);
  if (!canManageListing(actor, image)) return forbidden();

  if (image.listingId) {
    const count = await prisma.listingImage.count({ where: { listingId: image.listingId } });
    if (count <= 1) return apiError("A listing needs at least one photo.", 409);
  }
  await deleteImageFiles([image]);
  await prisma.listingImage.delete({ where: { id: image.id } });
  return NextResponse.json({ ok: true });
}
