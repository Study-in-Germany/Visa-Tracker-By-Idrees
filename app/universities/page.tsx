"use client";

import { Suspense, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar, { FilterTrigger } from "@/components/ui/FilterBar";
import Pagination from "@/components/ui/Pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import Icon from "@/components/ui/Icon";
import UniversityCard, { UniversityRow } from "@/components/universities/UniversityCard";
import { institutionLabel } from "@/lib/marketplace";
import UniversityFilters, { UNI_FILTER_DEFAULTS, uniChips } from "@/components/universities/UniversityFilters";
import { useApi } from "@/hooks/useApi";
import { useUrlState } from "@/hooks/useUrlState";
import type { Paged, UniversityDto } from "@/lib/marketplace";

type Response = Paged<UniversityDto> & { states: string[]; types: string[] };

function CardSkeletons() {
  return (
    <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="card space-y-3 p-4">
          <div className="flex gap-3"><Skeleton className="h-12 w-12 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

function Directory() {
  // The search box lives in the header and writes ?q=, which this page reads like any other filter.
  const [f, set, reset] = useUrlState(UNI_FILTER_DEFAULTS);
  const params = new URLSearchParams({ pageSize: "24" });
  for (const [k, v] of Object.entries(f)) if (v) params.set(k, v);
  const { data, error, loading, reload } = useApi<Response>(`/api/universities?${params}`);
  const chips = uniChips(f, set);
  const filtered = !!f.q || chips.length > 0 || !!f.type || !!f.withProgrammes;
  const items = data?.items ?? [];
  const list = f.view === "list";
  const [filtersOpen, setFiltersOpen] = useState(false);

  const chip = (on: boolean) => `inline-flex min-h-[38px] shrink-0 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors ${on ? "border-ink-800 bg-ink-800 text-paper-raised" : "border-line-strong bg-paper-raised text-ink-800 hover:bg-paper-sunk"}`;
  const viewBtn = (on: boolean) => `grid h-9 w-10 place-items-center rounded-full transition-colors ${on ? "bg-ink-800 text-paper-raised" : "text-ink-700 hover:bg-paper-sunk"}`;

  return (
    <>
      <PageHeader title="Universities" count={data?.count} />

      {/* Toolbar: quick filters scroll on the left; view switch and Filters stay pinned on the right */}
      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div role="group" aria-label="Quick filters" className="-mx-3 flex min-w-0 flex-1 gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <button type="button" aria-pressed={!f.type && !f.withProgrammes} onClick={() => set({ type: "", withProgrammes: "" })} className={chip(!f.type && !f.withProgrammes)}>All</button>
        {(data?.types ?? []).map((t) => (
          <button key={t} type="button" aria-pressed={f.type === t} onClick={() => set({ type: f.type === t ? "" : t })} className={chip(f.type === t)}>{institutionLabel(t)}</button>
        ))}
        <button type="button" aria-pressed={f.withProgrammes === "1"} onClick={() => set({ withProgrammes: f.withProgrammes === "1" ? "" : "1" })} className={chip(f.withProgrammes === "1")}>With programmes</button>
      </div>
      <div className="flex items-center gap-2 sm:shrink-0 [&>button]:flex-1 sm:[&>button]:flex-none">
      <div role="group" aria-label="View" className="inline-flex shrink-0 rounded-full border border-line-strong bg-paper-raised p-0.5">
        <button type="button" aria-pressed={!list} aria-label="Grid view" onClick={() => set({ view: "" })} className={viewBtn(!list)}><Icon name="grid" size={16} /></button>
        <button type="button" aria-pressed={list} aria-label="List view" onClick={() => set({ view: "list" })} className={viewBtn(list)}><Icon name="queue" size={16} /></button>
      </div>
      <FilterTrigger count={chips.length} onClick={() => setFiltersOpen(true)} />
      </div>
      </div>

      <FilterBar active={chips} onClear={reset} resultCount={data?.count} open={filtersOpen} onOpenChange={setFiltersOpen}>
        <UniversityFilters f={f} set={set} states={data?.states ?? []} types={data?.types ?? []} />
      </FilterBar>

      {error && items.length === 0 ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : loading && items.length === 0 ? (
        <CardSkeletons />
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            title={filtered ? "No universities match" : "No universities listed yet"}
            hint={filtered ? "Try removing a filter or searching for something broader." : "Universities appear here once an admin imports them."}
            action={filtered ? <button type="button" className="btn-secondary mt-1" onClick={reset}>Clear filters</button> : undefined}
          />
        </div>
      ) : (
        <div className={`transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
          {list ? (
            <ul className="space-y-2">{items.map((u) => <UniversityRow key={u.id} u={u} />)}</ul>
          ) : (
            <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {items.map((u) => <UniversityCard key={u.id} u={u} />)}
            </div>
          )}
          <Pagination className="mt-5" page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} total={data?.count} noun="universities" onPage={(p) => set({ page: String(p) })} />
        </div>
      )}
    </>
  );
}

export default function UniversitiesPage() {
  return (
    <Suspense fallback={<CardSkeletons />}>
      <Directory />
    </Suspense>
  );
}
