"use client";

import React from "react";
import Icon from "./Icon";

export type TablePaginationProps = {
  page: number;
  pageCount: number;
  pageSize: number;
  total?: number;
  noun?: string;
  onPage: (page: number) => void;
  onPageSize?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  /** Pin to bottom of a flex workspace like Valley Tickets; false renders as a standard bar. */
  pinned?: boolean;
};

function buildPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const leftSibling = Math.max(currentPage - 1, 1);
  const rightSibling = Math.min(currentPage + 1, totalPages);
  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  if (!showLeftDots && showRightDots) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (showLeftDots && !showRightDots) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", leftSibling, currentPage, rightSibling, "...", totalPages];
}

/**
 * Valley Tickets-style fixed-bottom pagination bar:
 * Left: record range summary ("Showing X to Y of Z records")
 * Center: numbered page controls (PREV, page buttons, NEXT)
 * Right: page-size selector (when onPageSize is provided)
 */
export default function TablePagination({
  page,
  pageCount,
  pageSize,
  total = 0,
  noun = "records",
  onPage,
  onPageSize,
  pageSizeOptions = [10, 25, 50, 100],
  className = "",
  pinned = true,
}: TablePaginationProps) {
  const safePageCount = Math.max(1, pageCount);
  const safePage = Math.min(Math.max(1, page), safePageCount);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);
  const pages = buildPageNumbers(safePage, safePageCount);

  return (
    <nav
      aria-label="Pagination"
      className={`${
        pinned ? "shrink-0 border-t border-line bg-paper-raised px-4 py-2.5 sm:px-6 z-10" : "border-t border-line bg-paper-raised px-4 py-2.5 sm:px-6"
      } grid grid-cols-1 items-center gap-3 sm:grid-cols-3 ${className}`}
    >
      {/* Left: record range */}
      <div className="text-center text-xs font-medium text-mute sm:text-left">
        Showing <span className="font-semibold text-ink-900 tabular-nums">{start.toLocaleString("en-US")}</span> to{" "}
        <span className="font-semibold text-ink-900 tabular-nums">{end.toLocaleString("en-US")}</span> of{" "}
        <span className="font-semibold text-ink-900 tabular-nums">{total.toLocaleString("en-US")}</span> {noun}
      </div>

      {/* Center: page buttons */}
      <div className="flex items-center justify-center gap-1.5 select-none">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          aria-label="Previous page"
          className="inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-paper-sunk hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Icon name="chevronLeft" size={14} />
          <span className="hidden md:inline">PREV</span>
        </button>

        <div className="flex items-center gap-1">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span key={`dots-${idx}`} className="flex h-8 w-6 items-center justify-center text-xs font-medium text-mute">
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                aria-current={safePage === p ? "page" : undefined}
                className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold tabular-nums transition-colors ${
                  safePage === p
                    ? "bg-slate-900 text-white dark:bg-[#242424] dark:text-[#FAFAFA] dark:ring-1 dark:ring-[#363636]"
                    : "text-ink-700 hover:bg-[rgb(var(--hover))] hover:text-ink-900"
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => onPage(Math.min(safePageCount, safePage + 1))}
          disabled={safePage >= safePageCount}
          aria-label="Next page"
          className="inline-flex min-h-[34px] items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-paper-sunk hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span className="hidden md:inline">NEXT</span>
          <Icon name="chevronRight" size={14} />
        </button>
      </div>

      {/* Right: page-size selector */}
      <div className="flex items-center justify-center gap-2 sm:justify-end">
        {onPageSize && (
          <label className="inline-flex items-center gap-2 text-xs text-mute">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
              aria-label="Rows per page"
              className="h-8 rounded-lg border border-line-strong bg-paper-raised px-2 text-xs font-semibold text-ink-900 focus:border-clay-500 focus:outline-none"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </nav>
  );
}
