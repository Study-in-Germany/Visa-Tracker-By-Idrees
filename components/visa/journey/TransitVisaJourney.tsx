import Icon from "@/components/ui/Icon";
import type { TransitJourneyViewModel } from "@/lib/analytics/types";
import CurrentStageSummary from "./CurrentStageSummary";
import JourneyFooter from "./JourneyFooter";
import JourneyNextAction from "./JourneyNextAction";
import TransitRoute from "./TransitRoute";

export default function TransitVisaJourney({
  data,
  title = "Your visa journey",
  headerAction,
  onMilestoneSaved,
  hideDetailsButton = false,
  hideCalculatorLink = false,
}: {
  data: TransitJourneyViewModel;
  title?: string;
  headerAction?: React.ReactNode;
  onMilestoneSaved?: () => void;
  hideDetailsButton?: boolean;
  hideCalculatorLink?: boolean;
}) {
  return (
    <section
      data-testid="transit-visa-journey"
      aria-labelledby="transit-visa-journey-heading"
      className="rounded-xl border border-line bg-card px-4 py-4 sm:px-6 sm:py-5"
    >
      {/* 1. Section header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="transit-visa-journey-heading"
          className="text-[18px] font-semibold tracking-tight text-ink-900 sm:text-[20px]"
        >
          {title}
        </h2>
        {headerAction ?? (
          <span className="text-[12px] text-mute">{data.freshnessLabel}</span>
        )}
      </header>

      {/* 2. Current-stage summary */}
      <CurrentStageSummary
        embassy={data.embassy}
        currentStage={data.currentStage}
      />

      {/* 3. Connected transit route */}
      <TransitRoute milestones={data.milestones} />

      {/* Subtle note only for completed correction summary or essential data limitation */}
      {(data.corrections.summaryText || data.warningNote) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-mute">
          {data.corrections.summaryText && (
            <span className="inline-flex items-center gap-1">
              <Icon name="wrench" size={11} />
              {data.corrections.summaryText}
            </span>
          )}
          {data.warningNote && (
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <Icon name="alert" size={11} />
              {data.warningNote}
            </span>
          )}
        </div>
      )}

      {/* 4. Contextual next action when required */}
      {data.nextAction && (
        <JourneyNextAction
          action={data.nextAction}
          onMilestoneSaved={onMilestoneSaved}
        />
      )}

      {/* 5. Compact footer */}
      <JourneyFooter
        forecast={data.forecast}
        correctionEvents={data.corrections.events}
        hideDetailsButton={hideDetailsButton}
        hideCalculatorLink={hideCalculatorLink}
      />
    </section>
  );
}
