"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { EmptyState, ErrorState } from "@/components/ui/States";
import StatusBadge from "@/components/StatusBadge";
import TrackerPagination from "./TrackerPagination";
import TrackerTableSkeleton from "./TrackerTableSkeleton";
import { fmtDate } from "@/lib/format";
import { VISA_STATUS_HEX } from "@/lib/constants";
import { DONE_STATUSES, STAGES, plausible, stageProgress, waitingFor } from "@/lib/journey";
import type { ApplicantRow } from "@/lib/types";
import type { SortState } from "@/components/ui/DataTable";

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
  className = "",
  alignRight = false,
}: {
  label: string;
  sortKey?: string;
  sort: SortState;
  onSort: (k: string) => void;
  className?: string;
  alignRight?: boolean;
}) {
  const active = !!sortKey && sort?.key === sortKey;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined}
      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-mute whitespace-nowrap ${
        alignRight ? "text-right" : "text-left"
      } ${className}`}
    >
      {sortKey ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={`inline-flex min-h-[24px] items-center gap-1 uppercase tracking-wider hover:text-ink-900 ${
            alignRight ? "justify-end" : ""
          }`}
        >
          <span>{label}</span>
          {active && <Icon name={sort?.dir === "asc" ? "chevronUp" : "chevronDown"} size={13} />}
        </button>
      ) : (
        label
      )}
    </th>
  );
}

/**
 * Valley `/admin?tab=tickets` edge-to-edge table workspace:
 * - Occupies full remaining vertical height and workspace width (no floating rounded card).
 * - Opaque sticky header inside an independently scrollable table region.
 * - Full-width pagination footer anchored at the absolute bottom.
 */
export default function TrackerTable({
  rows,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyHint,
  sort,
  onSort,
  page,
  pageCount,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  rows: ApplicantRow[];
  loading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyTitle: string;
  emptyHint: string;
  sort: SortState;
  onSort: (key: string) => void;
  page: number;
  pageCount: number;
  pageSize: number;
  total?: number;
  onPage: (p: number) => void;
  onPageSize: (ps: number) => void;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [page, pageSize]);

  if (error && rows.length === 0) {
    return (
      <div
        data-testid="tracker-table-workspace"
        className="hidden md:flex md:min-h-0 md:flex-1 md:flex-col overflow-hidden bg-paper"
      >
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <ErrorState error={error} onRetry={onRetry} />
        </div>
        <TrackerPagination
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          total={total}
          onPage={onPage}
          onPageSize={onPageSize}
        />
      </div>
    );
  }

  if (loading && rows.length === 0) {
    return <TrackerTableSkeleton rows={10} />;
  }

  return (
    <div
      data-testid="tracker-table-workspace"
      className={`hidden md:flex md:min-h-0 md:flex-1 md:flex-col overflow-hidden bg-paper transition-opacity ${
        loading ? "opacity-60" : ""
      }`}
      aria-busy={loading}
    >
      {rows.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <EmptyState title={emptyTitle} hint={emptyHint} />
        </div>
      ) : (
        <div
          ref={scrollRef}
          data-testid="tracker-table-scroll"
          className="min-h-0 flex-1 overflow-auto bg-paper"
        >
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-paper-sunk shadow-[0_1px_0_rgb(var(--line))]">
              <tr>
                <SortableHead label="Tracking ID" sortKey="publicId" sort={sort} onSort={onSort} className="pl-5" />
                <SortableHead label="University" sortKey="university" sort={sort} onSort={onSort} />
                <SortableHead
                  label="Embassy"
                  sortKey="consulate"
                  sort={sort}
                  onSort={onSort}
                  className="hidden lg:table-cell"
                />
                <SortableHead
                  label="Waiting list"
                  sortKey="waitingListDate"
                  sort={sort}
                  onSort={onSort}
                  className="hidden lg:table-cell"
                />
                <SortableHead label="Progress" sort={sort} onSort={onSort} />
                <SortableHead
                  label="Status"
                  sortKey="visaStatus"
                  sort={sort}
                  onSort={onSort}
                  alignRight
                  className="pr-5"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((a) => {
                const hex = VISA_STATUS_HEX[a.visaStatus] || "#94a3b8";
                const { done, label } = stageProgress(a);
                const waited = waitingFor(a);
                const href = `/tracker/${a.publicId}`;

                return (
                  <tr
                    key={a.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("a, button")) return;
                      router.push(href);
                    }}
                    className="group cursor-pointer transition-colors hover:bg-paper-sunk/70"
                  >
                    <td
                      className="py-3 pl-5 pr-4 align-middle whitespace-nowrap"
                      style={{ boxShadow: `inset 3px 0 0 ${hex}` }}
                    >
                      <Link
                        href={href}
                        className="block font-mono text-[13px] font-bold leading-tight text-ink-900 focus-visible:underline"
                      >
                        {a.publicId}
                      </Link>
                      <p className={`mt-0.5 max-w-[160px] truncate text-xs ${a.name ? "text-ink-700" : "text-mute"}`}>
                        {a.name || "Anonymous"}
                      </p>
                    </td>

                    <td className="max-w-[260px] px-4 py-3 align-middle">
                      <p className="truncate text-[13px] font-medium leading-tight text-ink-900">
                        {a.university || <span className="font-normal text-mute">Not listed</span>}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-mute">
                        {[a.program, a.intake].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </td>

                    <td className="hidden px-4 py-3 align-middle text-[13px] text-ink-700 whitespace-nowrap lg:table-cell">
                      {a.consulate}
                    </td>

                    <td className="hidden px-4 py-3 align-middle whitespace-nowrap lg:table-cell">
                      <p className="text-[13px] tabular-nums text-ink-900">
                        {plausible(a.waitingListDate) ? fmtDate(a.waitingListDate) : "—"}
                      </p>
                      {waited && <p className="text-xs text-mute">{waited}</p>}
                    </td>

                    <td className="min-w-[130px] max-w-[200px] px-4 py-3 align-middle">
                      <div className="flex gap-1" role="img" aria-label={`Stage ${done} of 4: ${label}`}>
                        {STAGES.map((s, i) => (
                          <span
                            key={s.key}
                            className="h-1.5 flex-1 rounded-full"
                            style={{ background: i < done ? hex : `${hex}2e` }}
                          />
                        ))}
                      </div>
                      <p className="mt-1.5 truncate text-xs text-ink-700">
                        {DONE_STATUSES.has(a.visaStatus) ? label : `Step ${done} of 4 · ${label}`}
                      </p>
                    </td>

                    <td className="py-3 pl-4 pr-5 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <StatusBadge status={a.visaStatus} short />
                        <Icon
                          name="chevronRight"
                          size={15}
                          className="hidden text-mute transition-transform group-hover:translate-x-0.5 lg:inline-block"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <TrackerPagination
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        total={total}
        onPage={onPage}
        onPageSize={onPageSize}
      />
    </div>
  );
}
