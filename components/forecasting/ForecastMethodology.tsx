"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import type { PersonalForecastResult } from "@/lib/forecasting/types";

export default function ForecastMethodology({ forecast }: { forecast: PersonalForecastResult }) {
  const [open, setOpen] = useState(false);
  const m = forecast.methodologySummary;

  return (
    <div className="rounded-xl border border-line bg-paper-sunk">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-xs font-semibold text-ink-800 hover:bg-[rgb(var(--hover))]"
      >
        <span className="flex items-center gap-2">
          <Icon name="info" size={14} className="text-mute" />
          Model methodology, sample sizes &amp; limitations ({forecast.modelVersion})
        </span>
        <Icon name={open ? "chevronUp" : "chevronDown"} size={14} className="text-mute" />
      </button>

      {open && (
        <div className="space-y-3 border-t border-line bg-card px-4 py-3 text-xs text-ink-700">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-line bg-paper-sunk p-2.5">
              <p className="text-[11px] text-mute">Simulations</p>
              <p className="font-semibold tabular-nums text-ink-900">{m.iterations.toLocaleString("en-US")} seeded MC runs</p>
            </div>
            <div className="rounded-lg border border-line bg-paper-sunk p-2.5">
              <p className="text-[11px] text-mute">Internal / External timelines</p>
              <p className="font-semibold tabular-nums text-ink-900">
                {m.internalSampleSize} internal · {m.externalTimelineSampleSize} community
              </p>
            </div>
            <div className="rounded-lg border border-line bg-paper-sunk p-2.5">
              <p className="text-[11px] text-mute">Queue observations / Eff. N</p>
              <p className="font-semibold tabular-nums text-ink-900">
                {m.queueObservationsCount} checkpoints · N<sub>eff</sub> = {m.effectiveSampleSize}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-paper-sunk p-2.5">
              <p className="text-[11px] text-mute">Ensemble blend weights</p>
              <p className="font-semibold tabular-nums text-ink-900">
                {m.queueModelWeight !== null
                  ? `${Math.round(m.queueModelWeight * 100)}% queue / ${Math.round((m.durationModelWeight ?? 0) * 100)}% history`
                  : "Historical survival distribution"}
              </p>
            </div>
          </div>

          {forecast.confidenceReasons.length > 0 && (
            <div>
              <p className="mb-1 font-semibold text-ink-900">Confidence assessment</p>
              <ul className="space-y-0.5 text-mute">
                {forecast.confidenceReasons.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-1 font-semibold text-ink-900">Disclosures &amp; limitations</p>
            <ul className="space-y-0.5 text-mute">
              {forecast.limitations.map((lim) => (
                <li key={lim}>• {lim}</li>
              ))}
              <li>• Half-life recency decay = {m.halfLifeDays} days; small-sample shrinkage K = {m.shrinkageK}.</li>
              <li>• Ranges represent model-based estimated intervals from historical observations, not official German mission guarantees.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
