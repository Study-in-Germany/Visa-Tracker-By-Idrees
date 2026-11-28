import Icon from "@/components/ui/Icon";

export default function AnalyticsInsufficientData({
  title,
  detail,
  sampleSize,
  minimumRequired,
}: {
  title: string;
  detail: string;
  sampleSize?: number;
  minimumRequired?: number;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-line bg-paper-sunk/70 px-3.5 py-3 text-left">
      <Icon name="info" size={15} className="mt-0.5 shrink-0 text-mute" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-ink-800">{title}</span>
          {typeof sampleSize === "number" && (
            <span className="rounded border border-line bg-paper-raised px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-mute">
              n={sampleSize}
              {minimumRequired ? ` / ${minimumRequired} min` : ""}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12px] leading-snug text-mute">{detail}</p>
      </div>
    </div>
  );
}
