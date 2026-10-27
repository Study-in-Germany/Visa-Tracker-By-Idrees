"use client";

import ListingCard, { ListingGrid } from "./ListingCard";
import { useApi } from "@/hooks/useApi";
import type { ListingCardDto, Paged } from "@/lib/marketplace";

/** "More in <city>": other live posts of the same kind in the same city. Renders nothing when there are none. */
export default function SimilarListings({ id, city, kind }: { id: string; city: string; kind: string }) {
  const { data } = useApi<Paged<ListingCardDto>>(`/api/listings?city=${encodeURIComponent(city)}&kind=${kind}&pageSize=5`);
  const items = (data?.items ?? []).filter((l) => l.id !== id).slice(0, 4);
  if (items.length === 0) return null;
  return (
    <section className="mt-10 border-t border-line pt-6" aria-label={`More in ${city}`}>
      <h2 className="mb-4 text-[16px] font-semibold">{kind === "SEEKING" ? `More requests in ${city}` : `More places in ${city}`}</h2>
      <ListingGrid>{items.map((l) => <ListingCard key={l.id} l={l} />)}</ListingGrid>
    </section>
  );
}
