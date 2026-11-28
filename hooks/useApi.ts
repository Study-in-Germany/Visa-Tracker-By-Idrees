"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

// Module-level stale-while-revalidate cache: revisiting a page or a filter shows the
// last result immediately and refreshes it in the background. In-flight requests are shared.
const cache = new Map<string, { data: unknown; at: number }>();
const inflight = new Map<string, Promise<unknown>>();
const listeners = new Set<(prefix?: string, reset?: boolean) => void>();
const FRESH_MS = 5_000;
const MAX_ENTRIES = 80;
let generation = 0;

function remember(url: string, data: unknown, expectedGen: number) {
  if (expectedGen !== generation) return;
  cache.delete(url);
  cache.set(url, { data, at: Date.now() });
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}

/** Drop cached responses and notify active mounted subscribers whose URL matches `prefix`. */
export function invalidateApi(prefix?: string) {
  if (!prefix) generation += 1;
  for (const k of Array.from(cache.keys())) {
    if (!prefix || k.startsWith(prefix)) cache.delete(k);
  }
  for (const k of Array.from(inflight.keys())) {
    if (!prefix || k.startsWith(prefix)) inflight.delete(k);
  }
  for (const fn of Array.from(listeners)) {
    fn(prefix, false);
  }
}

/**
 * Full session-boundary reset: clears all cached and in-flight data, bumps generation so
 * stale responses from the prior session cannot repopulate state, and resets mounted hooks to null.
 */
export function resetApiCache() {
  generation += 1;
  cache.clear();
  inflight.clear();
  for (const fn of Array.from(listeners)) {
    fn(undefined, true);
  }
}

function request<T>(url: string): Promise<{ data: T; gen: number }> {
  const reqGen = generation;
  let p = inflight.get(url) as Promise<{ data: T; gen: number }> | undefined;
  if (!p) {
    p = apiFetch<T>(url)
      .then((d) => {
        remember(url, d, reqGen);
        return { data: d, gen: reqGen };
      })
      .finally(() => inflight.delete(url));
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
    if (url === null) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const onInvalidate = (prefix?: string, reset?: boolean) => {
      if (reset) {
        seq.current += 1;
        setData(null);
        setError(null);
        setLoading(false);
        return;
      }
      if (!prefix || url.startsWith(prefix)) {
        setTick((t) => t + 1);
      }
    };
    listeners.add(onInvalidate);
    return () => {
      listeners.delete(onInvalidate);
    };
  }, [url]);

  useEffect(() => {
    if (url === null) return;
    const id = ++seq.current;
    const activeGen = generation;
    const hit = cache.get(url);
    if (hit) setData(hit.data as T);
    setError(null);
    if (hit && tick === 0 && Date.now() - hit.at < FRESH_MS) {
      setLoading(false);
      return;
    }
    setLoading(!hit);
    if (tick > 0) {
      inflight.delete(url);
      if (!hit) setLoading(true);
    }
    request<T>(url)
      .then(({ data: d, gen }) => {
        if (id === seq.current && gen === generation && activeGen === generation) {
          setData(d);
        }
      })
      .catch((e) => {
        if (id !== seq.current || activeGen !== generation) return;
        setError(e instanceof ApiError ? e : new ApiError("Something went wrong.", 0));
      })
      .finally(() => {
        if (id === seq.current) setLoading(false);
      });
    return () => {
      seq.current++;
    };
  }, [url, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
