"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar, { FilterSection, FilterTrigger } from "@/components/ui/FilterBar";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import { EmptyState, ErrorState } from "@/components/ui/States";
import CategoryBar from "@/components/accommodation/CategoryBar";
import ListingCard, { ListingGrid, ListingGridSkeleton } from "@/components/accommodation/ListingCard";
import ListingFiltersBar, { LISTING_FILTER_DEFAULTS, SORT_OPTIONS, availableBy, categoryParams, listingChips } from "@/components/accommodation/ListingFilters";
import { useApi } from "@/hooks/useApi";
import { useSaved } from "@/hooks/useSaved";
import { useUrlState } from "@/hooks/useUrlState";
import type { ListingCardDto, Paged } from "@/lib/marketplace";

type Response = Paged<ListingCardDto> & { cities: string[] };

function Browse() {
  // The search box lives in the header and writes ?q=, which this page reads like any other filter.
  const [f, set, reset] = useUrlState(LISTING_FILTER_DEFAULTS);
  const saved = useSaved();
  const savedMode = f.saved === "1";
  const [filtersOpen, setFiltersOpen] = useState(false);

  const params = new URLSearchParams({ sort: f.sort, ...categoryParams(f.cat) });
  const map: [string, string][] = [["q", f.q], ["city", f.city], ["minPrice", f.min], ["maxPrice", f.max], ["availableBy", availableBy(f.avail)], ["includeRented", f.rented || (savedMode ? "1" : "")], ["anmeldung", f.anmeldung], ["furnished", f.furnished], ["bills", f.bills], ["page", f.page]];
  for (const [k, v] of map) if (v) params.set(k, v);
  if (savedMode) params.set("ids", saved.ids.join(","));
  // Nothing saved yet: no request needed.
  const skip = savedMode && saved.ids.length === 0;
  const { data, error, loading, reload } = useApi<Response>(skip ? null : `/api/listings?${params}`);

  const chips = listingChips(f, set);
  const filtered = !!f.q || chips.length > 0 || !!f.cat;
  const items = skip ? [] : data?.items ?? [];

  return (
    <>
      <PageHeader title="Accommodation" count={skip ? 0 : data?.count} />
      <CategoryBar
        value={f.cat}
        onChange={(cat) => set({ cat, saved: "" })}
        savedCount={saved.ids.length}
        savedActive={savedMode}
        onSaved={() => set({ saved: savedMode ? "" : "1", cat: "" })}
        actions={
          <>
            <Select variant="pill" label="Sort by" value={f.sort} onChange={(v) => set({ sort: v })} options={SORT_OPTIONS} className="max-md:hidden" buttonClassName="!min-h-[40px] !rounded-full !px-4 font-medium" />
            <FilterTrigger count={chips.length} onClick={() => setFiltersOpen(true)} />
          </>
        }
      />

      <FilterBar
        active={chips}
        onClear={() => set({ city: "", min: "", max: "", avail: "", anmeldung: "", furnished: "", bills: "", rented: "" })}
        resultCount={skip ? 0 : data?.count}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
      >
        {/* Sort sits in the toolbar on wider screens; on phones it lives here */}
        <div className="md:hidden">
          <FilterSection title="Sort by"><Select label="Sort by" value={f.sort} onChange={(v) => set({ sort: v })} options={SORT_OPTIONS} /></FilterSection>
        </div>
        <ListingFiltersBar f={f} set={set} cities={data?.cities ?? []} />
      </FilterBar>

      {error && items.length === 0 ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : loading && items.length === 0 && !skip ? (
        <ListingGridSkeleton />
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            title={savedMode ? "No saved places yet" : filtered ? "Nothing matches these filters" : "No places listed yet"}
            hint={savedMode ? "Tap the heart on a listing to keep it here." : filtered ? "Try a wider price range or another category." : "Be the first to post a room, or tell people what you're looking for."}
            action={savedMode ? <button type="button" className="btn-secondary mt-1" onClick={() => set({ saved: "" })}>Browse all</button> : filtered ? <button type="button" className="btn-secondary mt-1" onClick={reset}>Clear filters</button> : <Link href="/accommodation/new" className="btn-gold mt-1">Post a place</Link>}
          />
        </div>
      ) : (
        <div className={`transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
          <ListingGrid>
            {items.map((l, i) => <ListingCard key={l.id} l={l} priority={i < 4} />)}
          </ListingGrid>
          <Pagination className="mt-6" page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} total={data?.count} noun="places" onPage={(p) => set({ page: String(p) })} />
        </div>
      )}
    </>
  );
}

export default function AccommodationPage() {
  return (
    <Suspense fallback={<ListingGridSkeleton />}>
      <Browse />
    </Suspense>
  );
}
