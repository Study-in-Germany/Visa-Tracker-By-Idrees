import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { apiError, clientKey, getActor } from "@/lib/permissions";
import { reportSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";
import { REPORT_AUTO_REVIEW_THRESHOLD } from "@/lib/marketplace";

// POST /api/listings/:id/report — anyone can report a live listing, once. Several distinct reports pull it back into review.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  const reporterKey = actor.role === "applicant" ? actor.applicantId : actor.role === "admin" ? `admin:${actor.email}` : `ip:${clientKey(req)}`;
  if (!rateLimit(`report:${reporterKey}`, 5, 3600_000)) return apiError("Too many reports. Please try again later.", 429);

  const parsed = reportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const listing = await prisma.listing.findUnique({ where: { id: params.id }, select: { id: true, ownerId: true, status: true } });
  if (!listing || (listing.status !== "APPROVED" && listing.status !== "RENTED")) return apiError("Listing not found.", 404);
  if (actor.role === "applicant" && actor.applicantId === listing.ownerId) return apiError("You can't report your own listing.", 400);

  try {
    await prisma.listingReport.create({
      data: { listingId: listing.id, reporterKey, reason: parsed.data.reason, details: parsed.data.details || null },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return apiError("You've already reported this listing. Thanks, we'll take a look.", 409);
    throw e;
  }

  const open = await prisma.listingReport.count({ where: { listingId: listing.id, status: "OPEN" } });
  if (open >= REPORT_AUTO_REVIEW_THRESHOLD && listing.status === "APPROVED") {
    await prisma.listing.update({ where: { id: listing.id }, data: { status: "PENDING_REVIEW" } });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
