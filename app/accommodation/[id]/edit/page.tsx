"use client";

import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { ErrorState, LoadingBlock } from "@/components/ui/States";
import ListingForm from "@/components/accommodation/ListingForm";
import { useApi } from "@/hooks/useApi";
import type { ListingDetailDto } from "@/lib/marketplace";

export default function EditListingPage({ params }: { params: { id: string } }) {
  // Always refetch: the form must start from the saved version, not a cached one.
  const { data, error, loading, reload } = useApi<{ listing: ListingDetailDto }>(`/api/listings/${params.id}`);
  const l = data?.listing;

  return (
    <div>
      <PageHeader title="Edit listing" actions={<Link href={`/accommodation/${params.id}`} className="btn-secondary">Cancel</Link>} />
      {loading && !l ? (
        <LoadingBlock rows={5} />
      ) : error ? (
        <div className="card"><ErrorState error={error.status === 404 ? "This listing doesn't exist." : error} onRetry={reload} /></div>
      ) : l && !l.canManage ? (
        <div className="card"><ErrorState error="You can only edit your own listings." /></div>
      ) : l ? (
        <ListingForm listing={l} />
      ) : null}
    </div>
  );
}
