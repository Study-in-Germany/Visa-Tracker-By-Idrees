"use client";

import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import ListingForm from "@/components/accommodation/ListingForm";

export default function AdminNewListingPage() {
  return (
    <div>
      <PageHeader title="Add accommodation" actions={<Link href="/admin/accommodation" className="btn-secondary">Back to list</Link>} />
      <ListingForm admin />
    </div>
  );
}
