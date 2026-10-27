import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { stripRichText } from "@/lib/richtext";
import type { ListingCardDto, ListingDetailDto, ListingImageDto } from "@/lib/marketplace";

const imageSelect = { id: true, thumbUrl: true, cardUrl: true, fullUrl: true, width: true, height: true } as const;

export const listingCardSelect = {
  id: true, title: true, type: true, city: true, district: true, rentEur: true, billsIncluded: true, kind: true, anmeldung: true,
  furnished: true, availableFrom: true, status: true, createdAt: true, description: true,
  images: { select: imageSelect, orderBy: { position: "asc" as const }, take: 1 },
  _count: { select: { images: true } },
} satisfies Prisma.ListingSelect;

type CardRow = Prisma.ListingGetPayload<{ select: typeof listingCardSelect }>;

export function toCard(l: CardRow): ListingCardDto {
  const { images, _count, availableFrom, createdAt, description, ...rest } = l;
  const text = stripRichText(description).replace(/s+/g, " ").trim();
  return {
    ...rest,
    excerpt: l.kind === "SEEKING" && text ? (text.length > 140 ? text.slice(0, 137) + "…" : text) : null,
    availableFrom: availableFrom.toISOString(),
    createdAt: createdAt.toISOString(),
    cover: (images[0] as ListingImageDto | undefined) ?? null,
    imageCount: _count.images,
  };
}

export const listingDetailInclude = {
  images: { select: imageSelect, orderBy: { position: "asc" as const } },
  // Only anonymous trust signals about the poster; never their identity.
  owner: { select: { approval: true, createdAt: true, _count: { select: { listings: true } } } },
} satisfies Prisma.ListingInclude;

type DetailRow = Prisma.ListingGetPayload<{ include: typeof listingDetailInclude }>;

/** Detail view. Contact details and the owner's identity are never included; contact has its own gated endpoint. */
export function toDetail(l: DetailRow, flags: { isOwner: boolean; canManage: boolean }): ListingDetailDto {
  return {
    id: l.id, title: l.title, description: l.description, type: l.type, city: l.city, district: l.district,
    rentEur: l.rentEur, depositEur: l.depositEur, billsIncluded: l.billsIncluded, furnished: l.furnished,
    kind: l.kind, excerpt: null, anmeldung: l.anmeldung, sizeSqm: l.sizeSqm, minStayMonths: l.minStayMonths, genderPreference: l.genderPreference,
    availableFrom: l.availableFrom.toISOString(), createdAt: l.createdAt.toISOString(), status: l.status,
    // The rejection reason is only useful to the owner and moderators.
    rejectionReason: flags.canManage ? l.rejectionReason : null,
    images: l.images, imageCount: l.images.length, ...flags,
    poster: { verified: l.owner.approval === "APPROVED", memberSince: l.owner.createdAt.toISOString(), listingCount: l.owner._count.listings },
    ...(flags.canManage ? { contact: { contactName: l.contactName, contactPhone: l.contactPhone, contactEmail: l.contactEmail } } : {}),
  };
}

/** Removes the stored WebP variants for these image rows (best effort: a storage hiccup must not block the user's action). */
export async function deleteImageFiles(images: { storageKey: string }[]) {
  if (!images.length) return;
  try {
    const storage = getStorage();
    const keys = images.flatMap((i) => [320, 800, 1600].map((w) => `${i.storageKey}/${w}.webp`));
    await storage.removePrefix(keys);
  } catch (e) {
    console.error("Could not delete stored images:", e);
  }
}

/** Photos uploaded but never attached to a listing (abandoned forms) are purged after a day. */
export async function purgeStaleUploads(ownerId: string) {
  const stale = await prisma.listingImage.findMany({
    where: { ownerId, listingId: null, createdAt: { lt: new Date(Date.now() - 24 * 3600_000) } },
    select: { id: true, storageKey: true },
  });
  if (!stale.length) return;
  await deleteImageFiles(stale);
  await prisma.listingImage.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
}

/** Whether a listing may be shown to someone who is neither its owner nor an admin. */
export const isPublic = (status: string) => status === "APPROVED" || status === "RENTED";
