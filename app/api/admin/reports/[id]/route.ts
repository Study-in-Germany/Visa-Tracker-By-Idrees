import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";
import { reportUpdateSchema } from "@/lib/validations";

// PATCH /api/admin/reports/:id — resolve, dismiss or reopen a report.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  if (actor.role !== "admin") return actor.role === "guest" ? unauthorized() : forbidden();
  const parsed = reportUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError("Invalid status", 400);
  const exists = await prisma.listingReport.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) return apiError("Report not found.", 404);
  await prisma.listingReport.update({ where: { id: params.id }, data: { status: parsed.data.status, resolvedAt: parsed.data.status === "OPEN" ? null : new Date() } });
  return NextResponse.json({ ok: true });
}
