import { NextRequest, NextResponse } from "next/server";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";
import { runSlice } from "@/lib/import";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/admin/imports/:id/run — processes the next slice of a job and returns its progress. Safe to call again after an interruption.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const a = await getActor();
  if (a.role !== "admin") return a.role === "guest" ? unauthorized() : forbidden();
  try {
    const { payload: _p, ...job } = await runSlice(params.id, 6000);
    return NextResponse.json({ job });
  } catch {
    return apiError("Import job not found.", 404);
  }
}
