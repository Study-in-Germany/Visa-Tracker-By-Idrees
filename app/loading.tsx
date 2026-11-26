import { Skeleton } from "@/components/ui/States";

export default function OverviewLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading overview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Embassy frontier cards */}
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>

      {/* 6 KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Skeleton className="col-span-2 h-[88px] rounded-lg" />
        <Skeleton className="h-[88px] rounded-lg" />
        <Skeleton className="h-[88px] rounded-lg" />
        <Skeleton className="h-[88px] rounded-lg" />
        <Skeleton className="h-[88px] rounded-lg" />
      </div>

      {/* Recent invites + appointments */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>

      {/* Activity table */}
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  );
}
