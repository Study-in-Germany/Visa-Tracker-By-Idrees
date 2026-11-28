import { prisma } from "@/lib/db";

/** In-memory sliding-window limiter (used as fast fallback or in unit tests). */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const k of hits.keys()) {
      if (!hits.get(k)!.some((t) => now - t < windowMs)) hits.delete(k);
    }
  }
  return true;
}

/**
 * Persistent Postgres-backed fixed-window rate limiter shared across serverless/node instances.
 * Falls back safely to in-memory limiter if DB is unavailable (e.g. isolated unit tests).
 */
export async function rateLimitPersistent(
  key: string,
  max: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfterSeconds?: number }> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + windowMs);

    const bucket = await prisma.$transaction(async (tx) => {
      const existing = await tx.rateLimitBucket.findUnique({ where: { key } });
      if (!existing || existing.expiresAt <= now) {
        return tx.rateLimitBucket.upsert({
          where: { key },
          create: { key, count: 1, windowStart: now, expiresAt },
          update: { count: 1, windowStart: now, expiresAt },
        });
      }
      return tx.rateLimitBucket.update({
        where: { key },
        data: { count: { increment: 1 } },
      });
    });

    if (bucket.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.expiresAt.getTime() - now.getTime()) / 1000));
      return { ok: false, retryAfterSeconds };
    }
    return { ok: true };
  } catch {
    const ok = rateLimit(key, max, windowMs);
    return ok ? { ok: true } : { ok: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
}
