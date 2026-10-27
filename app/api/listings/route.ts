import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";
import { listingSchema } from "@/lib/validations";
import { listingCardSelect, toCard } from "@/lib/listings";
import { pageMeta, parsePaging } from "@/lib/pagination";
import { parseCalendarDay } from "@/lib/period";

const TYPES = ["ROOM", "SHARED_ROOM", "STUDIO", "APARTMENT"];
const STATUSES = ["PENDING_REVIEW", "APPROVED", "REJECTED", "RENTED"];
const MAX_LISTINGS_PER_USER = 10;

const SORTS: Record<string, Prisma.ListingOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }],
  price_asc: [{ rentEur: "asc" }, { createdAt: "desc" }],
  price_desc: [{ rentEur: "desc" }, { createdAt: "desc" }],
  available: [{ availableFrom: "asc" }, { createdAt: "desc" }],
};

const intParam = (v: string | null) => (v && /^\d{1,6}$/.test(v) ? parseInt(v, 10) : undefined);

// GET /api/listings?scope=public|mine|admin&q=&city=&minPrice=&maxPrice=&type=ROOM,STUDIO&availableBy=YYYY-MM-DD&includeRented=1&sort=&page=
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const actor = await getActor();
  const scope = sp.get("scope") || "public";
  const where: Prisma.ListingWhereInput = {};

  if (scope === "mine") {
    if (actor.role !== "applicant") return unauthorized();
    where.ownerId = actor.applicantId;
  } else if (scope === "admin") {
    if (actor.role !== "admin") return actor.role === "guest" ? unauthorized() : forbidden();
  } else {
    where.status = sp.get("includeRented") === "1" ? { in: ["APPROVED", "RENTED"] } : "APPROVED";
  }

  const status = sp.get("status");
  if (scope !== "public" && status) {
    if (!STATUSES.includes(status)) return apiError("Invalid status filter", 400);
    where.status = status as any;
  }
  if (scope === "admin" && sp.get("reported") === "1") where.reports = { some: { status: "OPEN" } };

  const q = sp.get("q")?.trim().slice(0, 80);
  if (q) {
    const ci = { contains: q, mode: "insensitive" as const };
    where.OR = [{ title: ci }, { city: ci }, { district: ci }, { description: ci }];
  }
  const city = sp.get("city")?.trim();
  if (city) where.city = { equals: city, mode: "insensitive" };

  const minPrice = intParam(sp.get("minPrice"));
  const maxPrice = intParam(sp.get("maxPrice"));
  if (minPrice !== undefined || maxPrice !== undefined) where.rentEur = { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) };

  const kind = sp.get("kind");
  if (kind) {
    if (!["OFFERING", "SEEKING"].includes(kind)) return apiError("Invalid kind filter", 400);
    where.kind = kind as any;
  }
  if (sp.get("anmeldung") === "1") where.anmeldung = true;
  if (sp.get("furnished") === "1") where.furnished = true;
  if (sp.get("bills") === "1") where.billsIncluded = true;
  // "Saved places": the browser sends the ids it has saved (visibility rules above still apply).
  const ids = (sp.get("ids") || "").split(",").filter(Boolean).slice(0, 50);
  if (ids.length) where.id = { in: ids };
  const types = (sp.get("type") || "").split(",").filter(Boolean);
  if (types.length) {
    if (types.some((t) => !TYPES.includes(t))) return apiError("Invalid type filter", 400);
    where.type = { in: types as any };
  }
  const availableBy = sp.get("availableBy");
  if (availableBy) {
    const d = parseCalendarDay(availableBy);
    if (!d) return apiError("Invalid availability date", 400);
    where.availableFrom = { lte: d };
  }

  const { page, pageSize, skip, take } = parsePaging(sp);
  const orderBy = SORTS[sp.get("sort") || ""] ?? SORTS.newest;
  const isAdminScope = scope === "admin";

  const [count, rows, cities] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({ where, orderBy, skip, take, select: listingCardSelect }),
    scope === "public"
      ? prisma.listing.groupBy({ by: ["city"], where: { status: "APPROVED" }, _count: { _all: true }, orderBy: { city: "asc" } })
      : Promise.resolve(null),
  ]);

  // Moderators see how many unresolved reports each listing has.
  const reportCounts = isAdminScope && rows.length
    ? await prisma.listingReport.groupBy({ by: ["listingId"], where: { listingId: { in: rows.map((r) => r.id) }, status: "OPEN" }, _count: { _all: true } })
    : [];
  const openByListing = new Map(reportCounts.map((g) => [g.listingId, g._count._all]));
  const items = rows.map((r) => (isAdminScope ? { ...toCard(r), openReports: openByListing.get(r.id) ?? 0 } : toCard(r)));
  return NextResponse.json({ items, ...pageMeta(count, page, pageSize), ...(cities ? { cities: cities.map((c) => c.city) } : {}) });
}

// POST /api/listings — publish a listing (applicants only). It is live straight away.
export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (actor.role !== "applicant") return actor.role === "guest" ? unauthorized() : apiError("Listings are posted from an applicant account.", 403);

  const body = await req.json().catch(() => null);
  const parsed = listingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  // A "looking for a place" post is a request, not a property: it never carries photos.
  const { imageIds: submittedImages, ...data } = parsed.data;
  const imageIds = data.kind === "SEEKING" ? [] : submittedImages;

  if ((await prisma.listing.count({ where: { ownerId: actor.applicantId } })) >= MAX_LISTINGS_PER_USER) {
    return apiError(`You can have up to ${MAX_LISTINGS_PER_USER} listings. Delete an old one to add another.`, 409);
  }
  const images = await prisma.listingImage.findMany({ where: { id: { in: imageIds }, ownerId: actor.applicantId, listingId: null }, select: { id: true } });
  if (images.length !== new Set(imageIds).size) return apiError("One of the photos is no longer available. Please upload it again.", 400);

  const listing = await prisma.$transaction(async (tx) => {
    const created = await tx.listing.create({
      data: {
        ownerId: actor.applicantId,
        kind: data.kind ?? "OFFERING", anmeldung: data.anmeldung ?? false, minStayMonths: data.minStayMonths ?? null,
        sizeSqm: data.sizeSqm ?? null, genderPreference: data.genderPreference ?? "ANY",
        // Listings go live immediately; moderators can unpublish them, and repeated reports pull them back for review.
        status: "APPROVED", approvedAt: new Date(),
        title: data.title, description: data.description, type: data.type, city: data.city,
        district: data.district || null, rentEur: data.rentEur ?? null, depositEur: data.depositEur ?? null,
        billsIncluded: data.billsIncluded, furnished: data.furnished,
        availableFrom: parseCalendarDay(data.availableFrom)!,
        contactName: data.contactName, contactPhone: data.contactPhone || null, contactEmail: data.contactEmail || null,
      },
      select: { id: true },
    });
    await Promise.all(imageIds.map((id, position) => tx.listingImage.update({ where: { id }, data: { listingId: created.id, position } })));
    return created;
  });
  return NextResponse.json({ id: listing.id }, { status: 201 });
}
