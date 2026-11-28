export default function QueueDatePill({
  label,
  overallRatio,
}: {
  label: string;
  overallRatio: number;
}) {
  const alignTransform =
    overallRatio < 0.14
      ? "-translate-x-[10px]"
      : overallRatio > 0.86
        ? "-translate-x-[calc(100%-10px)]"
        : "-translate-x-1/2";

  return (
    <span
      data-testid="queue-date-pill"
      className={`pointer-events-none absolute bottom-[20px] left-0 inline-flex h-[24px] items-center whitespace-nowrap rounded-full bg-[#262626] px-3 text-[12px] font-semibold tabular-nums text-white dark:bg-[#EDEDED] dark:text-[#171717] sm:bottom-[23px] sm:h-[28px] sm:px-3.5 sm:text-[13px] ${alignTransform}`}
    >
      {label}
    </span>
  );
}
