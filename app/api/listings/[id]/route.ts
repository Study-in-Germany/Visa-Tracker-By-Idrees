import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, canManageListing, forbidden, getActor, unauthorized, type Actor } from "@/lib/permissions";
import { listingActionSchema, listingUpdateSchema } from "@/lib/validations";
import { deleteImageFiles, isPublic, listingDetailInclude, toDetail } from "@/lib/listings";
import { parseCalendarDay } from "@/lib/period";

const notFound = () => apiError("Listing not found.", 404);

const flagsFor = (actor: Actor, ownerId: string) => ({
  isOwner: actor.role === "applicant" && actor.applicantId === ownerId,
  canManage: canManageListing(actor, { ownerId }),
});

// GET /api/listings/:id — live listings are public; anything else is visible to its owner and admins only.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  const listing = await prisma.listing.findUnique({ where: { id: params.id }, include: listingDetailInclude });
  if (!listing) return notFound();
  const flags = flagsFor(actor, listing.ownerId);
  if (!isPublic(listing.status) && !flags.canManage) return notFound();
  return NextResponse.json({ listing: toDetail(listing, flags) });
}

// PATCH /api/listings/:id — edit fields, or { action: "markRented" | "reopen" }. Owner or admin.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  if (actor.role === "guest") return unauthorized();
  const existing = await prisma.listing.findUnique({ where: { id: params.id }, select: { id: true, ownerId: true, status: true, kind: true } });
  if (!existing) return notFound();
  if (!canManageListing(actor, existing)) return forbidden();

  const body = await req.json().catch(() => null);
  if (!body) return apiError("Invalid JSON body", 400);

  if ("action" in body) {
    const parsed = listingActionSchema.safeParse(body);
    if (!parsed.success) return apiError("Unknown action", 400);
    if (parsed.data.action === "markRented") {
      if (existing.status !== "APPROVED") return apiError("Only live listings can be marked as rented.", 409);
      await prisma.listing.update({ where: { id: existing.id }, data: { status: "RENTED", rentedAt: new Date() } });
    } else {
      if (existing.status !== "RENTED") return apiError("This listing isn't marked as rented.", 409);
      // RENTED is only reachable from APPROVED, so re-opening restores it without another review.
      await prisma.listing.update({ where: { id: existing.id }, data: { status: "APPROVED", rentedAt: null } });
    }
    return NextResponse.json({ ok: true });
  }

  const parsed = listingUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { imageIds: submittedImages, availableFrom, ...fields } = parsed.data;
  const imageIds = (fields.kind ?? existing.kind) === "SEEKING" && submittedImages ? [] : submittedImages;

  // Photos: only the owner's own, either unattached or already on this listing.
  let removed: { id: string; storageKey: string }[] = [];
  if (imageIds) {
    if (imageIds.length === 0 && (fields.kind ?? existing.kind) === "OFFERING") return apiError("Add at least one photo.", 400);
    const owned = await prisma.listingImage.findMany({
      where: { id: { in: imageIds }, ownerId: existing.ownerId, OR: [{ listingId: null }, { listingId: existing.id }] },
      select: { id: true },
    });
    if (owned.length !== new Set(imageIds).size) return apiError("One of the photos is no longer available. Please upload it again.", 400);
    removed = await prisma.listingImage.findMany({ where: { listingId: existing.id, id: { notIn: imageIds } }, select: { id: true, storageKey: true } });
  }


  await prisma.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id: existing.id },
      data: {
        ...fields,
        ...("district" in fields ? { district: fields.district || null } : {}),
        ...("contactPhone" in fields ? { contactPhone: fields.contactPhone || null } : {}),
        ...("contactEmail" in fields ? { contactEmail: fields.contactEmail || null } : {}),
        ...(availableFrom ? { availableFrom: parseCalendarDay(availableFrom)! } : {}),
      },
    });
    if (imageIds) {
      await tx.listingImage.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });
      await Promise.all(imageIds.map((id, position) => tx.listingImage.update({ where: { id }, data: { listingId: existing.id, position } })));
    }
  });
  await deleteImageFiles(removed);
  return NextResponse.json({ ok: true });
}

// DELETE /api/listings/:id — permanently removes the listing and its stored photos. Owner or admin.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  if (actor.role === "guest") return unauthorized();
  const existing = await prisma.listing.findUnique({ where: { id: params.id }, select: { id: true, ownerId: true, images: { select: { storageKey: true } } } });
  if (!existing) return notFound();
  if (!canManageListing(actor, existing)) return forbidden();
  await deleteImageFiles(existing.images);
  await prisma.listing.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
