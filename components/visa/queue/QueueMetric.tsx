import type { QueueMetricView } from "@/lib/analytics/types";

export default function QueueMetric({
  metric,
  className = "",
}: {
  metric: QueueMetricView;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      {/* Desktop & standard label */}
      <p className="hidden truncate text-[13px] font-normal text-mute sm:block sm:text-[14px]">
        {metric.label}
      </p>
      {/* Concise mobile label */}
      <p className="truncate text-[11px] font-normal text-mute sm:hidden">
        {metric.mobileLabel ?? metric.label}
      </p>

      {metric.available && metric.value ? (
        <p className="mt-1 truncate text-[22px] font-semibold leading-[1.15] tracking-tight tabular-nums text-ink-900 sm:text-[28px]">
          {metric.value}
        </p>
      ) : (
        <p className="mt-1 text-[20px] font-semibold leading-[1.15] text-mute sm:text-[24px]">
          —
        </p>
      )}

      {(metric.sublabel || metric.mobileSublabel) && (
        <>
          <p className="mt-1 hidden truncate text-[12px] text-mute sm:block sm:text-[13px]">
            {metric.available ? metric.sublabel : "Unavailable"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-mute sm:hidden">
            {metric.available ? (metric.mobileSublabel ?? metric.sublabel) : "Unavailable"}
          </p>
        </>
      )}
    </div>
  );
}
