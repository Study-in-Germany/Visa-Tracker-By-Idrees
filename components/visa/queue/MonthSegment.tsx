import type { MonthlyTimelineMonth } from "@/lib/analytics/types";
import QueueFrontierMarker from "./QueueFrontierMarker";

export default function MonthSegment({
  embassy,
  month,
  isActive,
  activeFillRatio,
  overallRatio,
  markerShortDate,
}: {
  embassy: string;
  month: MonthlyTimelineMonth;
  isActive: boolean;
  activeFillRatio: number;
  overallRatio: number;
  markerShortDate: string;
}) {
  return (
    <div className="relative h-[9px] w-full sm:h-[12px]">
      <div className="h-full w-full overflow-hidden rounded-[4px] bg-[#D4D4D4] dark:bg-[#303030] sm:rounded-[5px]">
        {month.fillRatio > 0 && (
          <div
            data-segment-fill={isActive ? "active" : "reached"}
            className="h-full bg-[#262626] dark:bg-[#EDEDED]"
            style={{ width: `${month.fillRatio * 100}%` }}
          />
        )}
      </div>

      {isActive && (
        <QueueFrontierMarker
          embassy={embassy}
          fillRatio={activeFillRatio}
          overallRatio={overallRatio}
          shortDate={markerShortDate}
        />
      )}
    </div>
  );
}
