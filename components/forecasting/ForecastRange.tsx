import { fmtDate } from "@/lib/format";
import type { StageForecast } from "@/lib/forecasting/types";

export default function ForecastRange({ stage }: { stage: StageForecast }) {
  if (stage.status === "completed" && stage.actualDate) {
    return (
      <div className="space-y-0.5">
        <p className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
          {fmtDate(stage.actualDate)}
        </p>
        <p className="text-[11px] text-mute">Actual recorded</p>
      </div>
    );
  }

  if (stage.status === "unavailable" || !stage.p50Date) {
    return (
      <div className="space-y-0.5">
        <p className="text-xs font-semibold text-mute">Unavailable</p>
        {stage.note && <p className="text-[11px] leading-snug text-mute">{stage.note}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-mute">Best estimate (P50)</p>
        <p className="text-xs font-semibold tabular-nums text-ink-900">{fmtDate(stage.p50Date)}</p>
      </div>
      {stage.p25Date && stage.p75Date && (
        <p className="text-[11px] tabular-nums text-ink-700">
          Central: {fmtDate(stage.p25Date)} – {fmtDate(stage.p75Date)}
        </p>
      )}
      {stage.p10Date && stage.p90Date && (
        <p className="text-[11px] tabular-nums text-mute">
          Wider (P10–P90): {fmtDate(stage.p10Date)} – {fmtDate(stage.p90Date)}
        </p>
      )}
      {stage.sampleSize > 0 && (
        <p className="text-[11px] text-mute">n = {stage.sampleSize} obs.</p>
      )}
    </div>
  );
}
