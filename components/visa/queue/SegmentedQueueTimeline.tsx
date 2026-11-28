import type { MonthlyTimelineMonth } from "@/lib/analytics/types";
import MonthSegment from "./MonthSegment";

export default function SegmentedQueueTimeline({
  embassy,
  months,
  activeMonthIndex,
  activeMonthFillRatio,
  overallRatio,
  markerShortDate,
  frontierDisplayDate,
}: {
  embassy: string;
  months: MonthlyTimelineMonth[];
  activeMonthIndex: number;
  activeMonthFillRatio: number;
  overallRatio: number;
  markerShortDate: string;
  frontierDisplayDate: string;
}) {
  const firstLabel = months[0]?.label ?? "";
  const lastLabel = months[months.length - 1]?.label ?? "";
  const reduceDensity = months.length > 6;

  return (
    <div
      data-testid={`segmented-queue-timeline-${embassy.toLowerCase()}`}
      className="pt-[42px] sm:pt-[48px]"
      role="img"
      aria-label={`${embassy} queue timeline from ${firstLabel} to ${lastLabel}: cohorts reached through ${frontierDisplayDate}`}
    >
      <div
        className="grid gap-[3px] sm:gap-[5px]"
        style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
      >
        {months.map((m, idx) => (
          <MonthSegment
            key={m.key}
            embassy={embassy}
            month={m}
            isActive={idx === activeMonthIndex}
            activeFillRatio={activeMonthFillRatio}
            overallRatio={overallRatio}
            markerShortDate={markerShortDate}
          />
        ))}
      </div>

      <div
        className="mt-2 grid gap-[3px] sm:gap-[5px]"
        style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
        aria-hidden="true"
      >
        {months.map((m, idx) => {
          let visibilityCls = "block";
          if (reduceDensity) {
            const showStdMobile = idx % 2 === 0;
            const showTinyMobile = idx % 3 === 0;
            if (showTinyMobile) {
              visibilityCls = showStdMobile ? "block" : "block min-[380px]:hidden md:block";
            } else if (showStdMobile) {
              visibilityCls = "hidden min-[380px]:block";
            } else {
              visibilityCls = "hidden md:block";
            }
          }

          return (
            <div
              key={m.key}
              className={`min-w-0 ${idx === 0 ? "flex justify-start sm:justify-center" : "flex justify-center"} ${visibilityCls}`}
            >
              <p className="whitespace-nowrap text-[11px] leading-tight tabular-nums text-mute sm:text-[12px]">
                {m.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
