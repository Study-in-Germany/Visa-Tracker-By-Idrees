import { Skeleton } from "@/components/ui/States";

export default function VisaEstimatorLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading visa estimator">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="h-7 w-40 rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-lg lg:col-span-5" />
        <Skeleton className="h-80 rounded-lg lg:col-span-7" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
