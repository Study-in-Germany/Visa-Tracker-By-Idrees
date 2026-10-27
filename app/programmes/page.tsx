"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar, { FilterSection, FilterTrigger } from "@/components/ui/FilterBar";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import Icon from "@/components/ui/Icon";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { ProgrammeCards, ProgrammeTable } from "@/components/programmes/ProgrammeList";
import ProgrammeFiltersForm, { PROGRAMME_FILTER_DEFAULTS, PROGRAMME_SORTS, programmeChips } from "@/components/programmes/ProgrammeFilters";
import { useApi } from "@/hooks/useApi";
import { COMPARE_KEY, COMPARE_MAX, SAVED_PROGRAMMES_KEY, useSaved } from "@/hooks/useSaved";
import { useSession } from "@/hooks/useSession";
import { useUrlState } from "@/hooks/useUrlState";
import type { ProgrammeList } from "@/lib/programme-types";

function Loading() {
  return <div className="space-y-2" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[72px] w-full rounded-xl" />)}</div>;
}

function CompareBar() {
  const { ids, clear } = useSaved(COMPARE_KEY, COMPARE_MAX);
  if (ids.length === 0) return null;
  return (
    <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-line-strong bg-paper-raised px-4 py-3 shadow-xl lg:bottom-6">
      <p className="text-[13px] font-medium">{ids.length} selected <span className="text-mute">(up to {COMPARE_MAX})</span></p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={clear} className="min-h-[40px] px-2 text-xs font-semibold text-mute hover:text-ink-900">Clear</button>
        {ids.length >= 2 ? (
          <Link href={`/programmes/compare?ids=${ids.join(",")}`} className="btn-primary !min-h-[40px]"><Icon name="layers" size={14} /> Compare</Link>
        ) : (
          <span className="text-xs text-mute">Pick one more</span>
        )}
      </div>
    </div>
  );
}

function Explorer() {
  const [f, set, reset] = useUrlState(PROGRAMME_FILTER_DEFAULTS);
  const saved = useSaved(SAVED_PROGRAMMES_KEY);
  const { role } = useSession();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const savedMode = f.saved === "1";

  const params = new URLSearchParams({ pageSize: "20" });
  for (const [k, v] of Object.entries(f)) if (v && k !== "saved") params.set(k, v);
  if (savedMode) params.set("ids", saved.ids.join(","));
  const skip = savedMode && saved.ids.length === 0;
  const { data, error, loading, reload } = useApi<ProgrammeList>(skip ? null : `/api/programmes?${params}`);

  const chips = programmeChips(f, set, data?.facets);
  const filtered = !!f.q || chips.length > 0;
  const items = skip ? [] : data?.items ?? [];

  const toggleSort = (key: string) => set(f.sort === key ? { dir: f.dir === "desc" ? "" : "desc" } : { sort: key, dir: "" });
  const chip = (on: boolean) => `inline-flex min-h-[38px] shrink-0 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors ${on ? "border-ink-800 bg-ink-800 text-paper-raised" : "border-line-strong bg-paper-raised text-ink-800 hover:bg-paper-sunk"}`;
  const degrees = f.degree.split(",").filter(Boolean);

  return (
    <>
      <PageHeader title="Programmes" count={skip ? 0 : data?.count} />

      {/* Toolbar: quick filters on the left, sort / filters / saved pinned on the right */}
      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div role="group" aria-label="Quick filters" className="-mx-3 flex min-w-0 flex-1 gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <button type="button" aria-pressed={!chips.length && !savedMode} onClick={() => reset()} className={chip(!chips.length && !savedMode)}>All</button>
          <button type="button" aria-pressed={degrees.includes("MASTER") && degrees.length === 1} onClick={() => set({ degree: f.degree === "MASTER" ? "" : "MASTER" })} className={chip(f.degree === "MASTER")}>Master&apos;s</button>
          <button type="button" aria-pressed={f.degree === "BACHELOR"} onClick={() => set({ degree: f.degree === "BACHELOR" ? "" : "BACHELOR" })} className={chip(f.degree === "BACHELOR")}>Bachelor&apos;s</button>
          <button type="button" aria-pressed={f.language === "English"} onClick={() => set({ language: f.language === "English" ? "" : "English" })} className={chip(f.language === "English")}>English</button>
          <button type="button" aria-pressed={f.tuitionFree === "1"} onClick={() => set({ tuitionFree: f.tuitionFree ? "" : "1" })} className={chip(f.tuitionFree === "1")}>Tuition-free</button>
          <button type="button" aria-pressed={f.deadline === "open"} onClick={() => set({ deadline: f.deadline ? "" : "open" })} className={chip(f.deadline === "open")}>Open deadlines</button>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0 [&>button]:flex-1 sm:[&>button]:flex-none">
        <Select variant="pill" label="Sort by" value={f.sort} onChange={(v) => set({ sort: v, dir: "" })} options={PROGRAMME_SORTS} className="max-md:hidden" buttonClassName="!min-h-[40px] !rounded-full !px-4 font-medium" />
        <FilterTrigger count={chips.length} onClick={() => setFiltersOpen(true)} />
        <button type="button" aria-pressed={savedMode} onClick={() => set({ saved: savedMode ? "" : "1" })} className={`btn-secondary relative !min-h-[40px] shrink-0 !rounded-full !px-3.5 ${savedMode ? "!border-ink-800 !bg-paper-sunk" : ""}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={savedMode ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3 5 6.5 5c2 0 3.5 1.1 5.5 3.2C14 6.1 15.5 5 17.5 5 21 5 22.8 8.6 21.5 11.8 19.5 16.4 12 21 12 21z" /></svg>
          <span className="hidden sm:inline">Saved{saved.ids.length ? ` (${saved.ids.length})` : ""}</span>
          <span className="text-[13px] sm:hidden">Saved{saved.ids.length ? ` (${saved.ids.length})` : ""}</span>
        </button>
        </div>
      </div>

      <FilterBar active={chips} onClear={() => set({ degree: "", intake: "", language: "", ielts: "", tuitionFree: "", route: "", deadline: "", uni: "", city: "", field: "" })} resultCount={skip ? 0 : data?.count} open={filtersOpen} onOpenChange={setFiltersOpen}>
        <div className="md:hidden">
          <FilterSection title="Sort by"><Select label="Sort by" value={f.sort} onChange={(v) => set({ sort: v, dir: "" })} options={PROGRAMME_SORTS} /></FilterSection>
        </div>
        <ProgrammeFiltersForm f={f} set={set} facets={data?.facets} />
      </FilterBar>

      {error && items.length === 0 ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : loading && items.length === 0 && !skip ? (
        <Loading />
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            title={savedMode ? "No bookmarked programmes yet" : filtered ? "No programmes match these filters" : "No programmes published yet"}
            hint={savedMode ? "Tap the heart on a programme to keep it here." : filtered ? "Try removing a filter. Programmes that haven't published a requirement are left out when you filter by it." : role === "admin" ? "Import verified programmes from a CSV/XLSX file, or add them from a university's page in the admin area." : "Programmes appear here once they have been added with a source. Check back soon."}
            action={savedMode ? <button type="button" className="btn-secondary mt-1" onClick={() => set({ saved: "" })}>Browse all</button> : filtered ? <button type="button" className="btn-secondary mt-1" onClick={reset}>Clear filters</button> : role === "admin" ? <Link href="/admin/imports" className="btn-primary mt-1">Open data imports</Link> : undefined}
          />
        </div>
      ) : (
        <div className={`transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
          <ProgrammeTable rows={items} sort={f.sort} dir={f.dir} onSort={toggleSort} />
          <ProgrammeCards rows={items} />
          <Pagination className="mt-5" page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} total={data?.count} noun="programmes" onPage={(p) => set({ page: String(p) })} />
        </div>
      )}

      <p className="mt-6 text-xs text-mute">Deadlines shown are for international (non-EU) applicants. Anything marked unconfirmed or not specified must be checked on the university&apos;s own page before you apply.</p>
      <CompareBar />
    </>
  );
}

export default function ProgrammesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Explorer />
    </Suspense>
  );
}
