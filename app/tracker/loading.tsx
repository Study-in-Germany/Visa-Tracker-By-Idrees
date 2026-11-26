import { Skeleton } from "@/components/ui/States";

export default function TrackerLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading tracker">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[96px] rounded-lg" />
        ))}
      </div>
      <div className="card space-y-2 p-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="card divide-y divide-line overflow-hidden">
        <div className="h-10 bg-paper-raised" />
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
