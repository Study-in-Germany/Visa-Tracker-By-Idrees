"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

/**
 * GET a JSON endpoint. Pass null to skip. Refetches when the url changes,
 * cancels stale requests, and exposes loading/error so pages never hang
 * on a blank "Loading…" when the request fails.
 */
export function useApi<T = any>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(url !== null);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (url === null) return;
    const id = ++seq.current;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    apiFetch<T>(url, { signal: ctrl.signal })
      .then((d) => id === seq.current && setData(d))
      .catch((e) => {
        if (e?.name === "AbortError" || id !== seq.current) return;
        setError(e instanceof ApiError ? e : new ApiError("Something went wrong.", 0));
      })
      .finally(() => id === seq.current && setLoading(false));
    return () => ctrl.abort();
  }, [url, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
