import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TEAM_PUBLIC_ID } from "@/lib/listings";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";

export const dynamic = "force-dynamic";
const DAYS = 30;

// GET /api/admin/overview — everything the admin dashboard shows, in one round trip.
export async function GET() {
  const a = await getActor();
  if (a.role !== "admin") return a.role === "guest" ? unauthorized() : forbidden();

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (DAYS - 1));

  try {
    const [byApproval, byVisaStatus, recentSubmissions, pendingApplicants, uniTotal, uniPublished, programmes, listingGroups, openReports, announcements, pendingListings, latestAnnouncements] = await Promise.all([
      prisma.applicant.groupBy({ by: ["approval"], where: { publicId: { not: TEAM_PUBLIC_ID } }, _count: { _all: true } }),
      prisma.applicant.groupBy({ by: ["visaStatus"], where: { approval: "APPROVED" }, _count: { _all: true } }),
      prisma.applicant.findMany({ where: { createdAt: { gte: since }, publicId: { not: TEAM_PUBLIC_ID } }, select: { createdAt: true } }),
      prisma.applicant.findMany({ where: { approval: "PENDING_REVIEW" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, publicId: true, name: true, university: true, consulate: true, createdAt: true } }),
      prisma.university.count(),
      prisma.university.count({ where: { published: true } }),
      prisma.programme.count(),
      prisma.listing.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.listingReport.count({ where: { status: "OPEN" } }),
      prisma.announcement.count(),
      prisma.listing.findMany({ where: { status: "PENDING_REVIEW" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, title: true, city: true, createdAt: true } }),
      prisma.announcement.findMany({ orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 3, select: { id: true, title: true, pinned: true, createdAt: true } }),
    ]);

    const approval = { PENDING_REVIEW: 0, APPROVED: 0, REJECTED: 0 } as Record<string, number>;
    for (const g of byApproval) approval[g.approval] = g._count._all;

    const perDay = new Map<string, number>();
    for (const r of recentSubmissions) {
      const k = r.createdAt.toISOString().slice(0, 10);
      perDay.set(k, (perDay.get(k) ?? 0) + 1);
    }
    const series = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { date: key, count: perDay.get(key) ?? 0 };
    });

    const listings: Record<string, number> = {};
    for (const g of listingGroups) listings[g.status] = g._count._all;

    return NextResponse.json({
      applicants: { pending: approval.PENDING_REVIEW, approved: approval.APPROVED, rejected: approval.REJECTED, total: approval.PENDING_REVIEW + approval.APPROVED + approval.REJECTED, byVisaStatus: Object.fromEntries(byVisaStatus.map((g) => [g.visaStatus, g._count._all])) },
      universities: { total: uniTotal, published: uniPublished, programmes },
      listings: { byStatus: listings, total: Object.values(listings).reduce((s, n) => s + n, 0), openReports },
      announcements: { total: announcements, latest: latestAnnouncements },
      series,
      queue: { applicants: pendingApplicants, listings: pendingListings },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Admin overview failed:", err);
    return apiError("Could not load the overview.", 500);
  }
}
