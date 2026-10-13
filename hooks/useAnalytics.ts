"use client";

import { useMemo } from "react";
import { useApi } from "./useApi";
import { periodParams, type Period } from "@/lib/period";
import type { Analytics } from "@/lib/types";

export function useAnalytics(period: Period, consulate: string) {
  const url = useMemo(() => {
    const p = periodParams(period);
    if (consulate) p.set("consulate", consulate);
    const qs = p.toString();
    return `/api/analytics${qs ? `?${qs}` : ""}`;
  }, [period, consulate]);
  return useApi<Analytics>(url);
}
