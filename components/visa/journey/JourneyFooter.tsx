import Link from "next/link";
import Icon from "@/components/ui/Icon";
import type { CorrectionHistoryItem } from "@/lib/analytics/types";
import type { PersonalForecastResult } from "@/lib/forecasting/types";
import ForecastDetailsDrawer from "./ForecastDetailsDrawer";

export default function JourneyFooter({
  forecast,
  correctionEvents,
  hideDetailsButton = false,
  hideCalculatorLink = false,
}: {
  forecast: PersonalForecastResult;
  correctionEvents?: CorrectionHistoryItem[];
  hideDetailsButton?: boolean;
  hideCalculatorLink?: boolean;
}) {
  if (hideDetailsButton && hideCalculatorLink) return null;

  return (
    <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
      <div>
        {!hideDetailsButton && (
          <ForecastDetailsDrawer
            forecast={forecast}
            correctionEvents={correctionEvents}
          />
        )}
      </div>

      {!hideCalculatorLink && (
        <Link
          href="/calculator"
          className="inline-flex min-h-[36px] items-center gap-1.5 text-[13px] font-medium text-ink-900 transition-colors hover:text-ink-600"
        >
          <span>Scenario calculator</span>
          <Icon name="arrowRight" size={14} />
        </Link>
      )}
    </footer>
  );
}
