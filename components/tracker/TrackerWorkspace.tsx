"use client";

import { useMemo, useRef, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import { useSetHeaderActions } from "@/components/PageTitle";
import StatCard from "@/components/ui/StatCard";
import { useTrackerFilters } from "@/hooks/useTrackerFilters";
import {
  TrackerDesktopFilterTrigger,
  TrackerMobileFilterTrigger,
} from "./TrackerFilterTrigger";
import TrackerFilterDrawer from "./TrackerFilterDrawer";
import TrackerFilterSheet from "./TrackerFilterSheet";
import TrackerTable from "./TrackerTable";
import MobileList from "./MobileList";

/**
 * Valley `/admin?tab=tickets`-inspired Tracker workspace:
 * - Mounts the Filters button into the main page header beside Search.
 * - Keeps the 4 KPI StatCards directly below the header (no intermediate chip/filter toolbar).
 * - Renders an edge-to-edge independently scrollable table with sticky header and
 *   pagination anchored at the absolute bottom.
 * - Opens a full-height (100dvh) modal overlay drawer on desktop and modal bottom sheet on mobile.
 */
export default function TrackerWorkspace() {
  const {
    rows,
    totalCount,
    currentPage,
    pageCount,
    pageSize,
    setPage,
    setPageSize,
    sort,
    toggleSort,
    loading,
    error,
    reload,
    stats,
    statsLoading,
    values,
    universityOptions,
    intakeOptions,
    activeFilterCount,
    hasFilters,
    applyFilters,
  } = useTrackerFilters();

  const [desktopDrawerOpen, setDesktopDrawerOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const desktopTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

  const headerActions = useMemo(
    () => ({
      desktop: (
        <TrackerDesktopFilterTrigger
          ref={desktopTriggerRef}
          activeCount={activeFilterCount}
          open={desktopDrawerOpen}
          onClick={() => setDesktopDrawerOpen((o) => !o)}
        />
      ),
      mobile: (
        <TrackerMobileFilterTrigger
          ref={mobileTriggerRef}
          activeCount={activeFilterCount}
          open={mobileSheetOpen}
          onClick={() => setMobileSheetOpen(true)}
        />
      ),
    }),
    [activeFilterCount, desktopDrawerOpen, mobileSheetOpen]
  );

  useSetHeaderActions(headerActions);

  return (
    <div className="flex flex-col md:h-full md:min-h-0 md:flex-1 md:overflow-hidden">
      <PageHeader title="My Journey" count={totalCount} />

      {/* Preserved 4 KPI Cards */}
      <section
        aria-label="Summary"
        className="shrink-0 grid grid-cols-2 gap-2.5 pb-3 md:border-b md:border-line md:bg-paper md:px-4 md:py-3 lg:grid-cols-4 lg:px-5"
      >
        <StatCard icon="users" label="Applicants" value={stats?.total} loading={statsLoading && !stats} />
        <StatCard icon="hourglass" label="In queue" value={stats?.activeApplicants} loading={statsLoading && !stats} />
        <StatCard icon="checkCircle" label="Visas issued" value={stats?.visaIssued} loading={statsLoading && !stats} />
        <StatCard icon="xcircle" label="Rejected" value={stats?.visaRejected} loading={statsLoading && !stats} />
      </section>

      {/* Desktop edge-to-edge table + pinned bottom pagination */}
      <TrackerTable
        rows={rows}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyTitle={hasFilters ? "No entries match these filters" : "No approved entries yet"}
        emptyHint={
          hasFilters
            ? "Try removing a filter or widening the date range."
            : "Entries appear here after an admin approves them."
        }
        sort={sort}
        onSort={toggleSort}
        page={currentPage}
        pageCount={pageCount}
        pageSize={pageSize}
        total={totalCount}
        onPage={setPage}
        onPageSize={setPageSize}
      />

      {/* Dedicated mobile card list */}
      <section className="md:hidden" aria-label="Applicants">
        <MobileList
          rows={rows}
          loading={loading}
          error={error?.message ?? null}
          onRetry={reload}
          emptyTitle={hasFilters ? "No entries match these filters" : "No approved entries yet"}
          emptyHint={
            hasFilters ? "Try adjusting your filters." : "Entries appear here after an admin approves them."
          }
          page={currentPage}
          pageCount={pageCount}
          total={totalCount}
          onPage={setPage}
        />
      </section>

      {/* Desktop full-height modal overlay drawer */}
      <TrackerFilterDrawer
        open={desktopDrawerOpen}
        onClose={() => setDesktopDrawerOpen(false)}
        triggerRef={desktopTriggerRef}
        values={values}
        intakeOptions={intakeOptions}
        universityOptions={universityOptions}
        statusCounts={stats?.byStatus}
        totalCount={stats?.total}
        onApply={applyFilters}
      />

      {/* Mobile modal bottom sheet */}
      <TrackerFilterSheet
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        triggerRef={mobileTriggerRef}
        values={values}
        intakeOptions={intakeOptions}
        universityOptions={universityOptions}
        statusCounts={stats?.byStatus}
        totalCount={stats?.total}
        onApply={applyFilters}
      />
    </div>
  );
}
