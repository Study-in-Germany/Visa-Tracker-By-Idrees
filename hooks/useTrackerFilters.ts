"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SortState } from "@/components/ui/DataTable";
import { useApplicants } from "@/hooks/useApplicants";
import { useApi } from "@/hooks/useApi";
import { useStats } from "@/hooks/useStats";
import { useDebounced } from "@/hooks/useDebounced";
import type { Period } from "@/lib/period";

export interface TrackerFilterValues {
  consulate: string;
  visaStatus: string;
  intake: string;
  university: string;
  period: Period;
}

export const EMPTY_TRACKER_FILTERS: TrackerFilterValues = {
  consulate: "",
  visaStatus: "",
  intake: "",
  university: "",
  period: { from: "", to: "" },
};

/**
 * Centralized filter, search, URL sync, sorting, pagination, and canonical data hook
 * for the /tracker workspace.
 */
export function useTrackerFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const spString = sp.toString();
  const lastSyncedQsRef = useRef<string>(spString);

  const [search, setSearch] = useState(sp.get("q") || "");
  const [consulate, setConsulate] = useState(sp.get("consulate") || "");
  const [university, setUniversity] = useState(sp.get("university") || "");
  const [intake, setIntake] = useState(sp.get("intake") || "");
  const [visaStatus, setVisaStatus] = useState(sp.get("visaStatus") || "");
  const [period, setPeriod] = useState<Period>({
    from: sp.get("from") || "",
    to: sp.get("to") || "",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState>(null);

  // Sync URL -> state only on external URL navigation (global search, Back button)
  useEffect(() => {
    if (spString === lastSyncedQsRef.current) return;
    lastSyncedQsRef.current = spString;
    setSearch(sp.get("q") || "");
    setConsulate(sp.get("consulate") || "");
    setUniversity(sp.get("university") || "");
    setIntake(sp.get("intake") || "");
    setVisaStatus(sp.get("visaStatus") || "");
    setPeriod({ from: sp.get("from") || "", to: sp.get("to") || "" });
  }, [sp, spString]);

  const facets = useApi<{ universities: { value: string }[]; intakes: { value: string }[] }>(
    "/api/applicants/facets"
  );
  const universityOptions = useMemo(
    () => [
      { value: "", label: "All universities" },
      ...(facets.data?.universities ?? []).map((u) => ({ value: u.value, label: u.value })),
    ],
    [facets.data]
  );
  const intakeOptions = useMemo(
    () => [
      { value: "", label: "All intakes" },
      ...(facets.data?.intakes ?? []).map((i) => ({ value: i.value, label: i.value })),
    ],
    [facets.data]
  );

  const q = useDebounced(search.trim(), 250);

  const syncUrl = useCallback(
    (next: {
      q: string;
      consulate: string;
      university: string;
      intake: string;
      visaStatus: string;
      period: Period;
    }) => {
      const p = new URLSearchParams();
      if (next.q) p.set("q", next.q);
      if (next.consulate) p.set("consulate", next.consulate);
      if (next.university) p.set("university", next.university);
      if (next.intake) p.set("intake", next.intake);
      if (next.visaStatus) p.set("visaStatus", next.visaStatus);
      if (next.period.from) p.set("from", next.period.from);
      if (next.period.to) p.set("to", next.period.to);
      const qs = p.toString();
      if (qs === spString) return;
      lastSyncedQsRef.current = qs;
      router.replace(qs ? `/tracker?${qs}` : "/tracker", { scroll: false });
    },
    [router, spString]
  );

  useEffect(() => {
    syncUrl({ q, consulate, university, intake, visaStatus, period });
  }, [q, consulate, university, intake, visaStatus, period, syncUrl]);

  const queryFilters = useMemo(
    () => ({ q, consulate, university, intake, visaStatus, from: period.from, to: period.to }),
    [q, consulate, university, intake, visaStatus, period]
  );

  useEffect(() => setPage(1), [queryFilters, pageSize]);

  const { data, error, loading, reload } = useApplicants(queryFilters, page, sort, pageSize);
  const stats = useStats(period, consulate);

  const values: TrackerFilterValues = useMemo(
    () => ({ consulate, visaStatus, intake, university, period }),
    [consulate, visaStatus, intake, university, period]
  );

  const activeFilterCount = [
    visaStatus,
    consulate,
    university,
    intake,
    period.from || period.to ? "1" : "",
  ].filter(Boolean).length;

  const hasFilters = Boolean(q || activeFilterCount > 0);

  const applyFilters = useCallback((next: TrackerFilterValues) => {
    setConsulate(next.consulate);
    setVisaStatus(next.visaStatus);
    setIntake(next.intake);
    setUniversity(next.university);
    setPeriod(next.period);
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setConsulate("");
    setUniversity("");
    setIntake("");
    setVisaStatus("");
    setPeriod({ from: "", to: "" });
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (key: string) => {
      setSort((prev) =>
        prev?.key !== key ? { key, dir: "asc" } : prev.dir === "asc" ? { key, dir: "desc" } : null
      );
      setPage(1);
    },
    []
  );

  return {
    rows: data?.applicants ?? [],
    totalCount: data?.count,
    currentPage: data?.page ?? page,
    pageCount: data?.pageCount ?? 1,
    pageSize,
    setPage,
    setPageSize,
    sort,
    toggleSort,
    loading,
    error,
    reload,
    stats: stats.data,
    statsLoading: stats.loading,
    values,
    universityOptions,
    intakeOptions,
    activeFilterCount,
    hasFilters,
    applyFilters,
    clearAllFilters,
  };
}
