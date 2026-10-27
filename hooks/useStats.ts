"use client";

import { useMemo } from "react";
import { useApi } from "./useApi";
import { periodParams, type Period } from "@/lib/period";

export type TrackerStats = {
  total: number;
  activeApplicants: number;
  visaIssued: number;
  visaRejected: number;
  byStatus: Record<string, number>;
};

export function useStats(period: Period, consulate: string) {
  const url = useMemo(() => {
    const p = periodParams(period);
    if (consulate) p.set("consulate", consulate);
    const qs = p.toString();
    return `/api/stats${qs ? `?${qs}` : ""}`;
  }, [period, consulate]);
  return useApi<TrackerStats>(url);
}
