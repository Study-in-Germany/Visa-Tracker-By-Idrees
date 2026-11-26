import { Skeleton } from "@/components/ui/States";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading analytics">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-72 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
