"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { Notice } from "@/components/ui/States";
import { ApiError, apiFetch } from "@/lib/api";

type Contact = { contactName: string; contactPhone: string | null; contactEmail: string | null };

/** Contact details are fetched on demand and only for signed-in users, so they can't be scraped from the page. */
export default function ContactReveal({ listingId }: { listingId: string }) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState("");

  async function reveal() {
    setBusy(true);
    setError("");
    try {
      setContact((await apiFetch<{ contact: Contact }>(`/api/listings/${listingId}/contact`)).contact);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setNeedsLogin(true);
      else setError(e instanceof ApiError ? e.message : "Couldn't load contact details.");
    } finally {
      setBusy(false);
    }
  }

  if (needsLogin) {
    return (
      <div className="space-y-2">
        <Notice>Sign in to see contact details. This keeps listings safe from spam.</Notice>
        <Link href={`/login?next=${encodeURIComponent(`/accommodation/${listingId}`)}`} className="btn-primary w-full">Sign in</Link>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="space-y-2">
        <button type="button" onClick={reveal} disabled={busy} className="btn-gold w-full !min-h-[52px] !rounded-full text-[16px]">
          <Icon name="phone" size={15} /> {busy ? "Loading…" : "Show contact details"}
        </button>
        {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  const digits = contact.contactPhone?.replace(/[^\d]/g, "");
  return (
    <div className="space-y-2.5">
      <p className="text-[13px]"><span className="text-mute">Contact: </span><span className="font-semibold">{contact.contactName}</span></p>
      {contact.contactPhone && (
        <div className="flex gap-2">
          <a href={`tel:${contact.contactPhone.replace(/[^\d+]/g, "")}`} className="btn-primary flex-1 !min-h-[44px]"><Icon name="phone" size={15} /> {contact.contactPhone}</a>
          {digits && digits.length >= 8 && (
            <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="btn-secondary !min-h-[44px]" aria-label="Message on WhatsApp">WhatsApp</a>
          )}
        </div>
      )}
      {contact.contactEmail && (
        <a href={`mailto:${contact.contactEmail}`} className="btn-secondary w-full !min-h-[44px]"><Icon name="mail" size={15} /> <span className="truncate">{contact.contactEmail}</span></a>
      )}
    </div>
  );
}
