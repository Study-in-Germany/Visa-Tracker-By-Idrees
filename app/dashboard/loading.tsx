import { Skeleton } from "@/components/ui/States";

export default function DashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[94px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-lg" />
      <Skeleton className="h-44 w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}
