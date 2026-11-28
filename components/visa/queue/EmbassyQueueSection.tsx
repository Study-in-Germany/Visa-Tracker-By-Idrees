import type { EmbassyQueueView } from "@/lib/analytics/types";
import QueueConfidenceIndicator from "./QueueConfidenceIndicator";
import QueueMetric from "./QueueMetric";
import SegmentedQueueTimeline from "./SegmentedQueueTimeline";

export default function EmbassyQueueSection({ data }: { data: EmbassyQueueView }) {
  return (
    <div
      className="px-3.5 py-4 sm:px-5 sm:py-4"
      data-testid={`embassy-queue-${data.embassy.toLowerCase()}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-[15px] font-semibold text-ink-900 sm:text-[16px]">
            {data.embassy}
          </h3>
          {data.confidenceLabel && data.confidenceDetail && data.confidenceTone && (
            <QueueConfidenceIndicator
              embassy={data.embassy}
              label={data.confidenceLabel}
              detail={data.confidenceDetail}
              tone={data.confidenceTone}
              observedRangeStart={data.diagnostics.observedRangeStart}
              observedRangeEnd={data.diagnostics.observedRangeEnd}
              sampleSize={data.diagnostics.sampleSize}
            />
          )}
        </div>
      </div>

      {!data.hasEnoughData ? (
        <p className="mt-2.5 text-[13px] text-mute">
          Not enough verified reports for this consulate yet. Estimates will appear as more applicants add their submission and appointment dates.
        </p>
      ) : (
        <div className="mt-3">
          <div className="grid grid-cols-2 items-baseline gap-x-4 gap-y-3 min-[360px]:grid-cols-3 sm:gap-x-6">
            <QueueMetric metric={data.submissionFrontier} />
            <QueueMetric metric={data.appointmentFrontier} />
            <QueueMetric
              metric={data.weeklyMovement}
              className="col-span-2 min-[360px]:col-span-1"
            />
          </div>

          {data.timeline && (
            <div className="mt-2">
              <SegmentedQueueTimeline
                embassy={data.embassy}
                months={data.timeline.months}
                activeMonthIndex={data.timeline.activeMonthIndex}
                activeMonthFillRatio={data.timeline.activeMonthFillRatio}
                overallRatio={data.timeline.overallRatio}
                markerShortDate={data.timeline.markerShortDate}
                frontierDisplayDate={data.timeline.frontierDisplayDate}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
