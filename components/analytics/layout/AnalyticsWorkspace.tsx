"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import { ErrorState } from "@/components/ui/States";
import { useAnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import type { AnalyticsDashboardPayload } from "@/lib/analytics/dashboard-types";
import { formatDisplayDate } from "@/lib/analytics/formatters";
import ApplicantActivityChart from "@/components/analytics/charts/ApplicantActivityChart";
import CohortProgressChart from "@/components/analytics/charts/CohortProgressChart";
import CorrectionRateChart from "@/components/analytics/charts/CorrectionRateChart";
import EmbassyDistributionChart from "@/components/analytics/charts/EmbassyDistributionChart";
import HistoricalWaitChart from "@/components/analytics/charts/HistoricalWaitChart";
import ProcessingDurationChart from "@/components/analytics/charts/ProcessingDurationChart";
import QueueProgressionChart from "@/components/analytics/charts/QueueProgressionChart";
import StatusDistributionChart from "@/components/analytics/charts/StatusDistributionChart";
import UniversityRankingChart from "@/components/analytics/charts/UniversityRankingChart";
import VisaDecisionChart from "@/components/analytics/charts/VisaDecisionChart";
import WeeklyActivityChart from "@/components/analytics/charts/WeeklyActivityChart";
import EmbassyIntelligence from "@/components/analytics/intelligence/EmbassyIntelligence";
import { AnalyticsDashboardSkeleton } from "@/components/analytics/shared/AnalyticsChartSkeleton";
import AnalyticsDetailsDrawer from "@/components/analytics/shared/AnalyticsDetailsDrawer";
import AnalyticsEmptyState from "@/components/analytics/shared/AnalyticsEmptyState";
import AnalyticsKpiGrid from "@/components/analytics/summary/AnalyticsKpiGrid";
import { AnalyticsCol, AnalyticsRow } from "./AnalyticsGrid";
import AnalyticsSection from "./AnalyticsSection";
import AnalyticsToolbar from "./AnalyticsToolbar";

export default function AnalyticsWorkspace({
  fixtureData,
  fixtureLoading,
  fixtureError,
  skipPageTitle = false,
}: {
  fixtureData?: AnalyticsDashboardPayload | null;
  fixtureLoading?: boolean;
  fixtureError?: string | null;
  skipPageTitle?: boolean;
}) {
  const {
    data,
    loading,
    error,
    reload,
    filters,
    activeFilterCount,
    setPeriod,
    setConsulate,
    applyFilters,
    resetFilters,
    toggleConsulateFilter,
    toggleStatusFilter,
    toggleUniversityFilter,
    activeIntelEmbassy,
    setIntelEmbassy,
  } = useAnalyticsFilters({
    fixtureData,
    fixtureLoading,
    fixtureError,
  });

  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const isInitialLoad = loading && !data;
  const activeIntel = data ? data.intelligence.embassies[activeIntelEmbassy] : null;
  const lockedByGlobalFilter = filters.consulate === "Islamabad" || filters.consulate === "Karachi";

  return (
    <div
      data-testid="analytics-workspace"
      className="mx-auto w-full max-w-[1480px] space-y-5 pb-16 md:pb-6"
    >
      {!skipPageTitle && <PageHeader title="Analytics" />}

      <AnalyticsToolbar
        filters={filters}
        activeFilterCount={activeFilterCount}
        onPeriodChange={setPeriod}
        onConsulateChange={setConsulate}
        onApplyAll={applyFilters}
        onResetAll={resetFilters}
        universityOptions={data?.facets.universities ?? []}
        intakeOptions={data?.facets.intakes ?? []}
        asOfDate={data?.asOfDate}
        totalFiltered={data?.summary.total}
        loading={loading}
      />

      {error && !data ? (
        <div className="rounded-xl border border-line bg-card p-6">
          <ErrorState error={error} onRetry={reload} />
        </div>
      ) : isInitialLoad ? (
        <AnalyticsDashboardSkeleton />
      ) : data ? (
        <div className={`space-y-6 transition-opacity duration-150 ${loading ? "opacity-65" : ""}`}>
          {/* 1. Key Performance Indicators */}
          {data.summary.total === 0 ? (
            <AnalyticsEmptyState
              icon="filter"
              title="No approved tracker applicants match these filters"
              hint="Try widening the waiting-list join date range or clearing your active embassy, status, or university filters."
              action={
                activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="btn-primary !min-h-[34px] !px-3.5 !text-xs"
                  >
                    Reset all filters
                  </button>
                ) : undefined
              }
            />
          ) : (
            <>
              <AnalyticsKpiGrid data={data} />

              {/* 2. Applicant Activity (8) + Embassy Distribution (4) */}
              <AnalyticsRow>
                <AnalyticsCol span={8}>
                  <ApplicantActivityChart
                    monthlyByJoinDate={data.activity.monthlyByJoinDate}
                    weeklyByJoinDate={data.activity.weeklyByJoinDate}
                    monthlyByEntryDate={data.activity.monthlyByEntryDate}
                    weeklyByEntryDate={data.activity.weeklyByEntryDate}
                    activeConsulate={filters.consulate}
                  />
                </AnalyticsCol>
                <AnalyticsCol span={4}>
                  <EmbassyDistributionChart
                    rows={data.embassyDistribution}
                    total={data.summary.total}
                    activeConsulate={filters.consulate}
                    onSelectConsulate={toggleConsulateFilter}
                  />
                </AnalyticsCol>
              </AnalyticsRow>

              {/* 3. Application Status (6) + Processing Durations (6) */}
              <AnalyticsRow>
                <AnalyticsCol span={6}>
                  <StatusDistributionChart
                    rows={data.statusDistribution}
                    total={data.summary.total}
                    activeApplicants={data.summary.activeApplicants}
                    completedCases={data.summary.completedCases}
                    activeStatus={filters.visaStatus}
                    onSelectStatus={toggleStatusFilter}
                  />
                </AnalyticsCol>
                <AnalyticsCol span={6}>
                  <ProcessingDurationChart
                    stages={data.processingDurations.stages}
                    observedEndToEnd={data.processingDurations.observedEndToEnd}
                  />
                </AnalyticsCol>
              </AnalyticsRow>
            </>
          )}

          {/* 4. Embassy Intelligence */}
          {activeIntel && (
            <div className="space-y-4 border-t border-line pt-5">
              <EmbassyIntelligence
                embassy={activeIntelEmbassy}
                onEmbassyChange={setIntelEmbassy}
                report={activeIntel}
                modelVersion={data.intelligence.modelVersion}
                datasetSummary={data.intelligence.datasetSummary}
                lockedByGlobalFilter={lockedByGlobalFilter}
              />

              {/* 5. Queue Progression History (12) */}
              <AnalyticsRow>
                <AnalyticsCol span={12}>
                  <QueueProgressionChart
                    embassy={activeIntelEmbassy}
                    data={activeIntel.progressionPoints}
                    asOfDate={data.asOfDate}
                  />
                </AnalyticsCol>
              </AnalyticsRow>

              {/* 6. Cohort Progress (12) */}
              <AnalyticsRow>
                <AnalyticsCol span={12}>
                  <CohortProgressChart
                    embassy={activeIntelEmbassy}
                    data={activeIntel.cohortProgress}
                  />
                </AnalyticsCol>
              </AnalyticsRow>

              {/* 7. Historical Waiting Times (8) + Corrections (4) */}
              <AnalyticsRow>
                <AnalyticsCol span={8}>
                  <HistoricalWaitChart
                    embassy={activeIntelEmbassy}
                    data={activeIntel.waitByInviteMonth}
                    asOfDate={data.asOfDate}
                  />
                </AnalyticsCol>
                <AnalyticsCol span={4}>
                  <CorrectionRateChart
                    embassy={activeIntelEmbassy}
                    corrections={activeIntel.durations.corrections}
                  />
                </AnalyticsCol>
              </AnalyticsRow>

              {/* 8. Weekly Activity (6) + Visa Decision Outcomes (6) */}
              <AnalyticsRow>
                <AnalyticsCol span={6}>
                  <WeeklyActivityChart
                    embassy={activeIntelEmbassy}
                    data={activeIntel.weeklyActivity}
                    asOfDate={data.asOfDate}
                  />
                </AnalyticsCol>
                <AnalyticsCol span={6}>
                  <VisaDecisionChart
                    internal={data.internalDecisions}
                    externalEmbassy={activeIntelEmbassy}
                    externalComparison={activeIntel.decisionComparison}
                  />
                </AnalyticsCol>
              </AnalyticsRow>
            </div>
          )}

          {/* 9. University & Programme Distribution */}
          {data.summary.total > 0 && (
            <AnalyticsSection
              title="Universities & programmes"
              description="Normalized institution aggregation across filtered tracker applicants"
              className="border-t border-line pt-5"
            >
              <UniversityRankingChart
                universities={data.universities.items}
                totalWithUniversity={data.universities.totalWithUniversity}
                uniqueNormalizedCount={data.universities.uniqueNormalizedCount}
                programmes={data.programmes.items}
                totalWithProgramme={data.programmes.totalWithProgramme}
                activeUniversityKey={filters.university}
                onSelectUniversity={toggleUniversityFilter}
              />
            </AnalyticsSection>
          )}

          {/* 10. Advanced Methodology & Evidence Disclosure */}
          <footer
            data-testid="analytics-methodology-footer"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper-sunk/60 px-4 py-3 text-[12px] text-mute"
          >
            <div className="min-w-0 space-y-0.5">
              <p className="font-medium text-ink-800">
                Data governance &amp; forecasting methodology
              </p>
              <p className="text-[11px] leading-snug">
                Community-reported tracker and historical timelines ({data.intelligence.datasetSummary.combinedDeduplicatedCount.toLocaleString("en-US")} deduplicated journeys). Not official German Embassy guidance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMethodologyOpen(true)}
              className="btn-secondary !min-h-[32px] shrink-0 !px-3 !text-[12px]"
            >
              <Icon name="info" size={13} className="text-mute" />
              <span>Methodology &amp; sources</span>
            </button>
          </footer>

          <AnalyticsDetailsDrawer
            open={methodologyOpen}
            onClose={() => setMethodologyOpen(false)}
            title="Analytics methodology & data sources"
            subtitle={`As of ${formatDisplayDate(data.asOfDate)} · Forecasting model ${data.intelligence.modelVersion}`}
          >
            <div className="space-y-3 text-[12px] leading-relaxed text-ink-700">
              <div className="rounded-lg border border-line bg-paper-sunk p-3">
                <p className="font-semibold text-ink-900">Evidence populations</p>
                <ul className="mt-1.5 space-y-1 text-mute">
                  <li>
                    • Approved internal applicants:{" "}
                    <strong className="text-ink-900">
                      {data.intelligence.datasetSummary.internalApprovedCount.toLocaleString("en-US")}
                    </strong>
                  </li>
                  <li>
                    • Verified external historical timelines:{" "}
                    <strong className="text-ink-900">
                      {data.intelligence.datasetSummary.externalTimelineCount.toLocaleString("en-US")}
                    </strong>
                  </li>
                  <li>
                    • Combined deduplicated journeys:{" "}
                    <strong className="text-ink-900">
                      {data.intelligence.datasetSummary.combinedDeduplicatedCount.toLocaleString("en-US")}
                    </strong>
                  </li>
                  <li>
                    • Structured queue checkpoints:{" "}
                    <strong className="text-ink-900">
                      {data.intelligence.datasetSummary.queueObservationsCount.toLocaleString("en-US")}
                    </strong>
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border border-line bg-paper-sunk p-3">
                <p className="font-semibold text-ink-900">Statistical safeguards</p>
                <p className="mt-1 text-mute">
                  Durations use medians and interquartile ranges (P25–P75) rather than arithmetic means; Kaplan–Meier survival analysis accounts for right-censored applicants still waiting in the queue; internal visa outcomes are strictly separated from external community decision reports; and queue velocity uses pairwise Theil–Sen slopes across 7d/14d/30d/60d/90d lookback windows.
                </p>
              </div>
            </div>
          </AnalyticsDetailsDrawer>
        </div>
      ) : null}
    </div>
  );
}
