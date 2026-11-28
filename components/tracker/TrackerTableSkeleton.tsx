import { PaginationSkeleton } from "@/components/ui/Skeletons";
import { Skeleton } from "@/components/ui/States";

export default function TrackerTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div
      className="hidden md:flex md:min-h-0 md:flex-1 md:flex-col overflow-hidden bg-paper"
      aria-hidden="true"
    >
      <div className="shrink-0 border-b border-line bg-paper-sunk px-5 py-3">
        <Skeleton className="h-3.5 w-full" />
      </div>
      <div className="min-h-0 flex-1 divide-y divide-line overflow-hidden">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-20 lg:block" />
            <Skeleton className="hidden h-4 w-24 lg:block" />
            <Skeleton className="h-6 w-24 rounded-[5px]" />
          </div>
        ))}
      </div>
      <PaginationSkeleton />
    </div>
  );
}
