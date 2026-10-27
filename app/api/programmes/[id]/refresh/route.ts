import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";
import { createJob, runSlice } from "@/lib/import";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/programmes/:id/refresh — admin only. Re-checks that this programme's official and application links still respond
// and stamps the check time. (Admission details themselves are edited by admins or imported from official files.)
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getActor();
  if (actor.role !== "admin") return actor.role === "guest" ? unauthorized() : forbidden();
  if (!(await prisma.programme.findUnique({ where: { id: params.id }, select: { id: true } }))) return apiError("Programme not found.", 404);

  const job = await createJob("programme-links", { payload: { ids: [params.id] }, total: 1, startedBy: actor.email });
  await prisma.importJob.update({ where: { id: job.id }, data: { status: "RUNNING" } });
  await runSlice(job.id, 20_000);
  const p = await prisma.programme.findUnique({ where: { id: params.id }, select: { linkStatus: true, lastCheckedAt: true } });
  return NextResponse.json({ linkStatus: p?.linkStatus ?? null, lastCheckedAt: p?.lastCheckedAt ?? null });
}
