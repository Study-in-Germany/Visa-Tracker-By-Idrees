import { Skeleton } from "@/components/ui/States";

export default function AccommodationLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading accommodation">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card overflow-hidden">
            <Skeleton className="h-44 w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
