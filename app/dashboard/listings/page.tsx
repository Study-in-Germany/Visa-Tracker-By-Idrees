"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import { EmptyState, ErrorState, Notice } from "@/components/ui/States";
import Pagination from "@/components/ui/Pagination";
import ListingCard, { ListingGrid, ListingGridSkeleton } from "@/components/accommodation/ListingCard";
import OwnerActions from "@/components/accommodation/OwnerActions";
import { useApi } from "@/hooks/useApi";
import { useState } from "react";
import type { ListingCardDto, Paged } from "@/lib/marketplace";

function MyListings() {
  const posted = useSearchParams().get("posted") === "1";
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi<Paged<ListingCardDto>>(`/api/listings?scope=mine&page=${page}&pageSize=12`);
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader title="My listings" />
      {posted && <div className="mb-4"><Notice tone="success">Published. Your listing is live now.</Notice></div>}

      {error && items.length === 0 ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : loading && items.length === 0 ? (
        <ListingGridSkeleton count={4} />
      ) : items.length === 0 ? (
        <div className="card"><EmptyState title="You haven't posted anything yet" hint="Have a spare room or are moving out? Help the next student." action={<Link href="/accommodation/new" className="btn-gold mt-1">Post a place</Link>} /></div>
      ) : (
        <div className={loading ? "opacity-60" : ""}>
          <ListingGrid>
            {items.map((l) => (
              <div key={l.id} className="space-y-2">
                <ListingCard l={l} />
                {l.status === "REJECTED" && <p className="text-xs text-red-700">Removed by a moderator. Open it to see why.</p>}
                <OwnerActions id={l.id} status={l.status} kind={l.kind} compact onChanged={reload} onDeleted={reload} />
              </div>
            ))}
          </ListingGrid>
          <Pagination className="mt-6" page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} total={data?.count} noun="listings" onPage={setPage} />
        </div>
      )}
    </>
  );
}

export default function MyListingsPage() {
  return (
    <Suspense fallback={<ListingGridSkeleton count={4} />}>
      <MyListings />
    </Suspense>
  );
}
