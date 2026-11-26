import { Skeleton } from "@/components/ui/States";

export default function UniversitiesLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading universities">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-16 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
