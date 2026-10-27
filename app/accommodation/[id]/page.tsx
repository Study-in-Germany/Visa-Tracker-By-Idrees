"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon, { type IconName } from "@/components/ui/Icon";
import RichText from "@/components/ui/RichText";
import ExpandableText from "@/components/ui/ExpandableText";
import { ErrorState, LoadingBlock, Notice } from "@/components/ui/States";
import ImageGallery, { PhotoMosaic } from "@/components/accommodation/ImageGallery";
import ContactReveal from "@/components/accommodation/ContactReveal";
import ReportDialog from "@/components/accommodation/ReportDialog";
import OwnerActions from "@/components/accommodation/OwnerActions";
import ListingStatusBadge from "@/components/accommodation/ListingStatusBadge";
import SaveButton from "@/components/accommodation/SaveButton";
import ShareButton from "@/components/accommodation/ShareButton";
import SimilarListings from "@/components/accommodation/SimilarListings";
import { useApi } from "@/hooks/useApi";
import { fmtDay } from "@/lib/deadline";
import { eur, GENDER_PREFERENCE_LABELS, LISTING_TYPE_LABELS, type ListingDetailDto } from "@/lib/marketplace";

const Divider = () => <hr className="my-7 border-line" />;

function Highlight({ icon, title, sub }: { icon: IconName; title: string; sub: string }) {
  return (
    <li className="flex gap-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-paper-sunk text-ink-800"><Icon name={icon} size={20} /></span>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="text-[13px] text-mute">{sub}</p>
      </div>
    </li>
  );
}

function Amenity({ on, label }: { on: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-3 text-[14px] ${on ? "" : "text-mute line-through decoration-line-strong"}`}>
      <Icon name={on ? "check" : "close"} size={16} className={on ? "text-ink-800" : "text-mute"} />
      {label}
    </li>
  );
}

export default function ListingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<{ listing: ListingDetailDto }>(`/api/listings/${params.id}`);
  const [reporting, setReporting] = useState(false);

  if (loading && !data) return <LoadingBlock rows={5} />;
  if (error) {
    return (
      <div className="card">
        <ErrorState error={error.status === 404 ? "This listing doesn't exist or is no longer available." : error} onRetry={error.status === 404 ? undefined : reload} />
        <div className="pb-6 text-center"><Link href="/accommodation" className="btn-secondary">Browse accommodation</Link></div>
      </div>
    );
  }
  const l = data?.listing;
  if (!l) return null;

  const live = l.status === "APPROVED";
  const seeking = l.kind === "SEEKING";
  const where = [l.district, l.city].filter(Boolean).join(", ");
  const moveIn = new Date(l.availableFrom).getTime() <= Date.now() ? "Now" : fmtDay(l.availableFrom);
  const facts = [!seeking && l.furnished ? "Furnished" : null, l.sizeSqm ? `${l.sizeSqm} m²` : null, l.minStayMonths ? `${seeking ? "Staying" : "Min."} ${l.minStayMonths} month${l.minStayMonths === 1 ? "" : "s"}` : null, l.genderPreference !== "ANY" ? GENDER_PREFERENCE_LABELS[l.genderPreference] : null].filter(Boolean).join(" · ");

  return (
    <div>
      <Link href="/accommodation" className="mb-3 inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-medium text-ink-700 hover:underline">
        <Icon name="arrowLeft" size={14} /> All accommodation
      </Link>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {seeking && <span className="badge border-line-strong bg-paper-sunk text-ink-700">Looking for a place</span>}
            {l.status !== "APPROVED" && <ListingStatusBadge status={l.status} />}
          </div>
          <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-tight sm:text-[28px]">{l.title}</h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-mute"><Icon name="pin" size={14} /> {where}</p>
        </div>
        <div className="flex gap-1">
          <ShareButton title={l.title} link />
          <SaveButton id={l.id} link />
        </div>
      </header>

      {l.canManage && l.status === "PENDING_REVIEW" && <div className="mb-4"><Notice>A moderator is checking this listing, so it isn&apos;t visible to others right now.</Notice></div>}
      {l.canManage && l.status === "REJECTED" && <div className="mb-4"><Notice tone="error">Removed by a moderator{l.rejectionReason ? `: ${l.rejectionReason}` : "."}</Notice></div>}

      {l.images.length > 0 && (
        <>
          <div className="lg:hidden"><ImageGallery images={l.images} title={l.title} /></div>
          <div className="hidden lg:block"><PhotoMosaic images={l.images} title={l.title} /></div>
        </>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-[20px] font-semibold tracking-tight">{seeking ? `Wants a ${LISTING_TYPE_LABELS[l.type].toLowerCase()} in ${l.city}` : `${LISTING_TYPE_LABELS[l.type]} in ${l.district || l.city}`}</h3>
              {facts && <p className="mt-1 text-[14px] text-mute">{facts}</p>}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-[1fr_auto_auto] items-center gap-x-5 rounded-2xl border border-line-strong p-4 sm:gap-x-6 sm:p-5">
            <p className="flex items-center gap-3 text-[15px] font-semibold leading-snug"><Icon name="shield" size={26} className="shrink-0 text-ink-800" />{l.poster.verified ? "Verified applicant" : "Community member"}</p>
            <div className="border-l border-line-strong pl-5 text-center sm:pl-6"><p className="text-[20px] font-semibold leading-none">{l.poster.listingCount}</p><p className="mt-1 text-xs text-mute">post{l.poster.listingCount === 1 ? "" : "s"}</p></div>
            <div className="border-l border-line-strong pl-5 text-center sm:pl-6"><p className="text-[20px] font-semibold leading-none">{new Date(l.poster.memberSince).getFullYear()}</p><p className="mt-1 text-xs text-mute">member since</p></div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-paper-sunk text-ink-700"><Icon name="user" size={22} /></span>
            <div>
              <p className="text-[16px] font-semibold">{seeking ? "Posted by a student" : "Listed by a student"}</p>
              <p className="text-[14px] text-mute">Posted {fmtDay(l.createdAt)}</p>
            </div>
          </div>

          <Divider />
          <ul className="space-y-5">
            <Highlight icon="calendar" title={seeking ? `Moving in ${moveIn === "Now" ? "now" : moveIn}` : moveIn === "Now" ? "Available now" : `Available from ${moveIn}`} sub="Move-in date" />
            <Highlight icon="home" title={l.anmeldung ? (seeking ? "Anmeldung required" : "Anmeldung possible") : "Anmeldung not stated"} sub="Registering your address is needed for your residence permit and bank account" />
            <Highlight icon="key" title={l.rentEur == null ? (seeking ? "Budget is flexible" : "Rent on request") : `${seeking ? "Budget up to " : ""}${eur(l.rentEur)} per month`} sub={l.billsIncluded ? "Bills included" : "Check what bills are included"} />
          </ul>

          <Divider />
          <h3 className="mb-3 text-[18px] font-semibold">{seeking ? "About the request" : "About this place"}</h3>
          <ExpandableText><RichText value={l.description} /></ExpandableText>

          <Divider />
          <h3 className="mb-4 text-[18px] font-semibold">{seeking ? "What they prefer" : "What this place offers"}</h3>
          <ul className="grid gap-3.5 sm:grid-cols-2">
            <Amenity on={l.anmeldung} label={seeking ? "Anmeldung needed" : "Anmeldung possible"} />
            <Amenity on={l.furnished} label="Furnished" />
            <Amenity on={l.billsIncluded} label="Bills included" />
            {!seeking && <Amenity on={l.depositEur != null} label={l.depositEur != null ? `Deposit ${eur(l.depositEur)}` : "Deposit not stated"} />}
            {l.sizeSqm != null && <Amenity on label={`${l.sizeSqm} m² of space`} />}
            {l.minStayMonths != null && <Amenity on label={`${seeking ? "Staying" : "Minimum stay"} ${l.minStayMonths} month${l.minStayMonths === 1 ? "" : "s"}`} />}
          </ul>

          <Divider />
          <h3 className="mb-3 text-[18px] font-semibold">{seeking ? "Where they want to live" : "Where you'll be"}</h3>
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-paper-raised p-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-paper-sunk text-ink-800"><Icon name="pin" size={20} /></span>
            <div>
              <p className="text-[15px] font-semibold">{where}</p>
              <p className="text-[13px] text-mute">{seeking ? "Preferred area" : "The exact address is shared by the host after you get in touch."}</p>
            </div>
          </div>

        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-line bg-paper-raised px-5 py-4 text-[15px] font-medium shadow-[0_6px_24px_-10px_rgba(35,47,39,0.2)]">
            <Icon name="check" size={18} className="text-clay-500" /> No booking fees. Contact the poster directly.
          </div>
          <div className="rounded-2xl border border-line bg-paper-raised p-6 shadow-[0_6px_24px_-8px_rgba(35,47,39,0.18)]">
            <p className="text-[26px] font-semibold tracking-tight">
              {l.rentEur == null ? (seeking ? "Budget flexible" : "Rent on request") : <>{seeking ? "Up to " : ""}{eur(l.rentEur)} <span className="text-[16px] font-normal text-mute">per month</span></>}
            </p>
            <div className="mt-5 overflow-hidden rounded-xl border border-ink-900/40 text-[14px]">
              <div className="grid grid-cols-2 border-b border-ink-900/40">
                <div className="border-r border-ink-900/40 p-3"><p className="text-[10px] font-bold uppercase tracking-wide">{seeking ? "Move-in" : "Available"}</p><p className="mt-0.5">{moveIn}</p></div>
                <div className="p-3"><p className="text-[10px] font-bold uppercase tracking-wide">Min. stay</p><p className="mt-0.5">{l.minStayMonths ? `${l.minStayMonths} month${l.minStayMonths === 1 ? "" : "s"}` : "Flexible"}</p></div>
              </div>
              <div className="p-3"><p className="text-[10px] font-bold uppercase tracking-wide">Bills</p><p className="mt-0.5">{l.billsIncluded ? "Included in the rent" : "Not included"}</p></div>
            </div>
            <div className="mt-5">
              {live ? <ContactReveal listingId={l.id} /> : l.status === "RENTED" ? <Notice>{seeking ? "This person has found a place." : "This place has been rented."}</Notice> : <Notice>Contact details appear when the listing is live.</Notice>}
            </div>
            <p className="mt-3 text-center text-[14px]">You won&apos;t be charged anything here</p>
            <p className="mt-4 border-t border-line pt-4 text-[11px] leading-relaxed text-mute">Stay safe: never send a deposit or rent before you have seen the place (or a live video of it) and checked the person is real.</p>
          </div>

          {l.canManage && (
            <div className="rounded-2xl border border-line bg-paper-raised p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-mute">{l.isOwner ? "Your listing" : "Moderator actions"}</h3>
              <OwnerActions id={l.id} status={l.status} kind={l.kind} onChanged={reload} onDeleted={() => router.push(l.isOwner ? "/dashboard/listings" : "/admin/accommodation")} />
            </div>
          )}

          {!l.isOwner && live && (
            <button type="button" onClick={() => setReporting(true)} className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 text-[14px] font-medium text-ink-800 underline underline-offset-2 hover:text-ink-900">
              <Icon name="flag" size={15} /> Report this listing
            </button>
          )}
        </aside>
      </div>

      <SimilarListings id={l.id} city={l.city} kind={l.kind} />
      <ReportDialog listingId={l.id} open={reporting} onClose={() => setReporting(false)} />
    </div>
  );
}
