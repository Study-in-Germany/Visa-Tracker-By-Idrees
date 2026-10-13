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
import { LoadingBlock } from "@/components/ui/States";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/StatusBadge";
import { CONSULATE_OPTIONS } from "@/components/PeriodFilters";
import { useApplicants } from "@/hooks/useApplicants";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDebounced } from "@/hooks/useDebounced";
import { usePeriod } from "@/hooks/usePeriod";
import { fmtDate } from "@/lib/format";
import { describePeriod } from "@/lib/dates";
import { VISA_STATUS_LABELS } from "@/lib/constants";
import type { ApplicantRow } from "@/lib/types";
import type { Period } from "@/lib/period";

const STATUS_OPTIONS = [{ value: "", label: "All statuses" }, ...Object.entries(VISA_STATUS_LABELS).map(([value, label]) => ({ value, label }))];

const CONSULATE_FILTER_OPTIONS = CONSULATE_OPTIONS.filter((o) => o.value);

type ColumnFilters = { university: string; setUniversity: (v: string) => void; consulate: string; setConsulate: (v: string) => void; status: string; setStatus: (v: string) => void; period: Period; setPeriod: (p: Period) => void };

const buildColumns = (f: ColumnFilters): Column<ApplicantRow>[] => [
  {
    key: "id",
    header: "Tracking ID",
    sortKey: "publicId",
    mobile: "title",
    cell: (a) => (
      <Link href={`/tracker/${a.publicId}`} className="font-mono font-medium text-ink-900 underline-offset-2 hover:text-clay-600 hover:underline">
        {a.publicId}
      </Link>
    ),
  },
  { key: "name", header: "Name", mobile: "hidden", hideBelow: "lg", cell: (a) => a.name || <span className="text-mute">Anonymous</span> },
  { key: "university", header: "University", sortKey: "university", cell: (a) => a.university || "—", filter: { type: "text", label: "University", placeholder: "University contains…", value: f.university, onChange: f.setUniversity } },
  { key: "consulate", header: "Embassy", sortKey: "consulate", cell: (a) => a.consulate, filter: { type: "select", label: "Embassy", value: f.consulate, options: CONSULATE_FILTER_OPTIONS, onChange: f.setConsulate } },
  { key: "waiting", header: "Waiting list", sortKey: "waitingListDate", cell: (a) => fmtDate(a.waitingListDate), filter: { type: "range", label: "Waiting-list date", value: f.period, onChange: f.setPeriod } },
  { key: "docs", header: "Documents", sortKey: "documentSubmissionDate", hideBelow: "xl", cell: (a) => fmtDate(a.documentSubmissionDate) },
  { key: "correction", header: "Correction", hideBelow: "xl", cell: (a) => fmtDate(a.correctionRequestDate) },
  { key: "appointment", header: "Appointment", sortKey: "appointmentDate", hideBelow: "lg", cell: (a) => fmtDate(a.appointmentDate) },
  { key: "status", header: "Status", sortKey: "visaStatus", mobile: "badge", cell: (a) => <StatusBadge status={a.visaStatus} />, filter: { type: "select", label: "Status", value: f.status, options: STATUS_OPTIONS.filter((o) => o.value), onChange: f.setStatus } },
];

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
  // Stat tiles follow the same period + embassy as the table
  const stats = useAnalytics(period, consulate);
  const s = stats.data;
  const hasFilters = !!(q || consulate || university || visaStatus || period.from || period.to);

  function clearAll() {
    setSearch("");
    setConsulate("");
    setUniversity("");
    setVisaStatus("");
    setPeriod({ from: "", to: "" });
  }

  return (
    <>
      <PageHeader
        title="Tracker"
        description="Everyone the community has shared. Use the search bar above to jump to a Tracking ID."
        actions={
          <>
            <DateRangePicker value={period} onChange={setPeriod} />
            <Select variant="pill" label="Embassy" prefix="Embassy" value={consulate} onChange={setConsulate} options={CONSULATE_OPTIONS} className="w-full sm:w-auto" />
            <Select variant="pill" label="Status" prefix="Status" value={visaStatus} onChange={setVisaStatus} options={STATUS_OPTIONS} className="w-full sm:w-auto" />
          </>
        }
      />

      <section aria-label="Summary" className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="users" tone="sage" label="Applicants" value={s?.total} loading={stats.loading && !s} />
        <StatCard icon="hourglass" tone="warn" label="In the queue" value={s?.activeApplicants} loading={stats.loading && !s} />
        <StatCard icon="checkCircle" tone="good" label="Visa issued" value={s?.visaIssued} loading={stats.loading && !s} />
        <StatCard icon="xcircle" tone="bad" label="Rejected" value={s?.visaRejected} loading={stats.loading && !s} />
      </section>

      <section className="card overflow-hidden" aria-label="Applicants">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <div className="relative w-full sm:w-64">
            <Icon name="search" size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
            <input className="input !min-h-[30px] !py-1 pl-8 !text-xs" type="search" aria-label="Filter the table" placeholder="Filter this table…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {consulate && <FilterChip label={`Embassy: ${consulate}`} active onRemove={() => setConsulate("")} />}
            {university && <FilterChip label={`University: ${university}`} active onRemove={() => setUniversity("")} />}
            {visaStatus && <FilterChip label={VISA_STATUS_LABELS[visaStatus]} active onRemove={() => setVisaStatus("")} />}
            {(period.from || period.to) && <FilterChip label={describePeriod(period)} active onRemove={() => setPeriod({ from: "", to: "" })} />}
            {hasFilters && (
              <button type="button" onClick={clearAll} className="min-h-[32px] px-2 text-xs font-medium text-clay-600 hover:underline">
                Clear all
              </button>
            )}
          </div>
        </div>
        <DataTable
          embedded
          caption="Public applicant tracker"
          rowHref={(a) => `/tracker/${a.publicId}`}
          columns={columns}
          rows={data?.applicants ?? []}
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
