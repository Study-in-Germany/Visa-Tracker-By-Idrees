"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import Pagination from "@/components/ui/Pagination";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, ErrorState } from "@/components/ui/States";
import ListingCard, { ListingGrid, ListingGridSkeleton } from "@/components/accommodation/ListingCard";
import ModerationActions from "@/components/accommodation/ModerationActions";
import OwnerActions from "@/components/accommodation/OwnerActions";
import { invalidateApi, useApi } from "@/hooks/useApi";
import { apiFetch, jsonInit } from "@/lib/api";
import { fmtDay } from "@/lib/deadline";
import { LISTING_STATUS_LABELS, REPORT_REASON_LABELS, type ListingCardDto, type Paged } from "@/lib/marketplace";

type ReportRow = { id: string; reason: string; details: string | null; status: string; createdAt: string; listing: { id: string; title: string; city: string; status: string } };

const TABS = [
  { value: "PENDING_REVIEW", label: "Waiting for review" },
  { value: "APPROVED", label: "Live on the site" },
  { value: "RENTED", label: "Rented" },
  { value: "REJECTED", label: "Removed" },
  { value: "", label: "Everything" },
  { value: "reports", label: "Reports from users" },
];

function Tabs({ value, onChange, reportCount }: { value: string; onChange: (v: string) => void; reportCount: number }) {
  return (
    <div role="tablist" aria-label="Listing status" className="-mx-3 mb-4 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      {TABS.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${value === t.value ? "border-ink-800 bg-ink-800 text-paper-raised" : "border-line-strong bg-paper-raised text-ink-800 hover:bg-paper-sunk"}`}
        >
          {t.label}
          {t.value === "reports" && reportCount > 0 && <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-clay-500 px-1 text-[11px] text-white">{reportCount}</span>}
        </button>
      ))}
    </div>
  );
}

function ListingsTab({ status }: { status: string }) {
  const q = useSearchParams().get("q") ?? "";
  const [page, setPage] = useState(1);
  const [lastQ, setLastQ] = useState(q);
  if (lastQ !== q) { setLastQ(q); setPage(1); }
  const params = new URLSearchParams({ scope: "admin", page: String(page), pageSize: "12" });
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const { data, error, loading, reload } = useApi<Paged<ListingCardDto>>(`/api/listings?${params}`);
  const items = data?.items ?? [];

  return (
    <>
      {error && items.length === 0 ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : loading && items.length === 0 ? (
        <ListingGridSkeleton count={4} />
      ) : items.length === 0 ? (
        <div className="card"><EmptyState title={status === "PENDING_REVIEW" ? "Nothing waiting for review" : "No listings here"} hint={status === "PENDING_REVIEW" ? "New and edited listings show up here." : undefined} /></div>
      ) : (
        <div className={loading ? "opacity-60" : ""}>
          <ListingGrid>
            {items.map((l) => (
              <div key={l.id} className="space-y-2">
                <ListingCard l={l} />
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip>{LISTING_STATUS_LABELS[l.status]}</Chip>
                  {!!l.openReports && <Chip tone="bad">{l.openReports} open report{l.openReports === 1 ? "" : "s"}</Chip>}
                </div>
                <ModerationActions id={l.id} status={l.status} onChanged={reload} />
                <OwnerActions id={l.id} status={l.status} compact onChanged={reload} onDeleted={reload} />
              </div>
            ))}
          </ListingGrid>
          <Pagination className="mt-6" page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} total={data?.count} noun="listings" onPage={setPage} />
        </div>
      )}
    </>
  );
}

function ReportsTab() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi<Paged<ReportRow>>(`/api/admin/reports?status=OPEN&page=${page}`);
  const items = data?.items ?? [];

  async function resolve(id: string, status: "RESOLVED" | "DISMISSED") {
    await apiFetch(`/api/admin/reports/${id}`, jsonInit("PATCH", { status }));
    invalidateApi("/api/admin/reports");
    reload();
  }
  async function pull(listingId: string, reportId: string) {
    await apiFetch(`/api/admin/listings/${listingId}`, jsonInit("PATCH", { status: "REJECTED", rejectionReason: "Removed after a report. Please contact us if you think this was a mistake." }));
    invalidateApi("/api/listings");
    await resolve(reportId, "RESOLVED");
  }

  if (error && items.length === 0) return <div className="card"><ErrorState error={error} onRetry={reload} /></div>;
  if (loading && items.length === 0) return <ListingGridSkeleton count={2} />;
  if (items.length === 0) return <div className="card"><EmptyState title="No open reports" hint="Reports from users appear here." /></div>;

  return (
    <div className={loading ? "opacity-60" : ""}>
      <ul className="space-y-2.5">
        {items.map((r) => (
          <li key={r.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/accommodation/${r.listing.id}`} className="text-[14px] font-semibold hover:underline">{r.listing.title}</Link>
                <p className="text-xs text-mute">{r.listing.city} · {LISTING_STATUS_LABELS[r.listing.status]} · reported {fmtDay(r.createdAt)}</p>
              </div>
              <Chip tone="warn">{REPORT_REASON_LABELS[r.reason]}</Chip>
            </div>
            {r.details && <p className="mt-2 break-words text-[13px] text-ink-700">“{r.details}”</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary !min-h-[36px] !px-3 text-xs" onClick={() => resolve(r.id, "DISMISSED")}>Dismiss</button>
              <button type="button" className="btn-secondary !min-h-[36px] !px-3 text-xs" onClick={() => resolve(r.id, "RESOLVED")}>Mark resolved</button>
              {r.listing.status !== "REJECTED" && <button type="button" className="btn-danger !min-h-[36px] !px-3 text-xs" onClick={() => pull(r.listing.id, r.id)}>Remove listing</button>}
            </div>
          </li>
        ))}
      </ul>
      <Pagination className="mt-4" page={data?.page ?? 1} pageCount={data?.pageCount ?? 1} total={data?.count} noun="open reports" onPage={setPage} />
    </div>
  );
}

function AccommodationInner() {
  const sp = useSearchParams();
  const initial = sp.get("tab");
  const [tab, setTab] = useState(initial !== null && TABS.some((t) => t.value === initial) ? initial : "PENDING_REVIEW");
  const reports = useApi<{ count: number }>("/api/admin/reports?status=OPEN&pageSize=1");

  return (
    <>
      <PageHeader
        title="Accommodation"
        description="Rooms and flats posted for students. Add your own, approve new posts, or remove anything that looks wrong."
        actions={<Link href="/admin/accommodation/new" className="btn-gold w-full sm:w-auto"><Icon name="plus" size={14} /> Add accommodation</Link>}
      />
      <Tabs value={tab} onChange={setTab} reportCount={reports.data?.count ?? 0} />
      {tab === "reports" ? <ReportsTab /> : <ListingsTab key={tab} status={tab} />}
    </>
  );
}

export default function AdminAccommodationPage() {
  return <Suspense><AccommodationInner /></Suspense>;
}
