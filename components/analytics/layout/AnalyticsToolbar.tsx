"use client";

import { useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { formatDisplayDate } from "@/lib/analytics/formatters";
import type { AnalyticsFilterState } from "@/lib/analytics/dashboard-types";
import { CONSULATES, VISA_STATUS_SHORT } from "@/lib/constants";
import AnalyticsDateRangeControl, { describeAnalyticsPeriod } from "./AnalyticsDateRangeControl";
import AnalyticsFilterDrawer from "./AnalyticsFilterDrawer";
import AnalyticsFilterSheet from "./AnalyticsFilterSheet";

export default function AnalyticsToolbar({
  filters,
  activeFilterCount,
  onPeriodChange,
  onConsulateChange,
  onApplyAll,
  onResetAll,
  universityOptions,
  intakeOptions,
  asOfDate,
  totalFiltered,
  loading,
}: {
  filters: AnalyticsFilterState;
  activeFilterCount: number;
  onPeriodChange: (p: { from: string; to: string }) => void;
  onConsulateChange: (c: string) => void;
  onApplyAll: (next: AnalyticsFilterState) => void;
  onResetAll: () => void;
  universityOptions: { value: string; label: string; count?: number }[];
  intakeOptions: { value: string; label: string; count?: number }[];
  asOfDate?: string;
  totalFiltered?: number;
  loading?: boolean;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const desktopBtnRef = useRef<HTMLButtonElement>(null);
  const mobileBtnRef = useRef<HTMLButtonElement>(null);

  const universityLabel = filters.university
    ? universityOptions.find((u) => u.value === filters.university)?.label ?? filters.university
    : "";

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (filters.from || filters.to) {
    activeChips.push({
      key: "period",
      label: `Joined: ${describeAnalyticsPeriod({ from: filters.from, to: filters.to })}`,
      onRemove: () => onPeriodChange({ from: "", to: "" }),
    });
  }
  if (filters.consulate) {
    activeChips.push({
      key: "consulate",
      label: `Embassy: ${filters.consulate}`,
      onRemove: () => onConsulateChange(""),
    });
  }
  if (filters.visaStatus) {
    activeChips.push({
      key: "status",
      label: `Status: ${VISA_STATUS_SHORT[filters.visaStatus] ?? filters.visaStatus}`,
      onRemove: () => onApplyAll({ ...filters, visaStatus: "" }),
    });
  }
  if (filters.university) {
    activeChips.push({
      key: "university",
      label: `University: ${universityLabel}`,
      onRemove: () => onApplyAll({ ...filters, university: "" }),
    });
  }
  if (filters.intake) {
    activeChips.push({
      key: "intake",
      label: `Intake: ${filters.intake}`,
      onRemove: () => onApplyAll({ ...filters, intake: "" }),
    });
  }

  return (
    <>
      <div
        data-testid="analytics-toolbar"
        className="rounded-xl border border-line bg-card px-3.5 py-3 sm:px-4"
      >
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-auto">
              <AnalyticsDateRangeControl
                value={{ from: filters.from, to: filters.to }}
                onChange={onPeriodChange}
              />
            </div>

            <div
              role="group"
              aria-label="Filter by embassy"
              className="inline-flex min-h-[34px] items-center rounded-lg border border-line bg-paper-sunk p-0.5 text-[12px]"
            >
              {[
                { value: "", label: "All embassies" },
                ...CONSULATES.map((c) => ({ value: c, label: c })),
              ].map((opt) => {
                const active = filters.consulate === opt.value;
                return (
                  <button
                    key={opt.value || "all"}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onConsulateChange(opt.value)}
                    className={`min-h-[28px] rounded-md px-2.5 py-1 font-medium transition-colors ${
                      active
                        ? "bg-paper-raised font-semibold text-ink-900 shadow-xs"
                        : "text-mute hover:text-ink-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <button
              ref={desktopBtnRef}
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              className="hidden min-h-[34px] items-center gap-1.5 rounded-lg border border-line-strong bg-paper-raised px-3 text-[12px] font-medium text-ink-800 transition-colors hover:bg-[rgb(var(--hover))] md:inline-flex"
            >
              <Icon name="slidersHorizontal" size={14} className="text-mute" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded bg-slate-900 px-1 text-[10px] font-semibold tabular-nums text-white dark:bg-[#FAFAFA] dark:text-[#0A0A0A]">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              ref={mobileBtnRef}
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-line-strong bg-paper-raised px-3 text-[12px] font-medium text-ink-800 transition-colors hover:bg-[rgb(var(--hover))] md:hidden"
            >
              <Icon name="slidersHorizontal" size={14} className="text-mute" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded bg-slate-900 px-1 text-[10px] font-semibold tabular-nums text-white dark:bg-[#FAFAFA] dark:text-[#0A0A0A]">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-mute">
            {typeof totalFiltered === "number" && (
              <span className="tabular-nums">
                <strong className="font-semibold text-ink-900">
                  {totalFiltered.toLocaleString("en-US")}
                </strong>{" "}
                cohort records
              </span>
            )}
            {asOfDate && (
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    loading ? "animate-pulse bg-amber-500" : "bg-emerald-500"
                  }`}
                  aria-hidden="true"
                />
                As of {formatDisplayDate(asOfDate)}
              </span>
            )}
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
            <span className="text-[11px] font-medium text-mute">Active:</span>
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove filter ${chip.label}`}
                className="inline-flex min-h-[26px] items-center gap-1 rounded-md border border-line bg-paper-sunk px-2 py-0.5 text-[11px] font-medium text-ink-800 transition-colors hover:border-line-strong hover:bg-[rgb(var(--hover))]"
              >
                <span className="max-w-[180px] truncate">{chip.label}</span>
                <Icon name="close" size={11} className="text-mute" />
              </button>
            ))}
            <button
              type="button"
              onClick={onResetAll}
              className="ml-1 text-[11px] font-semibold text-ink-700 underline-offset-2 hover:text-ink-900 hover:underline"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {isDesktop ? (
        <AnalyticsFilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          triggerRef={desktopBtnRef}
          values={filters}
          universityOptions={universityOptions}
          intakeOptions={intakeOptions}
          onApply={onApplyAll}
        />
      ) : (
        <AnalyticsFilterSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          triggerRef={mobileBtnRef}
          values={filters}
          universityOptions={universityOptions}
          intakeOptions={intakeOptions}
          onApply={onApplyAll}
        />
      )}
    </>
  );
}
