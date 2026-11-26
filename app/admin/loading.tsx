import { Skeleton } from "@/components/ui/States";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading admin dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-5">
        <Skeleton className="h-56 rounded-lg xl:col-span-3" />
        <Skeleton className="h-56 rounded-lg xl:col-span-2" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}
