"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/StatusBadge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { fmtDate } from "@/lib/format";
import { VISA_STATUS_HEX } from "@/lib/constants";
import { STAGES, plausible, stageProgress } from "@/lib/journey";
import type { ApplicantRow } from "@/lib/types";

function MobileApplicantCard({ a }: { a: ApplicantRow }) {
  const hex = VISA_STATUS_HEX[a.visaStatus] || "#737373";
  const { done, label: stage } = stageProgress(a);
  const joinDate = plausible(a.waitingListDate) ? fmtDate(a.waitingListDate) : "—";

  return (
    <li>
      <Link
        href={`/tracker/${a.publicId}`}
        className="relative flex flex-col gap-2 overflow-hidden rounded-xl border border-line bg-card p-3.5 pl-4 transition-colors hover:bg-[rgb(var(--hover))] active:bg-[rgb(var(--hover))]"
      >
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: hex }} />

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="block font-mono text-[13px] font-bold text-ink-900">{a.publicId}</span>
            <p className="mt-0.5 truncate text-[13px] font-medium text-ink-800">
              {a.university || "University not listed"}
              {a.program ? <span className="font-normal text-mute"> · {a.program}</span> : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <StatusBadge status={a.visaStatus} short />
            <Icon name="chevronRight" size={16} className="text-mute" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-mute">
          <span>{a.consulate} embassy</span>
          <span className="tabular-nums">Joined: {joinDate}</span>
        </div>

        <div className="space-y-1 pt-0.5">
          <div className="flex gap-1" role="img" aria-label={`Stage ${done} of 4: ${stage}`}>
            {STAGES.map((st, i) => (
              <span
                key={st.key}
                className="h-1 flex-1 rounded-full"
                style={{ background: i < done ? hex : `${hex}2e` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-mute">
            <span>{stage}</span>
            <span className="tabular-nums">{done}/4 stages</span>
          </div>
        </div>
      </Link>
    </li>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="space-y-2.5 rounded-xl border border-line bg-card p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-48" />
            </div>
            <Skeleton className="h-6 w-20 rounded-[5px]" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </li>
      ))}
    </ul>
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
  total = 0,
  onPage,
}: {
  rows: ApplicantRow[];
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
  emptyTitle: string;
  emptyHint: string;
  page: number;
  pageCount: number;
  pageSize?: number;
  total?: number;
  onPage: (n: number) => void;
  onPageSize?: (n: number) => void;
}) {
  if (error && rows.length === 0) return <div className="card"><ErrorState error={error} onRetry={onRetry} /></div>;
  if (loading && rows.length === 0) return <ListSkeleton />;
  if (rows.length === 0) return <div className="card"><EmptyState title={emptyTitle} hint={emptyHint} /></div>;

  const safeCount = Math.max(1, pageCount);
  const safePage = Math.min(Math.max(1, page), safeCount);

  return (
    <div className={loading ? "opacity-60" : ""}>
      <ul className="space-y-2.5">
        {rows.map((a) => (
          <MobileApplicantCard key={a.id} a={a} />
        ))}
      </ul>

      {/* Compact mobile pagination */}
      <nav aria-label="Mobile pagination" className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-line bg-card px-2.5 py-2">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 text-xs font-semibold text-ink-800 hover:bg-[rgb(var(--hover))] disabled:opacity-35"
        >
          <Icon name="arrowLeft" size={15} /> Prev
        </button>
        <span className="text-center text-xs tabular-nums text-mute">
          Page <strong className="text-ink-900">{safePage}</strong> / {safeCount} · {total.toLocaleString("en-US")} entries
        </span>
        <button
          type="button"
          onClick={() => onPage(Math.min(safeCount, safePage + 1))}
          disabled={safePage >= safeCount}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 text-xs font-semibold text-ink-800 hover:bg-[rgb(var(--hover))] disabled:opacity-35"
        >
          Next <Icon name="chevronRight" size={15} />
        </button>
      </nav>
    </div>
  );
}
