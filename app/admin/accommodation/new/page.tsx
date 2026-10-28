"use client";

import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import ListingForm from "@/components/accommodation/ListingForm";

export default function AdminNewListingPage() {
  return (
    <div>
      <PageHeader title="Add accommodation" description="Post a room or flat for students. It appears on the public Accommodation page straight away." actions={<Link href="/admin/accommodation" className="btn-secondary">Back to list</Link>} />
      <ListingForm admin />
    </div>
  );
}
