"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import Pagination from "@/components/ui/Pagination";
import StatusBadge from "@/components/StatusBadge";
import { fmtDate } from "@/lib/format";
import { plausible } from "@/lib/journey";
import type { ApplicantRow } from "@/lib/types";
import type { SortState } from "@/components/ui/DataTable";

export type TrackerColumnKey =
  | "queue"
  | "publicId"
  | "name"
  | "university"
  | "program"
  | "intake"
  | "consulate"
  | "waitingListDate"
  | "submissionInviteDate"
  | "documentSubmissionDate"
  | "correctionRequestDate"
  | "appointmentDate"
  | "decisionDate"
  | "updatedAt"
  | "visaStatus";

export type TrackerColumnDef = {
  key: TrackerColumnKey;
  label: string;
  sortKey?: string;
  align?: "left" | "right";
  defaultVisible: boolean;
  locked?: boolean;
};

export const TRACKER_COLUMNS: TrackerColumnDef[] = [
  { key: "queue", label: "Queue", align: "right", defaultVisible: true },
  { key: "publicId", label: "Tracking ID", sortKey: "publicId", defaultVisible: true, locked: true },
  { key: "name", label: "Applicant", defaultVisible: true },
  { key: "university", label: "University", sortKey: "university", defaultVisible: true },
  { key: "program", label: "Program", defaultVisible: false },
  { key: "intake", label: "Intake", sortKey: "intake", defaultVisible: false },
  { key: "consulate", label: "Embassy", sortKey: "consulate", defaultVisible: true },
  { key: "waitingListDate", label: "Waiting List", sortKey: "waitingListDate", defaultVisible: true },
  { key: "submissionInviteDate", label: "Invited", sortKey: "submissionInviteDate", defaultVisible: true },
  { key: "documentSubmissionDate", label: "Submitted", sortKey: "documentSubmissionDate", defaultVisible: true },
  { key: "correctionRequestDate", label: "Correction", defaultVisible: false },
  { key: "appointmentDate", label: "Appointment", sortKey: "appointmentDate", defaultVisible: true },
  { key: "decisionDate", label: "Decision", sortKey: "decisionDate", defaultVisible: false },
  { key: "updatedAt", label: "Updated", sortKey: "updatedAt", defaultVisible: false },
  { key: "visaStatus", label: "Status", sortKey: "visaStatus", align: "right", defaultVisible: true, locked: true },
];

export const DEFAULT_VISIBLE_COLS: TrackerColumnKey[] = TRACKER_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key);

function isRecentlyUpdated(iso?: string) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 7 * 86_400_000;
}

function fmtRelativeShort(iso?: string) {
  if (!iso) return "—";
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (d === 0) return "Today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
}

function groupKeyFor(a: ApplicantRow): string {
  if (!plausible(a.waitingListDate)) return "No waiting-list date";
  return fmtDate(a.waitingListDate);
}

export default function TrackerRows({
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
  total,
  onPage,
  visibleCols,
  groupByDate = false,
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
  total?: number;
  onPage: (p: number) => void;
  visibleCols: TrackerColumnKey[];
  groupByDate?: boolean;
}) {
  const router = useRouter();
  const visibleSet = new Set(visibleCols);
  const activeColumns = TRACKER_COLUMNS.filter((c) => c.locked || visibleSet.has(c.key));

  if (error && rows.length === 0) {
    return (
      <div className="card hidden md:block">
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }
  if (loading && rows.length === 0) {
    return (
      <div className="card hidden divide-y divide-line overflow-hidden md:block" aria-hidden="true">
        <div className="h-9 bg-paper-raised" />
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
        ))}
      </div>
    );
  }
  if (!loading && rows.length === 0) {
    return (
      <div className="card hidden md:block">
        <EmptyState title={emptyTitle} hint={emptyHint} />
      </div>
    );
  }

  const openRow = (e: React.MouseEvent, publicId: string) => {
    if ((e.target as HTMLElement).closest("a,button")) return;
    if (e.metaKey || e.ctrlKey) window.open(`/tracker/${publicId}`, "_blank");
    else router.push(`/tracker/${publicId}`);
  };

  const renderCell = (col: TrackerColumnDef, a: ApplicantRow) => {
    switch (col.key) {
      case "queue":
        return a.queuePosition ? (
          <span className="font-mono text-xs tabular-nums text-mute">#{a.queuePosition}</span>
        ) : (
          <span className="text-mute">—</span>
        );
      case "publicId": {
        const recent = isRecentlyUpdated(a.updatedAt);
        return (
          <span className="inline-flex items-center gap-1.5">
            {recent && (
              <span
                title={`Updated ${fmtRelativeShort(a.updatedAt)}`}
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"
                aria-label="Recently updated"
              />
            )}
            <Link href={`/tracker/${a.publicId}`} className="font-mono text-[13px] font-medium text-blue-600 hover:underline">
              {a.publicId}
            </Link>
          </span>
        );
      }
      case "name":
        return (
          <span className={`block max-w-[140px] truncate ${a.name ? "text-ink-800" : "text-mute"}`}>
            {a.name || "Anonymous"}
          </span>
        );
      case "university":
        return (
          <span className="block max-w-[220px] truncate text-ink-800" title={a.university || undefined}>
            {a.university || <span className="text-mute">—</span>}
          </span>
        );
      case "program":
        return (
          <span className="block max-w-[180px] truncate text-ink-700" title={a.program || undefined}>
            {a.program || <span className="text-mute">—</span>}
          </span>
        );
      case "intake":
        return <span className="whitespace-nowrap text-ink-700">{a.intake || "—"}</span>;
      case "consulate":
        return <span className="whitespace-nowrap text-ink-700">{a.consulate}</span>;
      case "waitingListDate":
        return <span className="whitespace-nowrap tabular-nums text-ink-800">{plausible(a.waitingListDate) ? fmtDate(a.waitingListDate) : "—"}</span>;
      case "submissionInviteDate":
        return <span className="whitespace-nowrap tabular-nums text-ink-700">{plausible(a.submissionInviteDate) ? fmtDate(a.submissionInviteDate) : "—"}</span>;
      case "documentSubmissionDate":
        return <span className="whitespace-nowrap tabular-nums text-ink-700">{plausible(a.documentSubmissionDate) ? fmtDate(a.documentSubmissionDate) : "—"}</span>;
      case "correctionRequestDate":
        return <span className="whitespace-nowrap tabular-nums text-ink-700">{plausible(a.correctionRequestDate) ? fmtDate(a.correctionRequestDate) : "—"}</span>;
      case "appointmentDate":
        return <span className="whitespace-nowrap tabular-nums text-ink-700">{plausible(a.appointmentDate) ? fmtDate(a.appointmentDate) : "—"}</span>;
      case "decisionDate":
        return <span className="whitespace-nowrap tabular-nums text-ink-700">{plausible(a.decisionDate) ? fmtDate(a.decisionDate) : "—"}</span>;
      case "updatedAt":
        return <span className="whitespace-nowrap tabular-nums text-xs text-mute">{fmtRelativeShort(a.updatedAt)}</span>;
      case "visaStatus":
        return <StatusBadge status={a.visaStatus} />;
    }
  };

  let lastGroup = "";

  return (
    <div className={`hidden md:block ${loading ? "opacity-60" : ""} transition-opacity`} aria-busy={loading}>
      <div className="card overflow-hidden">
        <div className="max-h-[75vh] overflow-auto">
          <table className="w-full border-collapse text-[13px]">
            <caption className="sr-only">Visa applicants</caption>
            <thead className="sticky top-0 z-10 border-b border-line bg-paper-raised text-left text-[11px] font-medium uppercase tracking-wider text-mute">
              <tr>
                {activeColumns.map((c) => {
                  const active = !!c.sortKey && sort?.key === c.sortKey;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={active ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined}
                      className={`whitespace-nowrap px-3 py-2.5 font-medium ${c.align === "right" ? "text-right" : ""}`}
                    >
                      {c.sortKey ? (
                        <button
                          type="button"
                          onClick={() => onSort(c.sortKey!)}
                          className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-ink-900 ${c.align === "right" ? "flex-row-reverse" : ""
                            }`}
                        >
                          <span>{c.label}</span>
                          {active && <Icon name={sort?.dir === "asc" ? "chevronUp" : "chevronDown"} size={12} />}
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-card">
              {rows.map((a) => {
                const gk = groupByDate ? groupKeyFor(a) : "";
                const showGroupHeader = groupByDate && gk !== lastGroup;
                if (showGroupHeader) lastGroup = gk;

                return (
                  <Fragment key={a.id}>
                    {showGroupHeader && (
                      <tr className="bg-paper-raised">
                        <td colSpan={activeColumns.length} className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
                          Waiting list: {gk}
                        </td>
                      </tr>
                    )}
                    <tr
                      onClick={(e) => openRow(e, a.publicId)}
                      className="h-[46px] cursor-pointer transition-colors hover:bg-paper-sunk/70"
                    >
                      {activeColumns.map((c) => (
                        <td
                          key={c.key}
                          className={`px-3 py-2 align-middle ${c.align === "right" ? "text-right" : ""}`}
                        >
                          {renderCell(c, a)}
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination className="mt-3" page={page} pageCount={pageCount} total={total} noun="applicants" onPage={onPage} />
    </div>
  );
}
