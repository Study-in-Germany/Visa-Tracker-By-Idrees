export default function QueueLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[11px] text-mute sm:text-[12px]">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full bg-[#262626] dark:bg-[#EDEDED]"
          aria-hidden="true"
        />
        Cohorts reached
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full bg-[#D4D4D4] dark:bg-[#303030]"
          aria-hidden="true"
        />
        Later cohorts
      </span>
    </div>
  );
}
