"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import type { SortState } from "@/components/ui/DataTable";
import TrackerRows, {
  DEFAULT_VISIBLE_COLS,
  TRACKER_COLUMNS,
  type TrackerColumnKey,
} from "@/components/tracker/TrackerRows";
import DateRangePicker from "@/components/ui/DateRangePicker";
import Select from "@/components/ui/Select";
import Popover from "@/components/ui/Popover";
import Icon from "@/components/ui/Icon";
import { LoadingBlock } from "@/components/ui/States";
import StatusChips from "@/components/tracker/StatusChips";
import MobileList from "@/components/tracker/MobileList";
import { CONSULATE_OPTIONS } from "@/components/PeriodFilters";
import { useApplicants } from "@/hooks/useApplicants";
import { useApi } from "@/hooks/useApi";
import { useStats } from "@/hooks/useStats";
import { useDebounced } from "@/hooks/useDebounced";
import { useUrlState } from "@/hooks/useUrlState";
import { VISA_STATUS_LABELS } from "@/lib/constants";

const TRACKER_DEFAULTS = {
  q: "",
  consulate: "",
  university: "",
  intake: "",
  visaStatus: "",
  from: "",
  to: "",
  sort: "",
  dir: "",
  group: "",
  page: "1",
};

const SORT_OPTIONS = [
  { value: "", label: "Waiting list (oldest)" },
  { value: "waitingListDate:desc", label: "Waiting list (newest)" },
  { value: "submissionInviteDate:desc", label: "Invited (newest)" },
  { value: "appointmentDate:desc", label: "Appointment (newest)" },
  { value: "updatedAt:desc", label: "Recently updated" },
  { value: "publicId:asc", label: "Tracking ID (A–Z)" },
];

const STATUS_SELECT_OPTIONS = [
  { value: "", label: "All statuses" },
  ...Object.entries(VISA_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const COLS_STORAGE_KEY = "vt.tracker.cols.v1";

function TrackerInner() {
  const [url, setUrl, resetUrl] = useUrlState(TRACKER_DEFAULTS);
  const [searchInput, setSearchInput] = useState(url.q);

  // Sync external URL ?q= changes (e.g. from GlobalSearch or Back button) into local input
  useEffect(() => {
    setSearchInput(url.q);
  }, [url.q]);

  const debouncedSearch = useDebounced(searchInput.trim(), 300);
  useEffect(() => {
    if (debouncedSearch !== url.q) {
      setUrl({ q: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const [visibleCols, setVisibleCols] = useState<TrackerColumnKey[]>(DEFAULT_VISIBLE_COLS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setVisibleCols(parsed);
      }
    } catch {}
  }, []);

  const toggleCol = (key: TrackerColumnKey) => {
    setVisibleCols((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [colsOpen, setColsOpen] = useState(false);
  const colsBtnRef = useRef<HTMLButtonElement>(null);

  const facets = useApi<{ universities: { value: string }[]; intakes: { value: string }[] }>("/api/applicants/facets");
  const universityOptions = useMemo(
    () => [{ value: "", label: "All universities" }, ...(facets.data?.universities ?? []).map((u) => ({ value: u.value, label: u.value }))],
    [facets.data],
  );
  const intakeOptions = useMemo(
    () => [{ value: "", label: "All intakes" }, ...(facets.data?.intakes ?? []).map((i) => ({ value: i.value, label: i.value }))],
    [facets.data],
  );

  const period = useMemo(() => ({ from: url.from, to: url.to }), [url.from, url.to]);
  const sort: SortState = useMemo(
    () => (url.sort ? { key: url.sort, dir: url.dir === "desc" ? "desc" : "asc" } : null),
    [url.sort, url.dir],
  );
  const page = Math.max(1, parseInt(url.page, 10) || 1);
  const groupByDate = url.group === "1";

  const filters = useMemo(
    () => ({
      q: url.q,
      consulate: url.consulate,
      university: url.university,
      intake: url.intake,
      visaStatus: url.visaStatus,
      from: url.from,
      to: url.to,
    }),
    [url.q, url.consulate, url.university, url.intake, url.visaStatus, url.from, url.to],
  );

  const { data, error, loading, reload } = useApplicants(filters, page, sort, 25);
  const stats = useStats(period, url.consulate);
  const s = stats.data;
  const hasFilters = !!(url.q || url.consulate || url.university || url.intake || url.visaStatus || url.from || url.to);
  const rows = data?.applicants ?? [];
  const totalCount = data?.count;

  const sortSelectValue = url.sort ? `${url.sort}:${url.dir || "asc"}` : "";
  const handleSortSelect = (val: string) => {
    if (!val) return setUrl({ sort: "", dir: "" });
    const [key, dir] = val.split(":");
    setUrl({ sort: key, dir: dir || "asc" });
  };

  const handleHeaderSort = (key: string) => {
    if (!sort || sort.key !== key) setUrl({ sort: key, dir: "asc" });
    else if (sort.dir === "asc") setUrl({ sort: key, dir: "desc" });
    else setUrl({ sort: "", dir: "" });
  };

  const clearAll = () => {
    setSearchInput("");
    resetUrl();
  };

  return (
    <>
      <PageHeader
        title="Applicant Tracker"
        count={totalCount}
        description="Community-submitted, admin-approved visa timelines."
      />

      {/* Preserved KPI stats */}
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

      {/* Compact status filter bar */}
      <div className="mb-3">
        <StatusChips value={url.visaStatus} onChange={(v) => setUrl({ visaStatus: v })} counts={s?.byStatus} total={s?.total} />
      </div>

      {/* Compact filter & column toolbar */}
      <div className="card mb-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-[260px]">
            <Icon name="search" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search ID, uni, status, date…"
              aria-label="Filter applicants"
              className="input pl-8"
            />
          </div>

          <Select label="Embassy" value={url.consulate} onChange={(v) => setUrl({ consulate: v })} options={CONSULATE_OPTIONS} className="w-[136px]" />
          <Select label="University" value={url.university} onChange={(v) => setUrl({ university: v })} options={universityOptions} className="w-[170px]" />
          <Select label="Intake" value={url.intake} onChange={(v) => setUrl({ intake: v })} options={intakeOptions} className="w-[136px]" />
          <Select label="Status" value={url.visaStatus} onChange={(v) => setUrl({ visaStatus: v })} options={STATUS_SELECT_OPTIONS} className="w-[165px] sm:hidden" />
          <DateRangePicker value={period} onChange={(p) => setUrl({ from: p.from, to: p.to })} />
          <Select label="Sort" value={sortSelectValue} onChange={handleSortSelect} options={SORT_OPTIONS} className="w-[176px]" />

          <button
            type="button"
            aria-pressed={groupByDate}
            onClick={() => setUrl({ group: groupByDate ? "" : "1" })}
            className={`btn-secondary !min-h-[34px] !px-2.5 text-xs ${
              groupByDate ? "!border-ink-800 !bg-paper-sunk font-semibold" : ""
            }`}
          >
            Group by date
          </button>

          <div className="relative hidden md:block">
            <button
              ref={colsBtnRef}
              type="button"
              onClick={() => setColsOpen((o) => !o)}
              aria-expanded={colsOpen}
              className="btn-secondary !min-h-[34px] !px-2.5 text-xs"
            >
              <Icon name="sliders" size={13} /> Columns
            </button>
            <Popover open={colsOpen} onClose={() => setColsOpen(false)} anchorRef={colsBtnRef as React.RefObject<HTMLElement>} title="Visible columns" align="right" minWidth={200}>
              <div className="space-y-1 p-2">
                {TRACKER_COLUMNS.filter((c) => !c.locked).map((c) => {
                  const checked = visibleCols.includes(c.key);
                  return (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-ink-800 hover:bg-paper-sunk">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCol(c.key)}
                        className="h-3.5 w-3.5 rounded border-line-strong text-ink-800"
                      />
                      <span>{c.label}</span>
                    </label>
                  );
                })}
              </div>
            </Popover>
          </div>

          {hasFilters && (
            <button type="button" onClick={clearAll} className="text-xs font-medium text-blue-600 hover:underline px-1.5">
              Clear filters
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-mute">
          <span className="tabular-nums">
            {loading && totalCount === undefined
              ? "Loading applicants…"
              : totalCount !== undefined
              ? `${totalCount.toLocaleString("en-US")} matching ${totalCount === 1 ? "applicant" : "applicants"}`
              : ""}
          </span>
          {loading && totalCount !== undefined && <span className="text-xs text-mute">Updating…</span>}
        </div>
      </div>

      {/* Desktop high-density table */}
      <section aria-label="Applicants">
        <TrackerRows
          rows={rows}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle={hasFilters ? "No entries match these filters" : "No approved entries yet"}
          emptyHint={hasFilters ? "Try removing a filter or widening the date range." : "Entries appear here after an admin approves them."}
          sort={sort}
          onSort={handleHeaderSort}
          page={data?.page ?? page}
          pageCount={data?.pageCount ?? 1}
          total={totalCount}
          onPage={(p) => setUrl({ page: String(p) })}
          visibleCols={visibleCols}
          groupByDate={groupByDate}
        />
      </section>

      {/* Mobile list */}
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
          total={totalCount}
          onPage={(p) => setUrl({ page: String(p) })}
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
