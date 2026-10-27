"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import type { SortState } from "@/components/ui/DataTable";
import TrackerRows from "@/components/tracker/TrackerRows";
import DateRangePicker from "@/components/ui/DateRangePicker";
import Select from "@/components/ui/Select";
import { FilterChip } from "@/components/ui/Chip";
import { LoadingBlock } from "@/components/ui/States";
import StatusBadge from "@/components/StatusBadge";
import StatusChips from "@/components/tracker/StatusChips";
import MobileList from "@/components/tracker/MobileList";
import { CONSULATE_OPTIONS } from "@/components/PeriodFilters";
import { useApplicants } from "@/hooks/useApplicants";
import { useApi } from "@/hooks/useApi";
import { useStats } from "@/hooks/useStats";
import { useDebounced } from "@/hooks/useDebounced";
import { usePeriod } from "@/hooks/usePeriod";
import { fmtDate } from "@/lib/format";
import { describePeriod } from "@/lib/dates";
import { VISA_STATUS_LABELS, VISA_STATUS_HEX } from "@/lib/constants";
import type { ApplicantRow } from "@/lib/types";
import type { Period } from "@/lib/period";

const STATUS_OPTIONS = [{ value: "", label: "All statuses" }, ...Object.entries(VISA_STATUS_LABELS).map(([value, label]) => ({ value, label }))];
const CONSULATE_FILTER_OPTIONS = CONSULATE_OPTIONS.filter((o) => o.value);

// ── Main component ─────────────────────────────────────────────────────────
function TrackerInner() {
  const urlQ = useSearchParams().get("q") || "";
  const [period, setPeriod] = usePeriod();
  const [search, setSearch] = useState(urlQ);
  // The header search drives this list through ?q=
  useEffect(() => setSearch(urlQ), [urlQ]);
  const [consulate, setConsulate] = useState("");
  const [university, setUniversity] = useState("");
  const [intake, setIntake] = useState("");
  const facets = useApi<{ universities: { value: string }[]; intakes: { value: string }[] }>("/api/applicants/facets");
  const universityOptions = useMemo(() => [{ value: "", label: "All universities" }, ...(facets.data?.universities ?? []).map((u) => ({ value: u.value, label: u.value }))], [facets.data]);
  const intakeOptions = useMemo(() => [{ value: "", label: "All intakes" }, ...(facets.data?.intakes ?? []).map((i) => ({ value: i.value, label: i.value }))], [facets.data]);
  const [visaStatus, setVisaStatus] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(null);

  const q = useDebounced(search.trim());
  const filters = useMemo(() => ({ q, consulate, university, intake, visaStatus, from: period.from, to: period.to }), [q, consulate, university, intake, visaStatus, period]);
  useEffect(() => setPage(1), [filters]);

  const { data, error, loading, reload } = useApplicants(filters, page, sort);
  const stats = useStats(period, consulate);
  const s = stats.data;
  const hasFilters = !!(q || consulate || university || intake || visaStatus || period.from || period.to);

  function clearAll() {
    setSearch(""); setConsulate(""); setUniversity(""); setIntake(""); setVisaStatus(""); setPeriod({ from: "", to: "" });
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
            <Select variant="pill" label="Intake" prefix="Intake" value={intake} onChange={setIntake} options={intakeOptions} />
            <Select variant="pill" label="University" prefix="Uni" value={university} onChange={setUniversity} options={universityOptions} />
          </div>
        }
      />

      {/* Phone filters: one swipeable row of compact pills */}
      <div className="-mx-3 mb-3 flex gap-2 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
        <DateRangePicker value={period} onChange={setPeriod} label={period.from || period.to ? "Joined" : ""} className="shrink-0" />
        <Select variant="pill" label="Embassy" prefix={consulate ? "Embassy" : undefined} value={consulate} onChange={setConsulate} options={CONSULATE_OPTIONS} className="shrink-0" />
        <Select variant="pill" label="Intake" prefix={intake ? "Intake" : undefined} value={intake} onChange={setIntake} options={intakeOptions} className="shrink-0" />
        {hasFilters && (
          <button type="button" onClick={clearAll} className="shrink-0 rounded-lg px-2.5 text-xs font-semibold text-clay-600">Clear</button>
        )}
      </div>

      {/* KPI stats: reserved height so the page never jumps when numbers arrive */}
      <section aria-label="Summary" className="mb-3 grid grid-cols-2 gap-2.5 sm:hidden">
        <StatCard variant="wide" icon="users" tone="sage" label="Applicants" value={s?.total} loading={stats.loading && !s} />
        <StatCard variant="wide" icon="hourglass" tone="warn" label="In queue" value={s?.activeApplicants} loading={stats.loading && !s} />
        <StatCard variant="wide" icon="checkCircle" tone="good" label="Issued" value={s?.visaIssued} loading={stats.loading && !s} />
        <StatCard variant="wide" icon="xcircle" tone="bad" label="Rejected" value={s?.visaRejected} loading={stats.loading && !s} />
      </section>
      <section aria-label="Summary" className="mb-4 hidden grid-cols-2 gap-3 sm:grid lg:grid-cols-4">
        <StatCard icon="users" tone="sage" label="Applicants" value={s?.total} loading={stats.loading && !s} />
        <StatCard icon="hourglass" tone="warn" label="In the queue" value={s?.activeApplicants} loading={stats.loading && !s} />
        <StatCard icon="checkCircle" tone="good" label="Visa issued" value={s?.visaIssued} loading={stats.loading && !s} />
        <StatCard icon="xcircle" tone="bad" label="Rejected" value={s?.visaRejected} loading={stats.loading && !s} />
      </section>

      {/* Status filter: coloured chips with live counts, one line */}
      <div className="mb-2">
        <StatusChips value={visaStatus} onChange={setVisaStatus} counts={s?.byStatus} total={s?.total} />
      </div>

      {/* Active filters (desktop) */}
      {hasFilters && (
        <div className="mb-3 hidden flex-wrap items-center gap-1.5 sm:flex">
          {q && <FilterChip label={`Search: ${q}`} active onRemove={() => { setSearch(""); window.history.replaceState(null, "", "/tracker"); }} />}
          {consulate && <FilterChip label={`Embassy: ${consulate}`} active onRemove={() => setConsulate("")} />}
          {university && <FilterChip label={`Uni: ${university}`} active onRemove={() => setUniversity("")} />}
          {intake && <FilterChip label={`Intake: ${intake}`} active onRemove={() => setIntake("")} />}
          {visaStatus && <FilterChip label={VISA_STATUS_LABELS[visaStatus]} active onRemove={() => setVisaStatus("")} />}
          {(period.from || period.to) && <FilterChip label={describePeriod(period)} active onRemove={() => setPeriod({ from: "", to: "" })} />}
          <button type="button" onClick={clearAll} className="min-h-[32px] px-2 text-xs font-medium text-clay-600 hover:underline">Clear all</button>
        </div>
      )}

      {/* Tablet and desktop rows */}
      <section aria-label="Applicants">
        <TrackerRows
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle={hasFilters ? "No entries match these filters" : "No approved entries yet"}
          emptyHint={hasFilters ? "Try removing a filter or widening the date range." : "Entries appear here after an admin approves them."}
          sort={sort}
          onSort={(key) => { setSort(sort?.key !== key ? { key, dir: "asc" } : sort.dir === "asc" ? { key, dir: "desc" } : null); setPage(1); }}
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
