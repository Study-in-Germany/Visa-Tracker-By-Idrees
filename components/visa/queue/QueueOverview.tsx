import Icon from "@/components/ui/Icon";
import { formatDisplayDate } from "@/lib/analytics/formatters";
import type { CanonicalQueueOverview } from "@/lib/analytics/types";
import EmbassyQueueSection from "./EmbassyQueueSection";
import QueueDetails from "./QueueDetails";
import QueueLegend from "./QueueLegend";

export default function QueueOverview({ data }: { data: CanonicalQueueOverview }) {
  const hasAnyTimeline = data.embassies.some((e) => e.hasEnoughData && e.timeline);

  return (
    <section
      data-testid="queue-overview"
      aria-labelledby="queue-right-now-heading"
      className="overflow-hidden rounded-xl border border-line bg-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line bg-paper-sunk px-3.5 py-3 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="clock" size={16} className="shrink-0 text-ink-600" />
            <h2 id="queue-right-now-heading" className="text-[14px] font-semibold text-ink-900">
              The queue right now
            </h2>
          </div>
          <p className="mt-1 text-xs text-mute">
            Community estimates · Not official embassy data.
            {data.lastUpdatedDate ? ` · Updated ${formatDisplayDate(data.lastUpdatedDate)}` : ""}
          </p>
        </div>
        <QueueDetails data={data} />
      </div>

      <div className="divide-y divide-line">
        {data.embassies.map((emb) => (
          <EmbassyQueueSection key={emb.embassy} data={emb} />
        ))}
      </div>

      {hasAnyTimeline && (
        <div className="border-t border-line px-3.5 py-2.5 sm:px-5">
          <QueueLegend />
        </div>
      )}
    </section>
  );
}
