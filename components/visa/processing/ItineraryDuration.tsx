import type { StageTransitionView } from "@/lib/analytics/types";
import DurationPill from "./DurationPill";

/**
 * Binds a typical duration to the exact transition it measures.
 * - "pill":    only the compact pill (placed above the route on the horizontal layout)
 * - "caption": range / limited-data note + start-event anchor (placed below the labels)
 * - "stacked": pill followed by the caption (vertical layout)
 */
export default function ItineraryDuration({
  transition,
  fromTitle,
  toTitle,
  variant,
}: {
  transition: StageTransitionView;
  fromTitle: string;
  toTitle: string;
  variant: "pill" | "caption" | "stacked";
}) {
  const pill = (
    <span data-testid={`itinerary-duration-${transition.fromId}-${transition.toId}`}>
      <span className="sr-only">
        Typical time from {fromTitle} to {toTitle}
        {transition.anchor ? ` (${transition.anchor.toLowerCase()})` : ""}:{" "}
      </span>
      <DurationPill muted={!transition.available}>{transition.approx ?? "Unavailable"}</DurationPill>
    </span>
  );

  const detail = transition.available ? transition.range : transition.note;
  const caption =
    detail || transition.anchor ? (
      <span className="flex flex-col text-[11px] leading-tight text-mute sm:text-[12px]">
        {detail && <span className="whitespace-nowrap tabular-nums">{detail}</span>}
        {transition.anchor && <span className="mt-0.5 whitespace-nowrap">{transition.anchor}</span>}
      </span>
    ) : null;

  if (variant === "pill") return pill;
  if (variant === "caption") return caption;
  return (
    <div className="flex flex-col items-start gap-1.5">
      {pill}
      {caption}
    </div>
  );
}
