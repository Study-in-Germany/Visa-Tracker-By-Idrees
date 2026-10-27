import type { ImportJob, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type StepResult = "created" | "updated" | "skipped";
export type Logger = (msg: string) => void;

/** One import source. `prepare` runs once (builds payload/total); `step` handles one item and must be safe to repeat. */
export interface Handler {
  prepare?(job: ImportJob, log: Logger): Promise<{ payload?: Prisma.InputJsonValue; total: number }>;
  step(job: ImportJob, index: number, log: Logger): Promise<StepResult>;
}

const handlers = new Map<string, Handler>();
export const registerHandler = (kind: string, h: Handler) => handlers.set(kind, h);

const MAX_LOG = 150;

export async function createJob(kind: string, opts: { payload?: Prisma.InputJsonValue; total?: number; startedBy?: string } = {}) {
  return prisma.importJob.create({ data: { kind, payload: opts.payload, total: opts.total ?? 0, startedBy: opts.startedBy } });
}

/**
 * Processes a job for up to `budgetMs`, saving progress as it goes. Call repeatedly (from the admin page, a script or cron)
 * until status is DONE. Because the cursor is stored in the database, an interrupted job simply continues where it stopped.
 */
export async function runSlice(jobId: string, budgetMs = 8000): Promise<ImportJob> {
  let job = await prisma.importJob.findUniqueOrThrow({ where: { id: jobId } });
  if (job.status === "DONE" || job.status === "FAILED") return job;
  const handler = handlers.get(job.kind);
  if (!handler) return prisma.importJob.update({ where: { id: jobId }, data: { status: "FAILED", error: `Unknown job kind "${job.kind}"`, finishedAt: new Date() } });

  const lines: string[] = [];
  const log: Logger = (m) => lines.push(`${new Date().toISOString().slice(11, 19)} ${m}`);
  const counts = { created: 0, updated: 0, skipped: 0, failed: 0, processed: 0 };
  const started = Date.now();

  try {
    if (job.status === "QUEUED") {
      const prep = handler.prepare ? await handler.prepare(job, log) : { total: job.total };
      job = await prisma.importJob.update({ where: { id: jobId }, data: { status: "RUNNING", total: prep.total, ...(prep.payload !== undefined ? { payload: prep.payload } : {}) } });
      log(`Started: ${prep.total} items`);
    }
    let cursor = job.cursor;
    while (cursor < job.total && Date.now() - started < budgetMs) {
      try {
        counts[await handler.step(job, cursor, log)]++;
      } catch (e: any) {
        counts.failed++;
        log(`FAILED #${cursor}: ${String(e?.message ?? e).slice(0, 160)}`);
      }
      counts.processed++;
      cursor++;
    }
    const done = cursor >= job.total;
    const prevLog = Array.isArray(job.log) ? (job.log as string[]) : [];
    return await prisma.importJob.update({
      where: { id: jobId },
      data: {
        cursor,
        processed: { increment: counts.processed }, created: { increment: counts.created }, updated: { increment: counts.updated },
        skipped: { increment: counts.skipped }, failed: { increment: counts.failed },
        log: [...prevLog, ...lines].slice(-MAX_LOG),
        ...(done ? { status: "DONE", finishedAt: new Date() } : {}),
      },
    });
  } catch (e: any) {
    return prisma.importJob.update({ where: { id: jobId }, data: { status: "FAILED", error: String(e?.message ?? e).slice(0, 500), finishedAt: new Date(), log: [...lines].slice(-MAX_LOG) } });
  }
}

/** Runs a job to completion in one go (scripts and cron). */
export async function runToEnd(jobId: string, onProgress?: (j: ImportJob) => void) {
  for (;;) {
    const j = await runSlice(jobId, 20_000);
    onProgress?.(j);
    if (j.status === "DONE" || j.status === "FAILED") return j;
  }
}

/** Jobs that were RUNNING but have not been touched for a while (e.g. the server restarted): the admin page offers to resume them. */
export const staleThreshold = () => new Date(Date.now() - 2 * 60_000);
