import type { StageDurationView } from "@/lib/analytics/types";
import ItineraryConnector from "./ItineraryConnector";

/** Neutral numbered rounded-square. The number marks process order, not personal progress. */
export function StationNode({ number }: { number: number }) {
  return (
    <span
      aria-hidden="true"
      data-station-node="true"
      className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-line bg-paper-sunk text-[15px] font-medium tabular-nums text-ink-900"
    >
      {String(number).padStart(2, "0")}
    </span>
  );
}

function StationText({ number, stage, centered }: { number: number; stage: StageDurationView; centered: boolean }) {
  return (
    <div className={`min-w-0 ${centered ? "mt-3 px-1 text-center" : ""}`}>
      <p className="text-[13px] font-semibold leading-snug text-ink-900">
        <span className="sr-only">Step {number}: </span>
        {stage.title}
      </p>
      <p className="mt-0.5 text-[12px] tabular-nums text-mute">{stage.subtitle}</p>
    </div>
  );
}

/**
 * One itinerary station. Horizontal: node row with connector halves meeting at the exact node centre
 * (no line before the first or after the last station), label below. Vertical: node beside its label;
 * the connector is drawn by the transition row that follows.
 */
export default function ItineraryStation({
  index,
  stage,
  orientation,
  hasPrev = false,
  hasNext = false,
}: {
  index: number;
  stage: StageDurationView;
  orientation: "horizontal" | "vertical";
  hasPrev?: boolean;
  hasNext?: boolean;
}) {
  const number = index + 1;

  if (orientation === "vertical") {
    return (
      <div
        data-testid={`itinerary-station-${stage.id}`}
        className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3.5"
      >
        <StationNode number={number} />
        <StationText number={number} stage={stage} centered={false} />
      </div>
    );
  }

  return (
    <div data-testid={`itinerary-station-${stage.id}`} className="flex flex-col items-center">
      <div className="relative flex h-11 w-full items-center justify-center">
        {hasPrev && (
          <span className="absolute left-0 right-1/2 top-1/2 -translate-y-1/2">
            <ItineraryConnector orientation="horizontal" />
          </span>
        )}
        {hasNext && (
          <span className="absolute left-1/2 right-0 top-1/2 -translate-y-1/2">
            <ItineraryConnector orientation="horizontal" />
          </span>
        )}
        <StationNode number={number} />
      </div>
      <StationText number={number} stage={stage} centered />
    </div>
  );
}
