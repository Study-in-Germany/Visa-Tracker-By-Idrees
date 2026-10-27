import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, canManageListing, getActor, unauthorized } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/listings/:id/contact — contact details are shown to signed-in users only, so they can't be scraped anonymously.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  if (actor.role === "guest") return unauthorized();
  const key = actor.role === "applicant" ? actor.applicantId : actor.email;
  if (!rateLimit(`contact:${key}`, 60, 3600_000)) return apiError("You're viewing contacts too quickly. Please try again later.", 429);

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: { ownerId: true, status: true, contactName: true, contactPhone: true, contactEmail: true },
  });
  if (!listing || (listing.status !== "APPROVED" && !canManageListing(actor, listing))) return apiError("Listing not found.", 404);
  const { contactName, contactPhone, contactEmail } = listing;
  return NextResponse.json({ contact: { contactName, contactPhone, contactEmail } });
}
