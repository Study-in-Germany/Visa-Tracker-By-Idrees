"use client";

import { forwardRef } from "react";
import Icon from "@/components/ui/Icon";

/**
 * Valley Tickets-inspired header Filters button for desktop and compact mobile header trigger.
 */
export const TrackerDesktopFilterTrigger = forwardRef<
  HTMLButtonElement,
  {
    activeCount: number;
    open: boolean;
    onClick: () => void;
  }
>(function TrackerDesktopFilterTrigger({ activeCount, open, onClick }, ref) {
  const active = activeCount > 0;
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-controls="tracker-filter-drawer"
      aria-label={active ? `Filters, ${activeCount} active` : "Filters"}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-[#FAFAFA] dark:bg-[#FAFAFA] dark:text-[#0A0A0A] dark:hover:bg-[#E5E5E5]"
          : open
            ? "border-line-strong bg-[rgb(var(--hover))] text-ink-900"
            : "border-line-strong bg-paper-raised text-ink-800 hover:bg-[rgb(var(--hover))] hover:text-ink-900"
      }`}
    >
      <Icon name="slidersHorizontal" size={14} />
      <span>Filters</span>
      {active && (
        <span
          className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded px-1 text-[10px] font-bold tabular-nums ${
            active
              ? "bg-white/20 text-white dark:bg-black/15 dark:text-[#0A0A0A]"
              : ""
          }`}
        >
          {activeCount}
        </span>
      )}
    </button>
  );
});

export const TrackerMobileFilterTrigger = forwardRef<
  HTMLButtonElement,
  {
    activeCount: number;
    open: boolean;
    onClick: () => void;
  }
>(function TrackerMobileFilterTrigger({ activeCount, open, onClick }, ref) {
  const active = activeCount > 0;
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={active ? `Filters, ${activeCount} active` : "Open filters"}
      className={`relative inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white dark:border-[#FAFAFA] dark:bg-[#FAFAFA] dark:text-[#0A0A0A]"
          : "border-transparent text-ink-800 hover:bg-[rgb(var(--hover))]"
      }`}
    >
      <Icon name="slidersHorizontal" size={18} />
      {active && <span className="tabular-nums">{activeCount}</span>}
    </button>
  );
});
