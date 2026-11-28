import { Skeleton } from "@/components/ui/States";

function EmbassyRowSkeleton() {
  return (
    <div className="space-y-3 px-3.5 py-4 sm:px-5" aria-hidden="true">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3.5 w-24" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 min-[360px]:grid-cols-3 sm:gap-x-6">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="col-span-2 space-y-1.5 min-[360px]:col-span-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-2 pt-8">
        <div className="grid grid-cols-10 gap-[3px] sm:gap-[5px]">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-[9px] w-full rounded-[4px] sm:h-[12px] sm:rounded-[5px]" />
          ))}
        </div>
        <div className="grid grid-cols-10 gap-[3px] sm:gap-[5px]">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="mx-auto h-3 w-6" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function QueueOverviewSkeleton() {
  return (
    <section
      className="overflow-hidden rounded-xl border border-line bg-card"
      role="status"
      aria-label="Loading queue overview"
    >
      <div className="border-b border-line bg-paper-sunk px-3.5 py-3 space-y-1.5 sm:px-5" aria-hidden="true">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
      <div className="divide-y divide-line">
        <EmbassyRowSkeleton />
        <EmbassyRowSkeleton />
      </div>
      <div className="flex gap-4 border-t border-line px-3.5 py-2.5 sm:px-5" aria-hidden="true">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </section>
  );
}
