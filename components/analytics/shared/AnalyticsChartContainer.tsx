"use client";

export default function AnalyticsChartContainer({
  ariaLabel,
  srSummary,
  minHeight,
  children,
  className = "",
}: {
  ariaLabel: string;
  srSummary?: string;
  minHeight?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      style={minHeight ? { minHeight } : undefined}
      className={`relative w-full min-w-0 overflow-hidden ${className}`}
    >
      {srSummary && <p className="sr-only">{srSummary}</p>}
      {children}
    </div>
  );
}
