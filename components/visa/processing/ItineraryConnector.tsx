/**
 * Thin dashed itinerary route. Dash rhythm is constant (4px dash / 5px gap) regardless of length.
 * Horizontal segments fill their wrapper; vertical segments stretch to the height of their row.
 */
export default function ItineraryConnector({
  orientation,
  className = "",
}: {
  orientation: "horizontal" | "vertical";
  className?: string;
}) {
  const horizontal = orientation === "horizontal";
  return (
    <span
      aria-hidden="true"
      data-connector={orientation}
      className={`pointer-events-none block text-neutral-400 dark:text-neutral-600 ${
        horizontal ? "h-[2px] w-full" : "min-h-[3rem] w-[2px] self-stretch"
      } ${className}`}
      style={{
        backgroundImage: `repeating-linear-gradient(${
          horizontal ? "to right" : "to bottom"
        }, currentColor 0 4px, transparent 4px 9px)`,
      }}
    />
  );
}
