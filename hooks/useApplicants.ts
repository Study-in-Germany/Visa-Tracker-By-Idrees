"use client";

import { useMemo } from "react";
import { useApi } from "./useApi";
import type { SortState } from "@/components/ui/DataTable";
import type { ApplicantsResponse } from "@/lib/types";

export type ApplicantFilters = {
  q?: string;
  consulate?: string;
  visaStatus?: string;
  approval?: string;
  from?: string;
  to?: string;
};

/** Paginated, sortable applicants query shared by the public tracker and the admin list. */
export function useApplicants(filters: ApplicantFilters, page: number, sort: SortState, pageSize = 25) {
  const url = useMemo(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) p.set(k, v);
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    if (sort) {
      p.set("sort", sort.key);
      p.set("dir", sort.dir);
    }
    return `/api/applicants?${p.toString()}`;
  }, [filters, page, sort, pageSize]);
  return useApi<ApplicantsResponse>(url);
}
