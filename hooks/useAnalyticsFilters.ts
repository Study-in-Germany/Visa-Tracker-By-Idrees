"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import type { AnalyticsDashboardPayload, AnalyticsFilterState } from "@/lib/analytics/dashboard-types";
import type { Embassy } from "@/lib/forecasting/types";

export const EMPTY_ANALYTICS_FILTERS: AnalyticsFilterState = {
  from: "",
  to: "",
  consulate: "",
  visaStatus: "",
  university: "",
  intake: "",
};

/**
 * Isolated URL-synced filter state & canonical data fetcher for /analytics.
 * Does not share filter state with /tracker.
 */
export function useAnalyticsFilters(options?: {
  fixtureData?: AnalyticsDashboardPayload | null;
  fixtureLoading?: boolean;
  fixtureError?: string | null;
}) {
  const isFixture = options?.fixtureData !== undefined || options?.fixtureLoading || options?.fixtureError !== undefined;
  const router = useRouter();
  const sp = useSearchParams();
  const spString = sp.toString();
  const lastSyncedQsRef = useRef<string>(spString);

  const [from, setFrom] = useState(isFixture ? "" : sp.get("from") || "");
  const [to, setTo] = useState(isFixture ? "" : sp.get("to") || "");
  const [consulate, setConsulate] = useState(isFixture ? "" : sp.get("consulate") || "");
  const [visaStatus, setVisaStatus] = useState(isFixture ? "" : sp.get("visaStatus") || "");
  const [university, setUniversity] = useState(isFixture ? "" : sp.get("university") || "");
  const [intake, setIntake] = useState(isFixture ? "" : sp.get("intake") || "");
  const [localIntelEmbassy, setLocalIntelEmbassy] = useState<Embassy>(() => {
    const c = isFixture ? "" : sp.get("consulate") || "";
    if (c === "Karachi") return "Karachi";
    return "Islamabad";
  });

  // Sync URL -> state only on external browser navigation (Back/Forward)
  useEffect(() => {
    if (isFixture) return;
    if (spString === lastSyncedQsRef.current) return;
    lastSyncedQsRef.current = spString;
    setFrom(sp.get("from") || "");
    setTo(sp.get("to") || "");
    setConsulate(sp.get("consulate") || "");
    setVisaStatus(sp.get("visaStatus") || "");
    setUniversity(sp.get("university") || "");
    setIntake(sp.get("intake") || "");
  }, [isFixture, sp, spString]);

  // Keep Embassy Intelligence aligned when global consulate is pinned
  const activeIntelEmbassy: Embassy =
    consulate === "Islamabad" || consulate === "Karachi" ? consulate : localIntelEmbassy;

  const setIntelEmbassy = useCallback(
    (emb: Embassy) => {
      setLocalIntelEmbassy(emb);
      if (consulate === "Islamabad" || consulate === "Karachi") {
        setConsulate(emb);
      }
    },
    [consulate]
  );

  const syncUrl = useCallback(
    (next: AnalyticsFilterState) => {
      if (isFixture) return;
      const p = new URLSearchParams();
      if (next.from) p.set("from", next.from);
      if (next.to) p.set("to", next.to);
      if (next.consulate) p.set("consulate", next.consulate);
      if (next.visaStatus) p.set("visaStatus", next.visaStatus);
      if (next.university) p.set("university", next.university);
      if (next.intake) p.set("intake", next.intake);
      const qs = p.toString();
      if (qs === spString) return;
      lastSyncedQsRef.current = qs;
      router.replace(qs ? `/analytics?${qs}` : "/analytics", { scroll: false });
    },
    [isFixture, router, spString]
  );

  useEffect(() => {
    syncUrl({ from, to, consulate, visaStatus, university, intake });
  }, [from, to, consulate, visaStatus, university, intake, syncUrl]);

  const apiUrl = useMemo(() => {
    if (isFixture) return null;
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (consulate) p.set("consulate", consulate);
    if (visaStatus) p.set("visaStatus", visaStatus);
    if (university) p.set("university", university);
    if (intake) p.set("intake", intake);
    const qs = p.toString();
    return `/api/analytics/dashboard${qs ? `?${qs}` : ""}`;
  }, [isFixture, from, to, consulate, visaStatus, university, intake]);

  const api = useApi<AnalyticsDashboardPayload>(apiUrl);

  const filters: AnalyticsFilterState = useMemo(
    () => ({ from, to, consulate, visaStatus, university, intake }),
    [from, to, consulate, visaStatus, university, intake]
  );

  const activeFilterCount = [
    from || to ? "1" : "",
    consulate,
    visaStatus,
    university,
    intake,
  ].filter(Boolean).length;

  const applyFilters = useCallback((next: AnalyticsFilterState) => {
    setFrom(next.from);
    setTo(next.to);
    setConsulate(next.consulate);
    setVisaStatus(next.visaStatus);
    setUniversity(next.university);
    setIntake(next.intake);
  }, []);

  const resetFilters = useCallback(() => {
    setFrom("");
    setTo("");
    setConsulate("");
    setVisaStatus("");
    setUniversity("");
    setIntake("");
  }, []);

  const toggleConsulateFilter = useCallback((target: string) => {
    setConsulate((prev) => (prev === target ? "" : target));
  }, []);

  const toggleStatusFilter = useCallback((target: string) => {
    setVisaStatus((prev) => (prev === target ? "" : target));
  }, []);

  const toggleUniversityFilter = useCallback((targetKey: string) => {
    setUniversity((prev) => (prev === targetKey ? "" : targetKey));
  }, []);

  // In fixture mode, apply lightweight client-side subsetting for interactive tests when filters change
  const resolvedData = useMemo(() => {
    if (!isFixture) return api.data;
    const base = options?.fixtureData ?? null;
    if (!base) return null;
    if (!consulate && !visaStatus && !university) return base;

    // For fixture interactivity, adjust summary & distributions deterministically when consulate is toggled
    if (consulate && (consulate === "Islamabad" || consulate === "Karachi")) {
      const embRow = base.embassyDistribution.find((e) => e.consulate === consulate);
      const total = embRow?.total ?? 0;
      const issued = embRow?.issued ?? 0;
      const rejected = embRow?.rejected ?? 0;
      const active = embRow?.active ?? 0;
      return {
        ...base,
        filtersApplied: { ...base.filtersApplied, consulate, visaStatus, university, intake, from, to },
        summary: {
          ...base.summary,
          total,
          activeApplicants: active,
          visaIssued: issued,
          visaRejected: rejected,
          decidedCases: issued + rejected,
          approvalRatePct: issued + rejected > 0 ? Math.round((issued / (issued + rejected)) * 1000) / 10 : null,
        },
        embassyDistribution: base.embassyDistribution.map((e) => ({
          ...e,
          total: e.consulate === consulate ? e.total : 0,
          sharePct: e.consulate === consulate ? 100 : 0,
        })),
      };
    }
    return base;
  }, [isFixture, api.data, options?.fixtureData, consulate, visaStatus, university, intake, from, to]);

  return {
    data: resolvedData,
    loading: isFixture ? Boolean(options?.fixtureLoading) : api.loading,
    error: isFixture ? (options?.fixtureError ?? null) : api.error,
    reload: api.reload,
    filters,
    activeFilterCount,
    setPeriod: (p: { from: string; to: string }) => {
      setFrom(p.from);
      setTo(p.to);
    },
    setConsulate,
    setVisaStatus,
    setUniversity,
    setIntake,
    applyFilters,
    resetFilters,
    toggleConsulateFilter,
    toggleStatusFilter,
    toggleUniversityFilter,
    activeIntelEmbassy,
    setIntelEmbassy,
  };
}
