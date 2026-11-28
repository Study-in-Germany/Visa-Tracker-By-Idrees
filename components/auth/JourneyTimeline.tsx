import Icon from "@/components/ui/Icon";

const STAGES = [
  "Waiting list",
  "Submission invitation",
  "Documents submitted",
  "Appointment",
  "Decision",
] as const;

type JourneyTimelineProps = {
  /** On unauthenticated auth pages, keep stages illustrative without implying personal progress. */
  mode?: "illustrative" | "status";
  /** Zero-based index of the active stage when mode === "status". */
  currentStageIndex?: number;
  /** Render on dark brand panel vs light card surface. */
  surface?: "dark" | "light";
};

export default function JourneyTimeline({
  mode = "illustrative",
  currentStageIndex = 0,
  surface = "dark",
}: JourneyTimelineProps) {
  const isDark = surface === "dark";

  return (
    <div
      className={`mx-auto w-full max-w-sm rounded-xl border p-5 ${
        isDark
          ? "border-slate-700/80 bg-slate-800/60 text-slate-100"
          : "border-line bg-paper-raised text-ink-900"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-mute"}`}>
          {mode === "illustrative" ? "Typical visa stages" : "Application stages"}
        </p>
        {mode === "illustrative" && (
          <span className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-mute"}`}>
            5 milestones
          </span>
        )}
      </div>

      <ol className="relative space-y-3.5">
        {STAGES.map((label, idx) => {
          const isLast = idx === STAGES.length - 1;
          const isCompleted = mode === "status" && idx < currentStageIndex;
          const isCurrent = mode === "status" && idx === currentStageIndex;

          return (
            <li key={label} className="relative flex items-center gap-3.5">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-3.5 top-7 h-[calc(100%-0.25rem)] w-px -translate-x-1/2 ${
                    isCompleted
                      ? "bg-emerald-500"
                      : isDark
                        ? "bg-slate-700"
                        : "bg-line-strong"
                  }`}
                />
              )}

              <span
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isCurrent
                      ? "border-blue-500 bg-blue-600 text-white"
                      : isDark
                        ? "border-slate-600 bg-slate-800 text-slate-300"
                        : "border-line-strong bg-paper-sunk text-ink-600"
                }`}
              >
                {isCompleted ? <Icon name="check" size={12} strokeWidth={3} /> : idx + 1}
              </span>

              <span
                className={`min-w-0 flex-1 text-[13px] font-medium ${
                  isCurrent
                    ? isDark
                      ? "text-white font-semibold"
                      : "text-ink-900 font-semibold"
                    : isCompleted
                      ? isDark
                        ? "text-slate-200"
                        : "text-ink-800"
                      : isDark
                        ? "text-slate-300"
                        : "text-ink-700"
                }`}
              >
                {label}
              </span>

              {isCurrent && (
                <span className="shrink-0 rounded-md bg-blue-500/20 px-2 py-0.5 text-[11px] font-semibold text-blue-300">
                  Current stage
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
