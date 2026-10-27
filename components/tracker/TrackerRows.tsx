"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import Pagination from "@/components/ui/Pagination";
import StatusBadge from "@/components/StatusBadge";
import { fmtDate } from "@/lib/format";
import { VISA_STATUS_HEX } from "@/lib/constants";
import { DONE_STATUSES, STAGES, plausible, stageProgress, waitingFor } from "@/lib/journey";
import type { ApplicantRow } from "@/lib/types";
import type { SortState } from "@/components/ui/DataTable";

// Columns grow with the screen: tablets show ID, university, progress and status; desktops add embassy and waiting time.
const GRID = "md:grid-cols-[minmax(130px,0.9fr)_minmax(180px,1.7fr)_minmax(130px,1.1fr)_auto] lg:grid-cols-[minmax(150px,1fr)_minmax(220px,1.9fr)_100px_minmax(140px,1fr)_minmax(150px,1.2fr)_150px]";

function Head({ label, sortKey, sort, onSort, className = "" }: { label: string; sortKey?: string; sort: SortState; onSort: (k: string) => void; className?: string }) {
  const active = !!sortKey && sort?.key === sortKey;
  return (
    <div className={className} role="columnheader" aria-sort={active ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined}>
      {sortKey ? (
        <button type="button" onClick={() => onSort(sortKey)} className="inline-flex min-h-[32px] items-center gap-1 uppercase tracking-wider hover:text-ink-900">
          {label}
          {active && <Icon name={sort?.dir === "asc" ? "chevronUp" : "chevronDown"} size={13} />}
        </button>
      ) : label}
    </div>
  );
}

/** Desktop and tablet list: roomy full-width rows with a coloured status rail, the stage reached and how long the wait has been. */
export default function TrackerRows({
  rows, loading, error, onRetry, emptyTitle, emptyHint, sort, onSort, page, pageCount, total, onPage,
}: {
  rows: ApplicantRow[]; loading: boolean; error?: Error | null; onRetry?: () => void; emptyTitle: string; emptyHint: string;
  sort: SortState; onSort: (key: string) => void; page: number; pageCount: number; total?: number; onPage: (p: number) => void;
}) {
  if (error && rows.length === 0) return <div className="card hidden md:block"><ErrorState error={error} onRetry={onRetry} /></div>;
  if (loading && rows.length === 0) return <div className="card hidden space-y-2 p-4 md:block" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-[68px] w-full" />)}</div>;
  if (!loading && rows.length === 0) return <div className="card hidden md:block"><EmptyState title={emptyTitle} hint={emptyHint} /></div>;

  return (
    <div className={`hidden md:block ${loading ? "opacity-60" : ""} transition-opacity`} aria-busy={loading}>
      <div className="card overflow-hidden">
        <div role="row" className={`grid items-center gap-4 border-b border-line bg-paper-sunk/60 px-5 py-2 text-[11px] font-semibold text-mute ${GRID}`}>
          <Head label="Tracking ID" sortKey="publicId" sort={sort} onSort={onSort} />
          <Head label="University" sortKey="university" sort={sort} onSort={onSort} />
          <Head label="Embassy" sortKey="consulate" sort={sort} onSort={onSort} className="hidden lg:block" />
          <Head label="Waiting list" sortKey="waitingListDate" sort={sort} onSort={onSort} className="hidden lg:block" />
          <Head label="Progress" sort={sort} onSort={onSort} />
          <Head label="Status" sortKey="visaStatus" sort={sort} onSort={onSort} className="lg:text-right" />
        </div>
        <ul>
          {rows.map((a) => {
            const hex = VISA_STATUS_HEX[a.visaStatus] || "#94a3b8";
            const { done, label } = stageProgress(a);
            const waited = waitingFor(a);
            return (
              <li key={a.id} className="border-b border-line last:border-0">
                <Link href={`/tracker/${a.publicId}`} className={`group grid items-center gap-4 py-4 pl-[18px] pr-5 transition-colors hover:bg-paper-sunk/60 ${GRID}`} style={{ boxShadow: `inset 4px 0 0 ${hex}` }}>
                  <div className="min-w-0">
                    <p className="font-mono text-[14px] font-bold leading-tight">{a.publicId}</p>
                    <p className={`mt-0.5 truncate text-xs ${a.name ? "text-ink-700" : "text-mute"}`}>{a.name || "Anonymous"}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium leading-tight">{a.university || <span className="font-normal text-mute">Not listed</span>}</p>
                    <p className="mt-0.5 truncate text-xs text-mute">{[a.program, a.intake].filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                  <p className="hidden text-[13px] lg:block">{a.consulate}</p>
                  <div className="hidden lg:block">
                    <p className="text-[13px] tabular-nums">{plausible(a.waitingListDate) ? fmtDate(a.waitingListDate) : "—"}</p>
                    {waited && <p className="text-xs text-mute">{waited}</p>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex gap-1" role="img" aria-label={`Stage ${done} of 4: ${label}`}>
                      {STAGES.map((s, i) => <span key={s.key} className="h-1.5 flex-1 rounded-full" style={{ background: i < done ? hex : `${hex}2e` }} />)}
                    </div>
                    <p className="mt-1.5 truncate text-xs text-ink-700">{DONE_STATUSES.has(a.visaStatus) ? label : `Step ${done} of 4 · ${label}`}</p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <StatusBadge status={a.visaStatus} />
                    <Icon name="chevronRight" size={15} className="hidden text-mute transition-transform group-hover:translate-x-0.5 lg:block" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <Pagination className="mt-3" page={page} pageCount={pageCount} total={total} noun="records" onPage={onPage} />
    </div>
  );
}
