"use client";

import Icon from "@/components/ui/Icon";
import TrackerStatusFilters from "./TrackerStatusFilters";

/**
 * Compact tracker toolbar:
 * - Desktop: status chips on the left, compact Filters button (with active-filter count) on the right.
 * - Mobile: contextual local search + Filters trigger button + horizontal status chips strip.
 */
export default function TrackerToolbar({
  search,
  onSearchChange,
  visaStatus,
  onStatusChange,
  statusCounts,
  totalCount,
  advancedFilterCount,
  mobileFilterCount,
  filterOpen,
  onToggleDesktopFilter,
  onOpenMobileFilter,
  desktopFilterTriggerRef,
  mobileFilterTriggerRef,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  visaStatus: string;
  onStatusChange: (v: string) => void;
  statusCounts?: Record<string, number>;
  totalCount?: number;
  advancedFilterCount: number;
  mobileFilterCount: number;
  filterOpen: boolean;
  onToggleDesktopFilter: () => void;
  onOpenMobileFilter: () => void;
  desktopFilterTriggerRef?: React.RefObject<HTMLButtonElement>;
  mobileFilterTriggerRef?: React.RefObject<HTMLButtonElement>;
}) {
  return (
    <div className="mb-2.5 space-y-2">
      {/* Mobile search + filter sheet trigger */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="relative flex-1">
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute"
          />
          <input
            type="search"
            enterKeyHint="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter ID, university, embassy…"
            aria-label="Filter My Journey entries"
            className="h-11 w-full rounded-xl border border-line-strong bg-paper-raised pl-9 pr-8 text-[14px] text-ink-900 placeholder:text-mute focus:border-neutral-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear filter search"
              className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-mute"
            >
              <Icon name="close" size={15} />
            </button>
          )}
        </div>
        <button
          ref={mobileFilterTriggerRef}
          type="button"
          onClick={onOpenMobileFilter}
          aria-label={mobileFilterCount > 0 ? `Filters, ${mobileFilterCount} active` : "Open filters"}
          className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
            mobileFilterCount > 0
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950"
              : "border-line-strong bg-paper-raised text-ink-800 hover:bg-[rgb(var(--hover))]"
          }`}
        >
          <Icon name="slidersHorizontal" size={15} />
          <span>{mobileFilterCount > 0 ? `Filters · ${mobileFilterCount}` : "Filters"}</span>
        </button>
      </div>

      {/* Mobile horizontal status chips */}
      <div className="md:hidden">
        <TrackerStatusFilters
          value={visaStatus}
          onChange={onStatusChange}
          counts={statusCounts}
          total={totalCount}
        />
      </div>

      {/* Desktop single-row status chips + right-aligned compact Filters button */}
      <div className="hidden items-center justify-between gap-2.5 md:flex">
        <div className="min-w-0 flex-1">
          <TrackerStatusFilters
            value={visaStatus}
            onChange={onStatusChange}
            counts={statusCounts}
            total={totalCount}
          />
        </div>
        <button
          ref={desktopFilterTriggerRef}
          type="button"
          onClick={onToggleDesktopFilter}
          aria-expanded={filterOpen}
          aria-controls="tracker-filter-panel"
          className={`inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 ${
            filterOpen || advancedFilterCount > 0
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950"
              : "border-line-strong bg-paper-raised text-ink-800 hover:bg-[rgb(var(--hover))]"
          }`}
        >
          <Icon name="slidersHorizontal" size={14} />
          <span className="tabular-nums">
            {advancedFilterCount > 0 ? `Filters · ${advancedFilterCount}` : "Filters"}
          </span>
        </button>
      </div>
    </div>
  );
}
