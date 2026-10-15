"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import DataTable, { Column, SortState } from "@/components/ui/DataTable";
import DateRangePicker from "@/components/ui/DateRangePicker";
import Select from "@/components/ui/Select";
import { Chip, FilterChip } from "@/components/ui/Chip";
import { LoadingBlock, Notice } from "@/components/ui/States";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/StatusBadge";
import { CONSULATE_OPTIONS } from "@/components/PeriodFilters";
import { useApplicants } from "@/hooks/useApplicants";
import { useDebounced } from "@/hooks/useDebounced";
import { apiFetch, jsonInit } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { describePeriod } from "@/lib/dates";
import { APPROVAL_COLORS, APPROVAL_LABELS, VISA_STATUS_LABELS } from "@/lib/constants";
import { VISA_STATUS_OPTIONS } from "@/lib/options";
import type { Period } from "@/lib/period";
import type { ApplicantRow } from "@/lib/types";

const APPROVAL_OPTIONS = [{ value: "", label: "All reviews" }, ...Object.entries(APPROVAL_LABELS).map(([value, label]) => ({ value, label }))];

function ApplicantsInner() {
  const sp = useSearchParams();
  const [approval, setApproval] = useState(sp.get("approval") || "");
  const [consulate, setConsulate] = useState("");
  const [university, setUniversity] = useState("");
  const [visaStatus, setVisaStatus] = useState("");
  const [period, setPeriod] = useState<Period>({ from: "", to: "" });
  const [search, setSearch] = useState(sp.get("q") || "");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: "createdAt", dir: "desc" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const q = useDebounced(search.trim());
  const filters = useMemo(() => ({ q, approval, consulate, university, visaStatus, from: period.from, to: period.to }), [q, approval, consulate, university, visaStatus, period]);
  useEffect(() => setPage(1), [filters]);

  const { data, error, loading, reload } = useApplicants(filters, page, sort);
  const hasFilters = !!(q || approval || consulate || university || visaStatus || period.from || period.to);

  async function act(id: string, run: () => Promise<unknown>, okText: string) {
    setBusyId(id);
    setMessage(null);
    try {
      await run();
      setMessage({ tone: "success", text: okText });
      reload();
    } catch (e: any) {
      setMessage({ tone: "error", text: e?.message || "That action failed." });
    } finally {
      setBusyId(null);
    }
  }

  const setApprovalFor = (a: ApplicantRow, next: string) =>
    act(a.id, () => apiFetch(`/api/applicants/${a.id}`, jsonInit("PATCH", { approval: next })), `${a.publicId} marked ${APPROVAL_LABELS[next].toLowerCase()}.`);

  const remove = (a: ApplicantRow) => {
    if (!confirm(`Delete ${a.publicId} permanently? This cannot be undone.`)) return;
    act(a.id, () => apiFetch(`/api/applicants/${a.id}`, { method: "DELETE" }), `${a.publicId} deleted.`);
  };

  const columns: Column<ApplicantRow>[] = [
    {
      key: "id",
      header: "Tracking ID",
      sortKey: "publicId",
      mobile: "title",
      cell: (a) => (
        <Link href={`/admin/applicants/${a.id}`} className="font-mono font-medium hover:text-clay-600 hover:underline">
          {a.publicId}
        </Link>
      ),
    },
    { key: "name", header: "Name", cell: (a) => <>{a.name}{a.isAnonymous && <span className="text-xs text-mute"> (anon.)</span>}</> },
    { key: "university", header: "University", sortKey: "university", hideBelow: "lg", cell: (a) => a.university || "—", filter: { type: "text", label: "University", placeholder: "University contains…", value: university, onChange: setUniversity } },
    { key: "consulate", header: "Embassy", sortKey: "consulate", hideBelow: "lg", cell: (a) => a.consulate, filter: { type: "select", label: "Embassy", value: consulate, options: CONSULATE_OPTIONS.filter((o) => o.value), onChange: setConsulate } },
    { key: "status", header: "Visa status", sortKey: "visaStatus", cell: (a) => <StatusBadge status={a.visaStatus} />, filter: { type: "select", label: "Visa status", value: visaStatus, options: VISA_STATUS_OPTIONS, onChange: setVisaStatus } },
    { key: "review", header: "Review", mobile: "badge", cell: (a) => <Chip className={APPROVAL_COLORS[a.approval || ""]}>{APPROVAL_LABELS[a.approval || ""] || a.approval}</Chip>, filter: { type: "select", label: "Review state", value: approval, options: APPROVAL_OPTIONS.filter((o) => o.value), onChange: setApproval } },
    { key: "submitted", header: "Submitted", sortKey: "createdAt", hideBelow: "xl", cell: (a) => fmtDate(a.createdAt) },
  ];

  const btn = "inline-flex min-h-[30px] items-center rounded-md px-2 text-xs font-semibold disabled:opacity-50";

  return (
    <>
      <PageHeader
        title="Applicants"
        description="Review submissions and manage records."
        actions={
          <>
            <DateRangePicker value={period} onChange={setPeriod} label="Waiting list" />
            <Select variant="pill" label="Review state" prefix="Review" value={approval} onChange={setApproval} options={APPROVAL_OPTIONS} className="w-full sm:w-auto" />
            <Select variant="pill" label="Embassy" prefix="Embassy" value={consulate} onChange={setConsulate} options={CONSULATE_OPTIONS} className="w-full sm:w-auto" />
          </>
        }
      />

      {message && <div className="mb-3"><Notice tone={message.tone}>{message.text}</Notice></div>}

      <section className="card overflow-hidden" aria-label="Applicants">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <div className="relative w-full sm:w-64">
            <Icon name="search" size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
            <input className="input !min-h-[30px] !py-1 pl-8 !text-xs" type="search" aria-label="Filter the table" placeholder="Filter this table…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {approval && <FilterChip label={APPROVAL_LABELS[approval]} active onRemove={() => setApproval("")} />}
            {consulate && <FilterChip label={consulate} active onRemove={() => setConsulate("")} />}
            {university && <FilterChip label={`University: ${university}`} active onRemove={() => setUniversity("")} />}
            {visaStatus && <FilterChip label={VISA_STATUS_LABELS[visaStatus]} active onRemove={() => setVisaStatus("")} />}
            {(period.from || period.to) && <FilterChip label={describePeriod(period)} active onRemove={() => setPeriod({ from: "", to: "" })} />}
          </div>
        </div>
        <DataTable
          embedded
          caption="Applicants"
          rowHref={(a) => `/admin/applicants/${a.id}`}
          columns={columns}
          rows={data?.applicants ?? []}
          rowKey={(a) => a.id}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle={hasFilters ? "No applicants match these filters" : "No applicants yet"}
          sort={sort}
          onSort={(s) => { setSort(s); setPage(1); }}
          page={data?.page ?? page}
          pageCount={data?.pageCount ?? 1}
          total={data?.count}
          onPage={setPage}
          actions={(a) => (
            <>
              {a.approval !== "APPROVED" && <button disabled={busyId === a.id} onClick={() => setApprovalFor(a, "APPROVED")} className={`${btn} text-emerald-800 hover:bg-emerald-50`}>Approve</button>}
              {a.approval !== "REJECTED" && <button disabled={busyId === a.id} onClick={() => setApprovalFor(a, "REJECTED")} className={`${btn} text-red-800 hover:bg-red-50`}>Reject</button>}
              <Link href={`/admin/applicants/${a.id}`} className={`${btn} text-ink-800 hover:bg-paper-sunk`}>Edit</Link>
              <button disabled={busyId === a.id} onClick={() => remove(a)} className={`${btn} text-mute hover:bg-paper-sunk`}>Delete</button>
            </>
          )}
        />
      </section>
    </>
  );
}

export default function AdminApplicantsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <ApplicantsInner />
    </Suspense>
  );
}
