"use client";

import { useMemo, useState } from "react";
import AnalyticsCard from "@/components/analytics/layout/AnalyticsCard";
import AnalyticsDataTable from "@/components/analytics/shared/AnalyticsDataTable";
import AnalyticsDetailsDrawer from "@/components/analytics/shared/AnalyticsDetailsDrawer";
import AnalyticsEmptyState from "@/components/analytics/shared/AnalyticsEmptyState";
import { useAnalyticsChartPalette } from "@/components/analytics/shared/useAnalyticsChartPalette";
import { formatSharePct } from "@/lib/analytics/chart-formatters";
import type {
  NormalizedProgrammeEntry,
  NormalizedUniversityEntry,
} from "@/lib/analytics/university-normalizer";

export default function UniversityRankingChart({
  universities,
  totalWithUniversity,
  uniqueNormalizedCount,
  programmes,
  totalWithProgramme,
  activeUniversityKey,
  onSelectUniversity,
}: {
  universities: NormalizedUniversityEntry[];
  totalWithUniversity: number;
  uniqueNormalizedCount: number;
  programmes: NormalizedProgrammeEntry[];
  totalWithProgramme: number;
  activeUniversityKey: string;
  onSelectUniversity: (key: string) => void;
}) {
  const palette = useAnalyticsChartPalette();
  const [tab, setTab] = useState<"universities" | "programmes">("universities");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const topUniversities = useMemo(() => universities.slice(0, 6), [universities]);
  const topProgrammes = useMemo(() => programmes.slice(0, 6), [programmes]);

  const maxUniCount = Math.max(1, ...(topUniversities.map((u) => u.count)));
  const maxProgCount = Math.max(1, ...(topProgrammes.map((p) => p.count)));

  const filteredDrawerRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (tab === "universities") {
      return q
        ? universities.filter(
            (u) =>
              u.displayName.toLowerCase().includes(q) ||
              u.rawVariants.some((v) => v.label.toLowerCase().includes(q))
          )
        : universities;
    }
    return q
      ? programmes.filter((p) => p.displayName.toLowerCase().includes(q))
      : programmes;
  }, [tab, search, universities, programmes]);

  const activeItems = tab === "universities" ? topUniversities : topProgrammes;
  const totalDenominator = tab === "universities" ? totalWithUniversity : totalWithProgramme;
  const maxCount = tab === "universities" ? maxUniCount : maxProgCount;

  return (
    <>
      <AnalyticsCard
        testId="chart-university-ranking"
        title={tab === "universities" ? "Top universities" : "Top programmes"}
        subtitle={
          tab === "universities"
            ? `Normalized across ${uniqueNormalizedCount} institutions (click a bar to filter)`
            : `Reported study programmes (${totalWithProgramme.toLocaleString("en-US")} entries)`
        }
        onViewDataClick={() => setDrawerOpen(true)}
        viewDataLabel={
          tab === "universities"
            ? `View all (${universities.length})`
            : `View all (${programmes.length})`
        }
        controls={
          <div
            role="group"
            aria-label="Institution or programme ranking"
            className="inline-flex rounded-lg border border-line bg-paper-sunk p-0.5 text-[11px]"
          >
            {[
              { id: "universities" as const, label: "Universities" },
              { id: "programmes" as const, label: "Programmes" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={tab === opt.id}
                onClick={() => setTab(opt.id)}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  tab === opt.id
                    ? "bg-paper-raised font-semibold text-ink-900 shadow-xs"
                    : "text-mute hover:text-ink-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
        footer={
          <span>
            {tab === "universities"
              ? `Displays top ${topUniversities.length} of ${uniqueNormalizedCount} normalized institutions on a shared count scale. Original applicant text is never overwritten.`
              : `Displays top ${topProgrammes.length} of ${programmes.length} programme entries on a shared count scale.`}
          </span>
        }
      >
        {activeItems.length === 0 ? (
          <AnalyticsEmptyState
            icon="school"
            title={`No ${tab} recorded`}
            hint="No records in the current filter include this field."
            compact
          />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-x-6 md:gap-y-3">
            {activeItems.map((item, idx) => {
              const barPct = Math.max(4, Math.round((item.count / maxCount) * 100));
              const isUni = tab === "universities";
              const isSelected = isUni && activeUniversityKey === item.key;
              const mergedCount = item.rawVariants.length;

              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={!isUni}
                  onClick={() => isUni && onSelectUniversity(item.key)}
                  aria-pressed={isUni ? isSelected : undefined}
                  className={`flex min-w-0 flex-col gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    isUni ? "cursor-pointer hover:bg-[rgb(var(--hover))]" : "cursor-default"
                  } ${isSelected ? "bg-paper-sunk ring-1 ring-line-strong" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="w-4 shrink-0 text-[11px] font-semibold tabular-nums text-mute">
                        {idx + 1}.
                      </span>
                      <span className="truncate text-[13px] font-medium text-ink-900" title={item.displayName}>
                        {item.displayName}
                      </span>
                      {mergedCount > 1 && (
                        <span className="hidden shrink-0 text-[10px] text-mute sm:inline">
                          ({mergedCount} variants)
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      <span className="text-[12px] font-semibold text-ink-900">
                        {item.count}
                      </span>
                      <span className="w-10 text-right text-[11px] text-mute">
                        {formatSharePct(item.count, totalDenominator)}
                      </span>
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-paper-sunk">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor: isSelected
                          ? palette.tertiarySeries
                          : idx === 0
                            ? palette.primarySeries
                            : palette.secondarySeries,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </AnalyticsCard>

      <AnalyticsDetailsDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSearch("");
        }}
        title={tab === "universities" ? "All universities (normalized)" : "All programmes"}
        subtitle={
          tab === "universities"
            ? "Spelling variants and trailing spaces are grouped for aggregation only; applicant records remain untouched."
            : "Reported programme names across filtered approved applicants."
        }
      >
        <div className="space-y-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${tab}…`}
            aria-label={`Search ${tab}`}
            className="input"
          />
          <AnalyticsDataTable
            caption={`Full ${tab} ranking`}
            rows={filteredDrawerRows}
            rowKey={(r) => r.key}
            columns={[
              {
                key: "name",
                label: tab === "universities" ? "Normalized institution" : "Programme",
                render: (r) => (
                  <div>
                    <div className="font-medium text-ink-900">{r.displayName}</div>
                    {r.rawVariants.length > 1 && (
                      <div className="mt-0.5 text-[11px] text-mute">
                        Merged:{" "}
                        {r.rawVariants
                          .map((v) => `${v.label.trim()} (${v.count})`)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                ),
              },
              { key: "count", label: "Applicants", align: "right", render: (r) => r.count },
              {
                key: "share",
                label: "Share",
                align: "right",
                render: (r) => formatSharePct(r.count, totalDenominator),
              },
            ]}
          />
        </div>
      </AnalyticsDetailsDrawer>
    </>
  );
}
