"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/StatusBadge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { fmtDate } from "@/lib/format";
import { plausible } from "@/lib/journey";
import type { ApplicantRow } from "@/lib/types";

/** Compact mobile list with expandable milestone details. */
function Row({ a, open, onToggle }: { a: ApplicantRow; open: boolean; onToggle: () => void }) {
  const panelId = `row-${a.id}`;
  const dates = [
    { k: "Waiting List", v: a.waitingListDate },
    { k: "Invited", v: a.submissionInviteDate },
    { k: "Submitted", v: a.documentSubmissionDate },
    { k: "Appointment", v: a.appointmentDate },
  ];

  return (
    <li className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[54px] w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors active:bg-paper-sunk"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {a.queuePosition && (
              <span className="font-mono text-[11px] tabular-nums text-mute">#{a.queuePosition}</span>
            )}
            <span className="font-mono text-[13px] font-semibold text-ink-900">{a.publicId}</span>
            {a.name && <span className="truncate text-xs text-mute">· {a.name}</span>}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-ink-700">
            {a.university || "University not listed"}
            <span className="text-mute"> · {a.consulate}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={a.visaStatus} short />
          <span className="text-[11px] tabular-nums text-mute">
            {plausible(a.waitingListDate) ? fmtDate(a.waitingListDate) : "—"}
          </span>
        </span>
        <Icon name="chevronDown" size={15} className={`shrink-0 text-mute transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div id={panelId} className="border-t border-line bg-paper-raised px-3 py-3 space-y-3">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
            {dates.map((d) => (
              <div key={d.k} className="min-w-0">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-mute">{d.k}</dt>
                <dd className="text-[13px] font-medium tabular-nums text-ink-900">
                  {plausible(d.v) ? fmtDate(d.v) : "—"}
                </dd>
              </div>
            ))}
          </dl>
          <Link href={`/tracker/${a.publicId}`} className="btn-secondary w-full !min-h-[38px]">
            Open full timeline <Icon name="chevronRight" size={14} />
          </Link>
        </div>
      )}
    </li>
  );
}

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-line overflow-hidden" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function MobileList({
  rows,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyHint,
  page,
  pageCount,
  total,
  onPage,
}: {
  rows: ApplicantRow[];
  loading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyHint?: string;
  page: number;
  pageCount: number;
  total?: number;
  onPage: (p: number) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (error && rows.length === 0) return <div className="card"><ErrorState error={error} onRetry={onRetry} /></div>;
  if (loading && rows.length === 0) return <ListSkeleton />;
  if (!loading && rows.length === 0) return <div className="card"><EmptyState title={emptyTitle ?? "Nothing here yet"} hint={emptyHint} /></div>;

  return (
    <div className={`transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
      <ul className="card overflow-hidden">
        {rows.map((a) => (
          <Row
            key={a.id}
            a={a}
            open={openId === a.id}
            onToggle={() => setOpenId((c) => (c === a.id ? null : a.id))}
          />
        ))}
      </ul>
      {(pageCount > 1 || total !== undefined) && (
        <nav aria-label="Pagination" className="mt-3 flex items-center justify-between gap-2 text-[13px] text-mute">
          <span className="tabular-nums">{total !== undefined ? `${total.toLocaleString("en-US")} applicants` : ""}</span>
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="btn-secondary !min-h-[38px] !px-2.5"
                disabled={page <= 1}
                onClick={() => onPage(page - 1)}
                aria-label="Previous page"
              >
                <Icon name="chevronLeft" />
              </button>
              <span className="px-2 tabular-nums text-ink-700">{page} / {pageCount}</span>
              <button
                type="button"
                className="btn-secondary !min-h-[38px] !px-2.5"
                disabled={page >= pageCount}
                onClick={() => onPage(page + 1)}
                aria-label="Next page"
              >
                <Icon name="chevronRight" />
              </button>
            </div>
          )}
        </nav>
      )}
    </div>
  );
}
