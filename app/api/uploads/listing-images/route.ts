import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { apiError, getActor, unauthorized } from "@/lib/permissions";
import { IMAGE_LIMITS, ImageError, processImage } from "@/lib/images";
import { getStorage } from "@/lib/storage";
import { deleteImageFiles, getTeamOwnerId, purgeStaleUploads } from "@/lib/listings";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/uploads/listing-images — multipart, field "file". Signed-in applicants only.
// Validates the real file signature, size and dimensions, then stores three WebP variants.
export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (actor.role === "guest") return unauthorized();

  // Cheap early rejection before the body is buffered.
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > IMAGE_LIMITS.maxBytes + 64 * 1024) return apiError(`Each photo must be under ${IMAGE_LIMITS.maxBytes / 1024 / 1024} MB.`, 413);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return apiError("Choose a photo to upload.", 400);

  // Applicants upload for themselves. An admin editing a listing uploads on the listing owner's behalf.
  let ownerId: string;
  if (actor.role === "applicant") ownerId = actor.applicantId;
  else {
    const listingId = String(form?.get("listingId") ?? "");
    const target = listingId ? await prisma.listing.findUnique({ where: { id: listingId }, select: { ownerId: true } }) : null;
    // No listing yet means the admin is creating a new one, which belongs to the team account.
    ownerId = target ? target.ownerId : await getTeamOwnerId();
  }

  await purgeStaleUploads(ownerId);
  const [lastHour, pending] = await Promise.all([
    prisma.listingImage.count({ where: { ownerId, createdAt: { gt: new Date(Date.now() - 3600_000) } } }),
    prisma.listingImage.count({ where: { ownerId, listingId: null } }),
  ]);
  if (lastHour >= IMAGE_LIMITS.maxUploadsPerHour) return apiError("Upload limit reached. Please try again in a little while.", 429);
  if (pending >= IMAGE_LIMITS.maxPendingUploads) return apiError("Too many unsaved photos. Save your listing or remove some photos first.", 429);

  let processed;
  try {
    processed = await processImage(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof ImageError) return apiError(e.message, e.status);
    console.error("Image processing failed:", e);
    return apiError("We couldn't process that photo.", 500);
  }

  const storageKey = `listings/${ownerId}/${nanoid(16)}`;
  const storage = getStorage();
  try {
    await Promise.all(processed.variants.map((v) => storage.put(`${storageKey}/${v.width}.webp`, v.buffer, "image/webp")));
  } catch (e) {
    console.error("Image upload to storage failed:", e);
    await deleteImageFiles([{ storageKey }]);
    return apiError("Photo storage is unavailable right now. Please try again.", 502);
  }

  const image = await prisma.listingImage.create({
    data: {
      ownerId,
      storageKey,
      thumbUrl: storage.url(`${storageKey}/320.webp`),
      cardUrl: storage.url(`${storageKey}/800.webp`),
      fullUrl: storage.url(`${storageKey}/1600.webp`),
      width: processed.width,
      height: processed.height,
      bytes: processed.bytes,
    },
    select: { id: true, thumbUrl: true, cardUrl: true, fullUrl: true, width: true, height: true },
  });
  return NextResponse.json({ image }, { status: 201 });
}
