"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import {
  formatConfidenceLabel,
  formatDisplayDate,
  formatWeeklyDays,
} from "@/lib/analytics/formatters";
import type { CorrectionHistoryItem } from "@/lib/analytics/types";
import type { PersonalForecastResult } from "@/lib/forecasting/types";

export default function ForecastDetailsDrawer({
  forecast,
  correctionEvents = [],
}: {
  forecast: PersonalForecastResult;
  correctionEvents?: CorrectionHistoryItem[];
}) {
  const [open, setOpen] = useState(false);
  const m = forecast.methodologySummary;
  const pendingStages = forecast.stages.filter((s) => s.status !== "completed");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[36px] items-center text-[13px] font-medium text-ink-600 transition-colors hover:text-ink-900"
      >
        Forecast details
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Forecast details & methodology"
        size="lg"
        variant="drawer"
      >
        <div className="space-y-4 text-xs text-ink-700">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-line bg-paper-sunk p-2.5">
              <p className="text-[11px] text-mute">Confidence</p>
              <p className="font-semibold text-ink-900">
                {formatConfidenceLabel(forecast.confidence)}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-paper-sunk p-2.5">
              <p className="text-[11px] text-mute">Last calculated</p>
              <p className="font-semibold tabular-nums text-ink-900">
                {formatDisplayDate(forecast.asOfDate)}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-paper-sunk p-2.5">
              <p className="text-[11px] text-mute">
                Queue frontier ({forecast.embassy})
              </p>
              <p className="font-semibold tabular-nums text-ink-900">
                {forecast.currentSubmissionFrontier
                  ? formatDisplayDate(forecast.currentSubmissionFrontier)
                  : "Unavailable"}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-paper-sunk p-2.5">
              <p className="text-[11px] text-mute">Weekly queue movement</p>
              <p className="font-semibold tabular-nums text-ink-900">
                {formatWeeklyDays(forecast.weeklyVelocityDays) ?? "Unavailable"}
              </p>
            </div>
          </div>

          {/* Confidence reasons */}
          {forecast.confidenceReasons.length > 0 && (
            <div>
              <p className="mb-1.5 font-semibold text-ink-900">Confidence assessment</p>
              <ul className="space-y-1 text-mute">
                {forecast.confidenceReasons.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Correction history */}
          {correctionEvents.length > 0 && (
            <div>
              <p className="mb-1.5 font-semibold text-ink-900">
                Recorded correction history ({correctionEvents.length})
              </p>
              <ul className="space-y-1 rounded-lg border border-line bg-paper-sunk p-2.5 text-ink-700">
                {correctionEvents.map((ev, idx) => (
                  <li key={`${ev.type}-${ev.date}-${idx}`} className="flex items-center justify-between gap-2">
                    <span className="capitalize">
                      Correction {ev.type}
                      {ev.note ? ` · ${ev.note}` : ""}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatDisplayDate(ev.date)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Stage quantile breakdown */}
          <div>
            <p className="mb-1.5 font-semibold text-ink-900">Stage prediction quantiles</p>
            <div className="space-y-2">
              {forecast.stages.map((st) => (
                <div key={st.stage} className="rounded-lg border border-line p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink-900">{st.label}</span>
                    <span className="text-[11px] tabular-nums text-mute">
                      {st.status === "completed"
                        ? "Completed"
                        : st.sampleSize > 0
                          ? `n = ${st.sampleSize} (eff. ${st.effectiveSampleSize})`
                          : "No sample"}
                    </span>
                  </div>
                  {st.status === "completed" && st.actualDate ? (
                    <p className="mt-1 tabular-nums text-emerald-700 dark:text-emerald-400">
                      Actual date: {formatDisplayDate(st.actualDate)}
                    </p>
                  ) : st.p50Date ? (
                    <div className="mt-1 space-y-0.5 text-[11px] tabular-nums text-mute">
                      <p className="text-ink-900">
                        Median (P50): {formatDisplayDate(st.p50Date)}
                      </p>
                      {st.p25Date && st.p75Date && (
                        <p>
                          Central interval (P25–P75): {formatDisplayDate(st.p25Date)} –{" "}
                          {formatDisplayDate(st.p75Date)}
                        </p>
                      )}
                      {st.p10Date && st.p90Date && (
                        <p>
                          Wider interval (P10–P90): {formatDisplayDate(st.p10Date)} –{" "}
                          {formatDisplayDate(st.p90Date)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-mute">
                      {st.note || "Not enough data to estimate."}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Velocity sensitivity */}
          {forecast.speedSensitivity.length > 0 && (
            <div>
              <p className="mb-1.5 font-semibold text-ink-900">
                Submission pace sensitivity
              </p>
              <div className="grid grid-cols-3 gap-2">
                {forecast.speedSensitivity.map((sp) => (
                  <div
                    key={sp.windowDays}
                    className="rounded-lg border border-line bg-paper-sunk p-2"
                  >
                    <div className="text-[11px] text-mute">{sp.windowDays}-day pace</div>
                    <div className="mt-0.5 font-semibold tabular-nums text-ink-900">
                      {sp.estimatedSubmissionInviteDate
                        ? formatDisplayDate(sp.estimatedSubmissionInviteDate)
                        : "Unavailable"}
                    </div>
                    <div className="text-[10px] text-mute">
                      {sp.weeklyVelocityDays !== null
                        ? `${sp.weeklyVelocityDays}d/wk`
                        : "No span"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence & model parameters */}
          {pendingStages.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-line bg-paper-sunk p-3">
              <p className="font-semibold text-ink-900">
                Evidence &amp; model methodology ({forecast.modelVersion})
              </p>
              <p className="text-mute">
                {m.iterations.toLocaleString("en-US")} seeded Monte Carlo runs blended with Kaplan–Meier survival estimates.
              </p>
              <p className="tabular-nums text-mute">
                Internal records: {m.internalSampleSize} · External timelines:{" "}
                {m.externalTimelineSampleSize} · Queue checkpoints:{" "}
                {m.queueObservationsCount} · Eff. N = {m.effectiveSampleSize}
              </p>
              <p className="tabular-nums text-mute">
                Blend weights:{" "}
                {m.queueModelWeight !== null
                  ? `${Math.round(m.queueModelWeight * 100)}% queue frontier / ${Math.round(
                      (m.durationModelWeight ?? 0) * 100
                    )}% historical wait`
                  : "Historical survival distribution"}
                {" · "}Recency half-life {m.halfLifeDays}d · Shrinkage K = {m.shrinkageK}
              </p>
            </div>
          )}

          {/* Limitations */}
          <div>
            <p className="mb-1 font-semibold text-ink-900">Known limitations</p>
            <ul className="space-y-1 text-mute">
              {forecast.limitations.map((lim) => (
                <li key={lim}>• {lim}</li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
}
