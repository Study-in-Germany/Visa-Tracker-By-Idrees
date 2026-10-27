"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/StatusBadge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { fmtDate } from "@/lib/format";
import { VISA_STATUS_HEX } from "@/lib/constants";
import { DONE_STATUSES, STAGES, plausible, stageProgress, waitingFor } from "@/lib/journey";
import type { ApplicantRow } from "@/lib/types";

const ROW_H = "min-h-[60px]";

/** Compact two-line row; tapping opens the full record in place. */
function Row({ a, open, onToggle }: { a: ApplicantRow; open: boolean; onToggle: () => void }) {
  const hex = VISA_STATUS_HEX[a.visaStatus] || "#94a3b8";
  const { done, label: stage } = stageProgress(a);
  const waited = waitingFor(a);
  const panelId = `row-${a.id}`;
  const dates = [
    { k: "Joined", v: a.waitingListDate },
    { k: "Documents", v: a.documentSubmissionDate },
    { k: "Correction", v: a.correctionRequestDate },
    { k: "Appointment", v: a.appointmentDate },
  ];
  const next = [a.appointmentDate, a.documentSubmissionDate, a.waitingListDate].find(plausible);

  return (
    <li className="relative overflow-hidden rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(35,47,39,0.05)]" style={open ? { borderColor: `${hex}66` } : undefined}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: hex }} />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={`flex w-full items-center gap-2 pl-4 pr-2.5 text-left active:bg-paper-sunk/60 ${ROW_H}`}
        style={{ backgroundImage: `linear-gradient(90deg, ${hex}1f 0%, transparent 70%)` }}
      >
        <span className="min-w-0 flex-1 py-2">
          <span className="block truncate font-mono text-[13px] font-bold leading-tight text-ink-900">{a.publicId}</span>
          <span className="mt-0.5 block truncate text-[13px] leading-tight text-ink-700">
            {a.university || "University not listed"}
            <span className="text-mute"> · {a.consulate}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1 py-2">
          <StatusBadge status={a.visaStatus} short />
          <span className="text-[12px] tabular-nums leading-none text-mute">{next ? fmtDate(next) : "—"}</span>
        </span>
        <Icon name="chevronDown" size={16} className={`shrink-0 text-mute transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* grid-rows trick animates height without measuring, so nothing jumps */}
      <div id={panelId} className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-line px-4 pb-3 pt-3">
            <p className={`text-[14px] font-semibold ${a.name ? "text-ink-900" : "text-mute"}`}>{a.name || "Anonymous"}</p>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {dates.map((d) => (
                <div key={d.k} className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-mute">{d.k}</dt>
                  <dd className="text-[14px] font-medium tabular-nums text-ink-900">{plausible(d.v) ? fmtDate(d.v) : "—"}</dd>
                </div>
              ))}
            </dl>

            <div>
              <div className="flex gap-1" role="img" aria-label={`Stage ${done} of 4: ${stage}`}>
                {STAGES.map((st, i) => (
                  <span key={st.key} className="h-1.5 flex-1 rounded-full" style={{ background: i < done ? hex : `${hex}2e` }} />
                ))}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[12px] text-ink-700">
                <span className="font-medium">{DONE_STATUSES.has(a.visaStatus) ? stage : `Step ${done} of 4 · ${stage}`}</span>
                {waited && <span className="text-mute">Waiting {waited}</span>}
              </div>
            </div>

            <Link href={`/tracker/${a.publicId}`} className="btn-secondary w-full !min-h-[40px]">
              Open full record <Icon name="chevronRight" size={14} />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <ul className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className={`flex items-center gap-3 rounded-xl border border-line bg-card px-4 ${ROW_H}`}>
          <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-40" /></div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

export default function MobileList({
  rows, loading, error, onRetry, emptyTitle, emptyHint, page, pageCount, total, onPage,
}: {
  rows: ApplicantRow[]; loading: boolean; error?: Error | null; onRetry?: () => void;
  emptyTitle?: string; emptyHint?: string; page: number; pageCount: number; total?: number; onPage: (p: number) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (error && rows.length === 0) return <div className="card"><ErrorState error={error} onRetry={onRetry} /></div>;
  if (loading && rows.length === 0) return <ListSkeleton />;
  if (!loading && rows.length === 0) return <div className="card"><EmptyState title={emptyTitle ?? "Nothing here yet"} hint={emptyHint} /></div>;

  return (
    <div className={`transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
      <ul className="space-y-2">
        {rows.map((a) => <Row key={a.id} a={a} open={openId === a.id} onToggle={() => setOpenId((c) => (c === a.id ? null : a.id))} />)}
      </ul>
      {(pageCount > 1 || total !== undefined) && (
        <nav aria-label="Pagination" className="mt-3 flex items-center justify-between gap-2 text-[13px] text-mute">
          <span>{total !== undefined ? `${total.toLocaleString("en-US")} records` : ""}</span>
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <button type="button" className="btn-secondary !min-h-[40px] !px-3" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
                <Icon name="chevronLeft" />
              </button>
              <span className="px-2 tabular-nums text-ink-700">{page} / {pageCount}</span>
              <button type="button" className="btn-secondary !min-h-[40px] !px-3" disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page">
                <Icon name="chevronRight" />
              </button>
            </div>
          )}
        </nav>
      )}
    </div>
  );
}
