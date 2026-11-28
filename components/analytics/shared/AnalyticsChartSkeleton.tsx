import { Skeleton } from "@/components/ui/States";

export function AnalyticsChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div
      className="flex w-full flex-col justify-between rounded-lg border border-line/60 bg-paper-sunk/40 p-4"
      style={{ height }}
      aria-hidden="true"
    >
      <div className="flex items-end justify-between gap-2 pt-4" style={{ height: height - 54 }}>
        {[48, 72, 36, 86, 62, 92, 54, 78, 65, 84].map((h, i) => (
          <div
            key={i}
            className="w-full animate-pulse rounded-t bg-ink-100"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between pt-2">
        <Skeleton className="h-2.5 w-10" />
        <Skeleton className="h-2.5 w-10" />
        <Skeleton className="h-2.5 w-10" />
        <Skeleton className="h-2.5 w-10" />
      </div>
    </div>
  );
}

export function AnalyticsDashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5" aria-busy="true" aria-label="Loading analytics dashboard">
      {/* Toolbar skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-36" />
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      {/* 8 / 4 Row */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-12">
        <div className="rounded-xl border border-line bg-card p-5 xl:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-8 w-36 rounded-lg" />
          </div>
          <AnalyticsChartSkeleton height={240} />
        </div>
        <div className="rounded-xl border border-line bg-card p-5 xl:col-span-4">
          <div className="mb-4 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <AnalyticsChartSkeleton height={240} />
        </div>
      </div>

      {/* 6 / 6 Row */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-12">
        <div className="rounded-xl border border-line bg-card p-5 xl:col-span-6">
          <Skeleton className="mb-3 h-4 w-40" />
          <AnalyticsChartSkeleton height={210} />
        </div>
        <div className="rounded-xl border border-line bg-card p-5 xl:col-span-6">
          <Skeleton className="mb-3 h-4 w-44" />
          <AnalyticsChartSkeleton height={210} />
        </div>
      </div>

      {/* Intelligence full-width */}
      <div className="rounded-xl border border-line bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-44 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 py-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
