"use client";

import PageHeader from "@/components/ui/PageHeader";
import ListingForm from "@/components/accommodation/ListingForm";
import SignInGate from "@/components/accommodation/SignInGate";

export default function NewListingPage() {
  return (
    <div>
      <PageHeader title="Post a place" />
      <SignInGate next="/accommodation/new">
        <ListingForm />
      </SignInGate>
    </div>
  );
}
