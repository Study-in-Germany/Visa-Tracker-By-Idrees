import type { CorrectionSummaryView } from "@/lib/analytics/types";
import CorrectionRatio from "./CorrectionRatio";

function supportingText(data: CorrectionSummaryView): string {
  if (data.percent === null) return "Not enough submissions yet";
  if (data.correctionCount === 0) {
    return `No correction requests recorded · ${data.submissionsCount.toLocaleString("en-US")} submissions`;
  }
  const cases = `${data.correctionCount.toLocaleString("en-US")} ${data.correctionCount === 1 ? "case" : "cases"}`;
  return data.oneInN
    ? `About 1 in ${data.oneInN} submissions · ${cases}`
    : `About ${data.percent}% of submissions · ${cases}`;
}

export default function CorrectionSummary({ data }: { data: CorrectionSummaryView }) {
  return (
    <div
      data-testid="correction-summary"
      className="mt-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 rounded-xl border border-line bg-paper-sunk px-3.5 py-3 max-[419px]:grid-cols-[1fr_auto] sm:px-4"
    >
      <div className="max-[419px]:col-start-1 max-[419px]:row-start-1">
        <CorrectionRatio percent={data.percent} />
      </div>
      <div className="min-w-0 max-[419px]:col-span-2 max-[419px]:row-start-2">
        <p className="text-[14px] font-semibold text-ink-900">Document corrections</p>
        <p className="mt-0.5 text-[12px] text-mute">{supportingText(data)}</p>
      </div>
      <p
        data-testid="correction-percent"
        className="text-[24px] font-semibold leading-none tabular-nums text-ink-900 max-[419px]:col-start-2 max-[419px]:row-start-1"
      >
        {data.percent === null ? "—" : `${data.percent}%`}
      </p>
    </div>
  );
}
