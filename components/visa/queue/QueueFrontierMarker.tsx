import QueueDatePill from "./QueueDatePill";

export default function QueueFrontierMarker({
  embassy,
  fillRatio,
  overallRatio,
  shortDate,
}: {
  embassy: string;
  fillRatio: number;
  overallRatio: number;
  shortDate: string;
}) {
  const clamped = Math.max(0, Math.min(1, fillRatio));

  return (
    <div
      data-testid={`queue-frontier-marker-${embassy.toLowerCase()}`}
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 z-10 h-0 w-0"
      style={{ left: `${clamped * 100}%` }}
    >
      {/* Floating date pill */}
      <QueueDatePill label={shortDate} overallRatio={overallRatio} />

      {/* Thin vertical connector */}
      <span
        data-marker-connector="true"
        className="absolute bottom-[6px] left-0 block h-[14px] w-[1.5px] -translate-x-1/2 bg-[#262626] dark:bg-[#EDEDED] sm:bottom-[7px] sm:h-[16px]"
      />

      {/* Circular outlined frontier marker */}
      <span
        data-marker-circle="true"
        className="absolute left-0 top-0 block h-[12px] w-[12px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-[#262626] bg-white dark:border-[#EDEDED] dark:bg-[#171717] sm:h-[14px] sm:w-[14px]"
      />
    </div>
  );
}
