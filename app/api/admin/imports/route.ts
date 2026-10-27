import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, forbidden, getActor, unauthorized } from "@/lib/permissions";
import { JOB_KINDS, createJob, parseHrkTsv, parseProgrammeFile, staleThreshold, type JobKind } from "@/lib/import";

export const runtime = "nodejs";
const MAX_FILE = 5 * 1024 * 1024;

async function admin() {
  const a = await getActor();
  return a.role === "admin" ? a : null;
}

// GET /api/admin/imports — recent jobs (newest first), with a flag for jobs that look interrupted.
export async function GET() {
  const a = await getActor();
  if (a.role !== "admin") return a.role === "guest" ? unauthorized() : forbidden();
  const jobs = await prisma.importJob.findMany({ orderBy: { createdAt: "desc" }, take: 15, select: { id: true, kind: true, status: true, total: true, processed: true, created: true, updated: true, skipped: true, failed: true, error: true, log: true, createdAt: true, updatedAt: true, finishedAt: true } });
  const cutoff = staleThreshold();
  return NextResponse.json({ jobs: jobs.map((j) => ({ ...j, interrupted: (j.status === "RUNNING" || j.status === "QUEUED") && j.updatedAt < cutoff })) });
}

// POST /api/admin/imports — multipart: kind (+ file for "hrk" and "programmes"). Creates a job; the page then calls /run until it is DONE.
export async function POST(req: NextRequest) {
  const a = await admin();
  if (!a) return (await getActor()).role === "guest" ? unauthorized() : forbidden();

  const form = await req.formData().catch(() => null);
  const kind = String(form?.get("kind") ?? "") as JobKind;
  if (!JOB_KINDS.includes(kind)) return apiError("Unknown import type.", 400);

  const running = await prisma.importJob.count({ where: { kind, status: { in: ["QUEUED", "RUNNING"] }, updatedAt: { gt: staleThreshold() } } });
  if (running) return apiError("This import is already running.", 409);

  let payload: any;
  let total = 0;
  if (kind === "hrk" || kind === "programmes") {
    const file = form?.get("file");
    if (!(file instanceof File)) return apiError("Choose a file to import.", 400);
    if (file.size > MAX_FILE) return apiError("The file is too large (5 MB max).", 413);
    const buf = Buffer.from(await file.arrayBuffer());
    try {
      const rows = kind === "hrk" ? parseHrkTsv(buf.toString("utf8")) : await parseProgrammeFile(file.name, buf);
      if (!rows.length) return apiError("No rows found in that file.", 422);
      payload = { rows, fileName: file.name };
      total = rows.length;
    } catch (e: any) {
      return apiError(e?.message || "Couldn't read that file.", 422);
    }
  }
  const job = await createJob(kind, { payload, total, startedBy: a.email });
  return NextResponse.json({ id: job.id }, { status: 201 });
}
