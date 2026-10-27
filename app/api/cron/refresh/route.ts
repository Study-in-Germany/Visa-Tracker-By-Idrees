import { NextRequest, NextResponse } from "next/server";
import { createJob, runSlice } from "@/lib/import";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET /api/cron/refresh — called on a schedule (vercel.json). Authenticated with CRON_SECRET (Vercel sends it as a Bearer token).
// Each run expires stale verifications and re-checks a batch of the oldest-checked university websites; it resumes across runs.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const maintenance = await runSlice((await createJob("maintenance", { startedBy: "cron" })).id, 5000);
  const links = await runSlice((await createJob("linkcheck", { payload: { limit: 40 }, startedBy: "cron" })).id, 10_000);
  const programmes = await runSlice((await createJob("programme-links", { payload: { limit: 40 }, startedBy: "cron" })).id, 8_000);
  return NextResponse.json({ maintenance: maintenance.status, linkcheck: { status: links.status, processed: links.processed, total: links.total }, programmeLinks: { status: programmes.status, processed: programmes.processed, total: programmes.total } });
}
