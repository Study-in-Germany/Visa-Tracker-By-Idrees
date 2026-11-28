import Icon from "@/components/ui/Icon";
import ConfidenceIndicator from "./ConfidenceIndicator";
import { fmtDate } from "@/lib/format";
import type { EmbassyIntelligenceReport } from "@/lib/forecasting/forecast-service";

function FrontierMetric({
  label,
  internalCohort,
  combinedDate,
  rangeStart,
  rangeEnd,
  sourceNote,
}: {
  label: string;
  internalCohort: string | null;
  combinedDate: string | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  sourceNote: string;
}) {
  const showBoth = Boolean(internalCohort && combinedDate && internalCohort !== combinedDate);
  return (
    <div className="rounded-lg border border-line bg-paper-sunk p-3">
      <p className="text-[11px] font-medium text-mute">{label}</p>
      {combinedDate ? (
        <>
          <p className="mt-1 text-base font-bold tabular-nums text-ink-900">{fmtDate(combinedDate)}</p>
          {showBoth ? (
            <p className="mt-0.5 text-[11px] text-ink-700">
              Our recorded cohort: <strong className="tabular-nums">{fmtDate(internalCohort!)}</strong>
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-mute">{sourceNote}</p>
          )}
          {rangeStart && rangeEnd && rangeStart !== rangeEnd && (
            <p className="mt-0.5 text-[11px] tabular-nums text-mute">
              Observed span: {fmtDate(rangeStart)} – {fmtDate(rangeEnd)}
            </p>
          )}
        </>
      ) : (
        <p className="mt-1 text-sm font-semibold text-mute">Unavailable</p>
      )}
    </div>
  );
}

export default function QueueFrontier({ report }: { report: EmbassyIntelligenceReport }) {
  const sub = report.frontiers.submission;
  const apptSub = report.frontiers.appointmentBySubmission;
  const apptWl = report.frontiers.appointmentByWaitingList;
  const v = report.velocity;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper-sunk/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold tracking-tight text-ink-900">
            German {report.embassy === "Islamabad" ? "Embassy Islamabad" : "Consulate General Karachi"}
          </h3>
          <ConfidenceIndicator level={sub.confidence} compact />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-mute">
          <span>{sub.sampleSize} recent obs.</span>
          {sub.lastUpdatedDate && <span>Last updated: {fmtDate(sub.lastUpdatedDate)}</span>}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid gap-2.5 sm:grid-cols-3">
          <FrontierMetric
            label="Waiting-list cohorts getting submission invites"
            internalCohort={sub.internalLatestCohort}
            combinedDate={sub.combinedFrontierDate}
            rangeStart={sub.observedRangeStart}
            rangeEnd={sub.observedRangeEnd}
            sourceNote={sub.sourceClassification}
          />
          <FrontierMetric
            label="Document submission dates getting appointments"
            internalCohort={apptSub.internalLatestCohort}
            combinedDate={apptSub.combinedFrontierDate}
            rangeStart={apptSub.observedRangeStart}
            rangeEnd={apptSub.observedRangeEnd}
            sourceNote={apptSub.sourceClassification}
          />
          <FrontierMetric
            label="Waiting-list cohorts reaching appointments"
            internalCohort={apptWl.internalLatestCohort}
            combinedDate={apptWl.combinedFrontierDate}
            rangeStart={apptWl.observedRangeStart}
            rangeEnd={apptWl.observedRangeEnd}
            sourceNote={apptWl.sourceClassification}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-ink-900">
              Weekly movement:{" "}
              {v.weightedWeeklyDays !== null ? `~${v.weightedWeeklyDays} joining-days / wk` : "Unavailable"}
            </span>
            {v.windows
              .filter((w) => [7, 30, 90].includes(w.windowDays) && w.weeklyRateDays !== null)
              .map((w) => (
                <span key={w.windowDays} className="tabular-nums text-mute">
                  {w.windowDays}d: {w.weeklyRateDays}d/wk
                </span>
              ))}
          </div>
          <span className="text-[11px] text-mute">{sub.sourceClassification}</span>
        </div>

        {sub.hasConflict && sub.conflictSummary && (
          <p className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            <Icon name="alert" size={13} className="shrink-0" />
            {sub.conflictSummary}
          </p>
        )}
      </div>
    </div>
  );
}
