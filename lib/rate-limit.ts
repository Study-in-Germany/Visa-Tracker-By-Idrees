/** Small in-memory sliding-window limiter for abuse-prone endpoints. Per server instance; DB constraints are the hard backstop. */
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
  if (hits.size > 5000) for (const k of hits.keys()) { if (!hits.get(k)!.some((t) => now - t < windowMs)) hits.delete(k); }
  return true;
}
