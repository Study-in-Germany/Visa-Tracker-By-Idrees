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
const MINI_STATS = [
  { key: "total", label: "Total", dot: "bg-ink-600" },
  { key: "activeApplicants", label: "Queue", dot: "bg-ochre-500" },
  { key: "visaIssued", label: "Issued", dot: "bg-emerald-500" },
  { key: "visaRejected", label: "Rejected", dot: "bg-red-500" },
] as const;
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

// ── Mobile card ────────────────────────────────────────────────────────────
// Four journey stages, filled from the dates the applicant has recorded.
const STAGES = [
  { key: "waitingListDate", label: "Waiting list" },
  { key: "documentSubmissionDate", label: "Documents" },
  { key: "appointmentDate", label: "Appointment" },
  { key: "decisionDate", label: "Decision" },
] as const;

const DONE_STATUSES = new Set(["VISA_ISSUED", "VISA_REJECTED", "WITHDRAWN"]);

function plausible(v?: string | null) {
  if (!v) return false;
  const y = new Date(v).getUTCFullYear();
  return y >= 2000 && y <= 2100;
}

function stageProgress(a: ApplicantRow) {
  if (DONE_STATUSES.has(a.visaStatus)) return { done: 4, label: VISA_STATUS_LABELS[a.visaStatus] };
  let done = 0;
  STAGES.forEach((st, i) => { if (plausible((a as any)[st.key])) done = i + 1; });
  done = Math.max(done, 1);
  return { done, label: STAGES[done - 1].label };
}

function waitingFor(a: ApplicantRow) {
  if (DONE_STATUSES.has(a.visaStatus) || !plausible(a.waitingListDate)) return null;
  const days = Math.floor((Date.now() - new Date(a.waitingListDate as string).getTime()) / 86400000);
  if (days < 0) return null;
  if (days < 60) return `${days} ${days === 1 ? "day" : "days"}`;
  const months = Math.floor(days / 30.4);
  return months < 24 ? `${months} months` : `${(months / 12).toFixed(1)} years`;
}

function MobileCard({ a }: { a: ApplicantRow }) {
  const hex = VISA_STATUS_HEX[a.visaStatus] || "#888";
  const { done, label: stage } = stageProgress(a);
  const waited = waitingFor(a);
  const meta = [a.consulate, a.intake].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/tracker/${a.publicId}`}
      className="relative block overflow-hidden rounded-xl border border-line bg-paper-raised py-3 pl-4 pr-3 transition-colors active:bg-paper-sunk"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: hex }} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`truncate text-[15px] font-semibold leading-snug ${a.name ? "text-ink-900" : "text-mute"}`}>{a.name || "Anonymous"}</p>
          <p className="truncate text-[13px] text-ink-700">{a.university || "University not listed"}</p>
        </div>
        <StatusBadge status={a.visaStatus} />
      </div>

      <p className="mt-1 truncate text-xs text-mute">
        <span className="font-mono font-semibold text-ink-700">{a.publicId}</span>
        {meta && <span> · {meta}</span>}
      </p>

      <div className="mt-2.5 flex items-center gap-3">
        <div className="flex flex-1 gap-1" role="img" aria-label={`Stage ${done} of 4: ${stage}`}>
          {STAGES.map((st, i) => (
            <span key={st.key} className="h-1.5 flex-1 rounded-full" style={{ background: i < done ? hex : "#e3e0d8" }} />
          ))}
        </div>
        <span className="shrink-0 text-[11px] font-medium text-ink-700">Step {done} of 4</span>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px] text-mute">
        <span>
          {waited ? `Waiting ${waited}` : a.decisionDate && plausible(a.decisionDate) ? `Decision ${fmtDate(a.decisionDate)}` : "Joined " + fmtDate(a.waitingListDate)}
          {a.appointmentDate && plausible(a.appointmentDate) && !DONE_STATUSES.has(a.visaStatus) ? ` · Appt ${fmtDate(a.appointmentDate)}` : ""}
        </span>
        <Icon name="chevronRight" size={14} />
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
      <ul className="space-y-2">
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
          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            <DateRangePicker value={period} onChange={setPeriod} />
            <Select variant="pill" label="Embassy" prefix="Embassy" value={consulate} onChange={setConsulate} options={CONSULATE_OPTIONS} />
            <Select variant="pill" label="Status" prefix="Status" value={visaStatus} onChange={setVisaStatus} options={STATUS_OPTIONS} />
          </div>
        }
      />

      {/* Phone filters: one swipeable row of compact pills */}
      <div className="-mx-3 mb-3 flex gap-2 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
        <DateRangePicker value={period} onChange={setPeriod} label={period.from || period.to ? "Joined" : ""} className="shrink-0" />
        <Select variant="pill" label="Embassy" prefix={consulate ? "Embassy" : undefined} value={consulate} onChange={setConsulate} options={CONSULATE_OPTIONS} className="shrink-0" />
        <Select variant="pill" label="Status" prefix={visaStatus ? "Status" : undefined} value={visaStatus} onChange={setVisaStatus} options={STATUS_OPTIONS} className="shrink-0" />
        {hasFilters && (
          <button type="button" onClick={clearAll} className="shrink-0 rounded-lg px-2.5 text-xs font-semibold text-clay-600">Clear</button>
        )}
      </div>

      {/* KPI stats */}
      <section aria-label="Summary" className="card mb-3 grid grid-cols-4 divide-x divide-line sm:hidden">
        {MINI_STATS.map((m) => {
          const v = s?.[m.key];
          return (
            <div key={m.key} className="min-w-0 px-1 py-2.5 text-center">
              <div className="text-lg font-bold leading-none tracking-tight">
                {stats.loading && !s ? <span className="mx-auto block h-[18px] w-7 animate-pulse rounded bg-paper-sunk" /> : v == null ? "—" : v.toLocaleString("en-US")}
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wide text-mute">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.dot}`} aria-hidden="true" />
                <span className="truncate">{m.label}</span>
              </div>
            </div>
          );
        })}
      </section>
      <section aria-label="Summary" className="mb-3 hidden grid-cols-2 gap-3 sm:grid lg:grid-cols-4">
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
        <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
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
