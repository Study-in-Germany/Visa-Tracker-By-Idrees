"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import DataTable, { Column, SortState } from "@/components/ui/DataTable";
import DateRangePicker from "@/components/ui/DateRangePicker";
import Select from "@/components/ui/Select";
import { FilterChip } from "@/components/ui/Chip";
import { LoadingBlock, EmptyState, ErrorState } from "@/components/ui/States";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/StatusBadge";
import { CONSULATE_OPTIONS } from "@/components/PeriodFilters";
import { useApplicants } from "@/hooks/useApplicants";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDebounced } from "@/hooks/useDebounced";
import { usePeriod } from "@/hooks/usePeriod";
import { fmtDate } from "@/lib/format";
import { describePeriod } from "@/lib/dates";
import { VISA_STATUS_LABELS, VISA_STATUS_HEX } from "@/lib/constants";
import type { ApplicantRow } from "@/lib/types";
import type { Period } from "@/lib/period";

const STATUS_OPTIONS = [{ value: "", label: "All statuses" }, ...Object.entries(VISA_STATUS_LABELS).map(([value, label]) => ({ value, label }))];
const CONSULATE_FILTER_OPTIONS = CONSULATE_OPTIONS.filter((o) => o.value);

type ColumnFilters = {
  university: string; setUniversity: (v: string) => void;
  consulate: string; setConsulate: (v: string) => void;
  status: string; setStatus: (v: string) => void;
  period: Period; setPeriod: (p: Period) => void;
};

const buildColumns = (f: ColumnFilters): Column<ApplicantRow>[] => [
  {
    key: "id",
    header: "Tracking ID",
    sortKey: "publicId",
    mobile: "title",
    cell: (a) => (
      <Link href={`/tracker/${a.publicId}`} className="font-mono font-semibold text-ink-900 underline-offset-2 hover:text-clay-600 hover:underline">
        {a.publicId}
      </Link>
    ),
  },
  { key: "name", header: "Name", mobile: "hidden", hideBelow: "lg", cell: (a) => a.name || <span className="text-mute">Anonymous</span> },
  { key: "university", header: "University", sortKey: "university", mobile: "hidden", cell: (a) => a.university || "—", filter: { type: "text", label: "University", placeholder: "University contains…", value: f.university, onChange: f.setUniversity } },
  { key: "consulate", header: "Embassy", sortKey: "consulate", mobile: "hidden", cell: (a) => a.consulate, filter: { type: "select", label: "Embassy", value: f.consulate, options: CONSULATE_FILTER_OPTIONS, onChange: f.setConsulate } },
  { key: "waiting", header: "Waiting list", sortKey: "waitingListDate", mobile: "hidden", cell: (a) => fmtDate(a.waitingListDate), filter: { type: "range", label: "Waiting-list date", value: f.period, onChange: f.setPeriod } },
  { key: "docs", header: "Documents", sortKey: "documentSubmissionDate", hideBelow: "xl", mobile: "hidden", cell: (a) => fmtDate(a.documentSubmissionDate) },
  { key: "correction", header: "Correction", hideBelow: "xl", mobile: "hidden", cell: (a) => fmtDate(a.correctionRequestDate) },
  { key: "appointment", header: "Appointment", sortKey: "appointmentDate", hideBelow: "lg", mobile: "hidden", cell: (a) => fmtDate(a.appointmentDate) },
  { key: "status", header: "Status", sortKey: "visaStatus", mobile: "badge", cell: (a) => <StatusBadge status={a.visaStatus} />, filter: { type: "select", label: "Status", value: f.status, options: STATUS_OPTIONS.filter((o) => o.value), onChange: f.setStatus } },
];

// ── Rich mobile card ───────────────────────────────────────────────────────
function MobileCard({ a }: { a: ApplicantRow }) {
  const hex = VISA_STATUS_HEX[a.visaStatus] || "#888";
  return (
    <Link
      href={`/tracker/${a.publicId}`}
      className="block rounded-xl border border-line bg-paper-raised p-4 transition-colors active:bg-paper-sunk"
      style={{ borderLeftColor: hex, borderLeftWidth: 3 }}
    >
      {/* Top row: ID + status badge */}
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[13px] font-bold text-ink-900">{a.publicId}</span>
        <StatusBadge status={a.visaStatus} />
      </div>

      {/* Details grid */}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
        {a.university && (
          <div className="col-span-2 flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-paper-sunk text-ink-600">
              <Icon name="book" size={12} />
            </span>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-mute">University</dt>
              <dd className="truncate text-[13px] font-medium">{a.university}</dd>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-paper-sunk text-ink-600">
            <Icon name="search" size={12} />
          </span>
          <div className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-mute">Embassy</dt>
            <dd className="text-[13px] font-medium">{a.consulate}</dd>
          </div>
        </div>

        {a.waitingListDate && (
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-paper-sunk text-ink-600">
              <Icon name="clock" size={12} />
            </span>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-mute">Waiting list</dt>
              <dd className="text-[13px] font-medium">{fmtDate(a.waitingListDate)}</dd>
            </div>
          </div>
        )}

        {a.appointmentDate && (
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-paper-sunk text-ink-600">
              <Icon name="calendar" size={12} />
            </span>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-mute">Appointment</dt>
              <dd className="text-[13px] font-medium">{fmtDate(a.appointmentDate)}</dd>
            </div>
          </div>
        )}

        {a.documentSubmissionDate && (
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-paper-sunk text-ink-600">
              <Icon name="send" size={12} />
            </span>
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-mute">Documents</dt>
              <dd className="text-[13px] font-medium">{fmtDate(a.documentSubmissionDate)}</dd>
            </div>
          </div>
        )}
      </dl>

      {/* Chevron hint */}
      <div className="mt-3 flex items-center justify-end text-xs text-mute">
        <span>View timeline</span>
        <Icon name="chevronRight" size={13} className="ml-0.5" />
      </div>
    </Link>
  );
}

// ── Mobile list wrapper ────────────────────────────────────────────────────
function MobileList({
  rows, loading, error, onRetry, emptyTitle, emptyHint, page, pageCount, total, onPage,
}: {
  rows: ApplicantRow[]; loading: boolean; error?: Error | null; onRetry?: () => void;
  emptyTitle?: string; emptyHint?: string; page: number; pageCount: number; total?: number; onPage: (p: number) => void;
}) {
  if (error && rows.length === 0) return <div className="card"><ErrorState error={error} onRetry={onRetry} /></div>;
  if (loading && rows.length === 0) return <LoadingBlock label="Loading entries" rows={4} />;
  if (!loading && rows.length === 0) return <div className="card"><EmptyState title={emptyTitle ?? "Nothing here yet"} hint={emptyHint} /></div>;

  return (
    <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
      <ul className="space-y-2.5">
        {rows.map(a => <li key={a.id}><MobileCard a={a} /></li>)}
      </ul>
      {(pageCount > 1 || total !== undefined) && (
        <nav aria-label="Pagination" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-mute">
          <span>{total !== undefined ? `${total.toLocaleString("en-US")} records` : ""}</span>
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <button type="button" className="btn-secondary !min-h-[30px] !px-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
                <Icon name="chevronLeft" />
              </button>
              <span className="px-2 text-ink-700">Page {page} of {pageCount}</span>
              <button type="button" className="btn-secondary !min-h-[30px] !px-1.5" disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page">
                <Icon name="chevronRight" />
              </button>
            </div>
          )}
        </nav>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
function TrackerInner() {
  const initialQ = useSearchParams().get("q") || "";
  const [period, setPeriod] = usePeriod();
  const [search, setSearch] = useState(initialQ);
  const [consulate, setConsulate] = useState("");
  const [university, setUniversity] = useState("");
  const [visaStatus, setVisaStatus] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(null);

  const q = useDebounced(search.trim());
  const filters = useMemo(() => ({ q, consulate, university, visaStatus, from: period.from, to: period.to }), [q, consulate, university, visaStatus, period]);
  const columns = useMemo(() => buildColumns({ university, setUniversity, consulate, setConsulate, status: visaStatus, setStatus: setVisaStatus, period, setPeriod }), [university, consulate, visaStatus, period, setPeriod]);
  useEffect(() => setPage(1), [filters]);

  const { data, error, loading, reload } = useApplicants(filters, page, sort);
  const stats = useAnalytics(period, consulate);
  const s = stats.data;
  const hasFilters = !!(q || consulate || university || visaStatus || period.from || period.to);

  function clearAll() {
    setSearch(""); setConsulate(""); setUniversity(""); setVisaStatus(""); setPeriod({ from: "", to: "" });
  }

  const rows = data?.applicants ?? [];

  return (
    <>
      <PageHeader
        title="Tracker"
        description="Community-submitted, admin-approved entries."
        actions={
          <>
            <DateRangePicker value={period} onChange={setPeriod} />
            <Select variant="pill" label="Embassy" prefix="Embassy" value={consulate} onChange={setConsulate} options={CONSULATE_OPTIONS} className="w-full sm:w-auto" />
            <Select variant="pill" label="Status" prefix="Status" value={visaStatus} onChange={setVisaStatus} options={STATUS_OPTIONS} className="w-full sm:w-auto" />
          </>
        }
      />

      {/* KPI stats */}
      <section aria-label="Summary" className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="users" tone="sage" label="Applicants" value={s?.total} loading={stats.loading && !s} />
        <StatCard icon="hourglass" tone="warn" label="In the queue" value={s?.activeApplicants} loading={stats.loading && !s} />
        <StatCard icon="checkCircle" tone="good" label="Visa issued" value={s?.visaIssued} loading={stats.loading && !s} />
        <StatCard icon="xcircle" tone="bad" label="Rejected" value={s?.visaRejected} loading={stats.loading && !s} />
      </section>

      {/* Filter toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:flex-none sm:w-64">
          <Icon name="search" size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            className="input !min-h-[36px] w-full !py-1 pl-8 !text-sm"
            type="search"
            aria-label="Filter entries"
            placeholder="Search ID, university, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {consulate && <FilterChip label={`Embassy: ${consulate}`} active onRemove={() => setConsulate("")} />}
          {university && <FilterChip label={`Uni: ${university}`} active onRemove={() => setUniversity("")} />}
          {visaStatus && <FilterChip label={VISA_STATUS_LABELS[visaStatus]} active onRemove={() => setVisaStatus("")} />}
          {(period.from || period.to) && <FilterChip label={describePeriod(period)} active onRemove={() => setPeriod({ from: "", to: "" })} />}
          {hasFilters && (
            <button type="button" onClick={clearAll} className="min-h-[32px] px-2 text-xs font-medium text-clay-600 hover:underline">
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <section className="hidden md:block card overflow-hidden" aria-label="Applicants">
        <DataTable
          embedded
          caption="Public applicant tracker"
          rowHref={(a) => `/tracker/${a.publicId}`}
          columns={columns}
          rows={rows}
          rowKey={(a) => a.id}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle={hasFilters ? "No entries match these filters" : "No approved entries yet"}
          emptyHint={hasFilters ? "Try removing a filter or widening the date range." : "Entries appear here after an admin approves them."}
          sort={sort}
          onSort={(next) => { setSort(next); setPage(1); }}
          page={data?.page ?? page}
          pageCount={data?.pageCount ?? 1}
          total={data?.count}
          onPage={setPage}
        />
      </section>

      {/* Mobile cards */}
      <section className="md:hidden" aria-label="Applicants">
        <MobileList
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle={hasFilters ? "No entries match these filters" : "No approved entries yet"}
          emptyHint={hasFilters ? "Try removing a filter." : "Entries appear here after an admin approves them."}
          page={data?.page ?? page}
          pageCount={data?.pageCount ?? 1}
          total={data?.count}
          onPage={setPage}
        />
      </section>
    </>
  );
}

export default function TrackerPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <TrackerInner />
    </Suspense>
  );
}
