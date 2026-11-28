import type { TransitMilestoneView } from "@/lib/analytics/types";
import MilestoneDate from "./MilestoneDate";
import TransitConnector from "./TransitConnector";
import TransitStation from "./TransitStation";

function isSegmentCompleted(
  current: TransitMilestoneView,
  next: TransitMilestoneView | undefined
): boolean {
  if (!next) return false;
  return (
    current.state === "completed" &&
    (next.state === "completed" || next.state === "terminal")
  );
}

function stationAriaDescription(m: TransitMilestoneView): string {
  const detail =
    m.formattedActualDate ??
    m.estimatedRange?.formatted ??
    m.statusLabel ??
    "Pending";
  const prefix = m.isCurrentStep ? "Current step: " : "";
  return `${prefix}${m.label}, ${m.state.replace("-", " ")}, ${detail}`;
}

export default function TransitRoute({
  milestones,
}: {
  milestones: TransitMilestoneView[];
}) {
  return (
    <div className="mt-5">
      {/* Desktop horizontal transit map */}
      <ol
        data-testid="transit-route-desktop"
        aria-label="Visa journey stages"
        className="hidden md:grid"
        style={{ gridTemplateColumns: `repeat(${milestones.length}, minmax(0, 1fr))` }}
      >
        {milestones.map((m, idx) => {
          const prev = idx > 0 ? milestones[idx - 1] : undefined;
          const next = idx < milestones.length - 1 ? milestones[idx + 1] : undefined;
          const leftDone = prev ? isSegmentCompleted(prev, m) : false;
          const rightDone = isSegmentCompleted(m, next);

          return (
            <li
              key={m.id}
              data-testid={`transit-station-${m.id.toLowerCase()}`}
              aria-current={m.isCurrentStep ? "step" : undefined}
              aria-label={stationAriaDescription(m)}
              className="flex min-w-0 flex-col items-center"
            >
              {/* Current step micro-indicator row (fixed min height keeps track perfectly level) */}
              <div className="mb-1.5 flex min-h-[16px] items-end justify-center">
                {m.isCurrentStep && (
                  <span
                    className={`whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider ${
                      m.state === "action-required"
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-ink-700"
                    }`}
                  >
                    Current step
                  </span>
                )}
              </div>

              {/* Station + aligned horizontal connectors */}
              <div className="relative flex h-8 w-full items-center justify-center">
                {idx > 0 && (
                  <div className="absolute left-0 right-1/2 top-1/2 -translate-y-1/2">
                    <TransitConnector orientation="horizontal" completed={leftDone} />
                  </div>
                )}

                {idx < milestones.length - 1 && (
                  <div className="absolute left-1/2 right-0 top-1/2 -translate-y-1/2">
                    <TransitConnector orientation="horizontal" completed={rightDone} />
                  </div>
                )}

                <TransitStation milestone={m} />
              </div>

              {/* Station title & concise date/range */}
              <div className="mt-2.5 px-1.5 text-center">
                <p className="text-[12px] font-medium leading-snug text-ink-900">
                  {m.label}
                </p>
                <MilestoneDate milestone={m} align="center" />
              </div>
            </li>
          );
        })}
      </ol>

      {/* Mobile vertical transit map */}
      <ol
        data-testid="transit-route-mobile"
        aria-label="Visa journey stages"
        className="md:hidden"
      >
        {milestones.map((m, idx) => {
          const next = idx < milestones.length - 1 ? milestones[idx + 1] : undefined;
          const downDone = isSegmentCompleted(m, next);
          const isLast = idx === milestones.length - 1;

          return (
            <li
              key={m.id}
              data-testid={`transit-station-mobile-${m.id.toLowerCase()}`}
              aria-current={m.isCurrentStep ? "step" : undefined}
              aria-label={stationAriaDescription(m)}
              className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3"
            >
              {/* Leading station track column */}
              <div className="relative flex flex-col items-center">
                <TransitStation milestone={m} />
                {!isLast && (
                  <div
                    className="absolute bottom-[-14px] left-1/2 top-[14px] -translate-x-1/2"
                    aria-hidden="true"
                  >
                    <TransitConnector orientation="vertical" completed={downDone} />
                  </div>
                )}
              </div>

              {/* Stage label & date */}
              <div className={isLast ? "pt-0.5" : "pb-5 pt-0.5"}>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <p className="text-[13px] font-medium leading-snug text-ink-900">
                    {m.label}
                  </p>
                  {m.isCurrentStep && (
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        m.state === "action-required"
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-ink-600"
                      }`}
                    >
                      Current step
                    </span>
                  )}
                </div>
                <MilestoneDate milestone={m} align="left" />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
