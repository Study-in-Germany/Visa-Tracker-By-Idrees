import { Skeleton } from "@/components/ui/States";

export default function QueueProgressLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading queue progress">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  );
}
