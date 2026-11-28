import type { VisaStageTimelineView } from "@/lib/analytics/types";
import CorrectionSummary from "./CorrectionSummary";
import ItineraryConnector from "./ItineraryConnector";
import ItineraryDuration from "./ItineraryDuration";
import ItineraryStation from "./ItineraryStation";
import ProcessingDetails from "./ProcessingDetails";

/**
 * "How long each step takes" – flight-itinerary styled history of community processing times.
 * The layout switches on the component's own width (container query) rather than the viewport, so the
 * desktop sidebar never forces the horizontal route into a space that is too narrow.
 */
export default function VisaProcessingItinerary({ data }: { data: VisaStageTimelineView }) {
  const stages = data.stages;
  const hasAnchor = data.transitions.some((t) => t.anchor);

  return (
    <section
      data-testid="visa-processing-itinerary"
      aria-labelledby="step-durations-heading"
      className="rounded-xl border border-line bg-card p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="step-durations-heading" className="text-[15px] font-semibold text-ink-900">
            How long each step takes
          </h2>
          <p className="mt-0.5 text-xs text-mute">{data.subtitle}</p>
        </div>
        <ProcessingDetails data={data} />
      </div>

      <div className="[container-type:inline-size]">
        {/* Wide: horizontal itinerary */}
        <ol
          data-testid="itinerary-horizontal"
          aria-label="Processing stages"
          className="mt-4 hidden grid-cols-4 [@container(min-width:560px)]:grid"
        >
          {stages.map((stage, idx) => {
            const next = data.transitions[idx];
            return (
              <li
                key={stage.id}
                className={`relative min-w-0 pt-[42px] ${hasAnchor ? "pb-[44px]" : "pb-[30px]"}`}
              >
                <ItineraryStation
                  index={idx}
                  stage={stage}
                  orientation="horizontal"
                  hasPrev={idx > 0}
                  hasNext={idx < stages.length - 1}
                />
                {next && (
                  <>
                    <span className="absolute left-full top-0 -translate-x-1/2">
                      <ItineraryDuration
                        transition={next}
                        fromTitle={stage.title}
                        toTitle={stages[idx + 1].title}
                        variant="pill"
                      />
                    </span>
                    <span className="absolute bottom-0 left-full flex w-max -translate-x-1/2 justify-center text-center">
                      <ItineraryDuration
                        transition={next}
                        fromTitle={stage.title}
                        toTitle={stages[idx + 1].title}
                        variant="caption"
                      />
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>

        {/* Narrow: vertical itinerary */}
        <ol
          data-testid="itinerary-vertical"
          aria-label="Processing stages"
          className="mt-4 [@container(min-width:560px)]:hidden"
        >
          {stages.map((stage, idx) => {
            const next = data.transitions[idx];
            return (
              <li key={stage.id}>
                <ItineraryStation index={idx} stage={stage} orientation="vertical" />
                {next && (
                  <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-3.5">
                    <div className="flex justify-center">
                      <ItineraryConnector orientation="vertical" />
                    </div>
                    <div className="py-3">
                      <ItineraryDuration
                        transition={next}
                        fromTitle={stage.title}
                        toTitle={stages[idx + 1].title}
                        variant="stacked"
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <CorrectionSummary data={data.correction} />
    </section>
  );
}
