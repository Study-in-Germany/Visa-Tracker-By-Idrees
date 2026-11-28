"use client";

import { useState } from "react";
import Link from "next/link";
import AnalyticsSection from "@/components/analytics/layout/AnalyticsSection";
import Icon from "@/components/ui/Icon";
import { formatConfidenceLabel, formatDisplayDate } from "@/lib/analytics/formatters";
import type { AnalyticsEmbassyIntelligence } from "@/lib/analytics/dashboard-types";
import type { Embassy } from "@/lib/forecasting/types";
import EmbassyEvidenceDetails from "./EmbassyEvidenceDetails";
import EmbassyFrontierMetrics from "./EmbassyFrontierMetrics";

export default function EmbassyIntelligence({
  embassy,
  onEmbassyChange,
  report,
  modelVersion,
  datasetSummary,
  lockedByGlobalFilter,
}: {
  embassy: Embassy;
  onEmbassyChange: (emb: Embassy) => void;
  report: AnalyticsEmbassyIntelligence;
  modelVersion: string;
  datasetSummary: {
    internalApprovedCount: number;
    externalTimelineCount: number;
    combinedDeduplicatedCount: number;
    queueObservationsCount: number;
  };
  lockedByGlobalFilter: boolean;
}) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const sub = report.frontiers.submission;
  const confLabel = formatConfidenceLabel(sub.confidence);

  return (
    <>
      <AnalyticsSection
        testId="section-embassy-intelligence"
        title="Embassy intelligence"
        description={`Community & internal cohort frontier for German ${
          embassy === "Islamabad" ? "Embassy Islamabad" : "Consulate General Karachi"
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Latest evidence & confidence */}
            <div className="flex items-center gap-2 rounded-lg border border-line bg-paper-sunk px-2.5 py-1 text-[12px] text-ink-700">
              <span>
                Confidence:{" "}
                <strong className="font-semibold text-ink-900">{confLabel}</strong>
              </span>
              {sub.lastUpdatedDate && (
                <>
                  <span className="text-line-strong" aria-hidden="true">
                    ·
                  </span>
                  <span className="tabular-nums text-mute">
                    Evidence {formatDisplayDate(sub.lastUpdatedDate)}
                  </span>
                </>
              )}
            </div>

            {/* Islamabad / Karachi Segmented Selector */}
            <div
              role="group"
              aria-label="Select embassy intelligence view"
              className="inline-flex min-h-[34px] items-center rounded-lg border border-line bg-paper-sunk p-0.5 text-[12px]"
            >
              {(["Islamabad", "Karachi"] as const).map((emb) => {
                const active = embassy === emb;
                return (
                  <button
                    key={emb}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onEmbassyChange(emb)}
                    className={`min-h-[28px] rounded-md px-3 py-1 font-medium transition-colors ${
                      active
                        ? "bg-paper-raised font-semibold text-ink-900 shadow-xs"
                        : "text-mute hover:text-ink-900"
                    }`}
                  >
                    {emb}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setEvidenceOpen(true)}
              className="btn-secondary !min-h-[34px] !px-3 !text-[12px]"
            >
              <Icon name="info" size={14} className="text-mute" />
              <span>Evidence details</span>
            </button>

            <Link
              href="/calculator"
              className="btn-primary !min-h-[34px] !px-3 !text-[12px]"
            >
              <Icon name="calculator" size={14} />
              <span>Timeline calculator</span>
            </Link>
          </div>
        }
      >
        {lockedByGlobalFilter && (
          <p className="text-[11px] text-mute">
            Synced with global embassy filter ({embassy}). Switch selector above or clear global filter to compare missions.
          </p>
        )}

        <EmbassyFrontierMetrics
          report={report}
          onOpenEvidence={() => setEvidenceOpen(true)}
        />
      </AnalyticsSection>

      <EmbassyEvidenceDetails
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        report={report}
        modelVersion={modelVersion}
        datasetSummary={datasetSummary}
      />
    </>
  );
}
