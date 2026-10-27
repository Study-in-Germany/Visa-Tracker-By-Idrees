"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

// Module-level stale-while-revalidate cache: revisiting a page or a filter shows the
// last result immediately and refreshes it in the background. In-flight requests are shared.
const cache = new Map<string, { data: unknown; at: number }>();
const inflight = new Map<string, Promise<unknown>>();
const FRESH_MS = 5_000;
const MAX_ENTRIES = 80;

function remember(url: string, data: unknown) {
  cache.delete(url);
  cache.set(url, { data, at: Date.now() });
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}

/** Drop cached responses, all of them or those whose URL starts with `prefix`. Call after a mutation. */
export function invalidateApi(prefix?: string) {
  for (const k of Array.from(cache.keys())) if (!prefix || k.startsWith(prefix)) cache.delete(k);
}

function request<T>(url: string): Promise<T> {
  let p = inflight.get(url) as Promise<T> | undefined;
  if (!p) {
    p = apiFetch<T>(url).then((d) => { remember(url, d); return d; }).finally(() => inflight.delete(url));
    inflight.set(url, p);
  }
  return p;
}

/**
 * GET a JSON endpoint. Pass null to skip. Serves cached data instantly, revalidates in the
 * background, keeps the previous result on screen while a new URL loads, and exposes
 * loading/error so pages never hang on a blank "Loading…" when the request fails.
 */
export function useApi<T = any>(url: string | null) {
  const [data, setData] = useState<T | null>(() => (url ? ((cache.get(url)?.data as T) ?? null) : null));
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(() => url !== null && !cache.has(url));
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (url === null) return;
    const id = ++seq.current;
    const hit = cache.get(url);
    if (hit) setData(hit.data as T);
    setError(null);
    if (hit && tick === 0 && Date.now() - hit.at < FRESH_MS) { setLoading(false); return; }
    setLoading(!hit);
    if (tick > 0) { inflight.delete(url); setLoading(true); }
    request<T>(url)
      .then((d) => id === seq.current && setData(d))
      .catch((e) => {
        if (id !== seq.current) return;
        setError(e instanceof ApiError ? e : new ApiError("Something went wrong.", 0));
      })
      .finally(() => id === seq.current && setLoading(false));
    return () => { seq.current++; };
  }, [url, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
