import QueueOverviewSkeletonComponent from "@/components/visa/queue/QueueOverviewSkeleton";
import ProcessingItinerarySkeleton from "@/components/visa/processing/ProcessingItinerarySkeleton";
import TransitJourneySkeleton from "@/components/visa/journey/TransitJourneySkeleton";
import { Skeleton } from "./States";

export function StatCardSkeleton() {
  return (
    <div className="min-h-[78px] rounded-xl border border-line bg-card p-3" aria-hidden="true">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-2.5 w-20" />
        </div>
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="mt-2 h-2.5 w-24" />
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 gap-2.5 ${count >= 5 ? "sm:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-4"}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export const QueueOverviewSkeleton = QueueOverviewSkeletonComponent;
export const QueueProgressSkeleton = QueueOverviewSkeletonComponent;

export const VisaStageTimelineSkeleton = ProcessingItinerarySkeleton;

export const JourneyTimelineSkeleton = VisaStageTimelineSkeleton;

export function OverviewSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading overview">
      <StatCardsSkeleton count={5} />
      <QueueProgressSkeleton />
      <JourneyTimelineSkeleton />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]" aria-hidden="true">
        <div className="card p-5 space-y-2.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2.5 w-full rounded-full" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
        <div className="card p-5 space-y-3">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TableFiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
      <Skeleton className="h-9 w-28 rounded-full" />
      <Skeleton className="h-9 w-28 rounded-full" />
      <Skeleton className="h-9 w-28 rounded-full" />
      <Skeleton className="h-9 w-28 rounded-full" />
    </div>
  );
}

export function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-between border-t border-line bg-card px-4 py-2.5" aria-hidden="true">
      <Skeleton className="h-3.5 w-40" />
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-8 w-14 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-14 rounded-lg" />
      </div>
      <Skeleton className="hidden h-8 w-20 rounded-lg sm:block" />
    </div>
  );
}

export function DataTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-card" aria-hidden="true">
      <div className="border-b border-line bg-paper-sunk px-5 py-2.5">
        <Skeleton className="h-3.5 w-full" />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-20 lg:block" />
            <Skeleton className="hidden h-4 w-24 lg:block" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrackerPageSkeleton() {
  return (
    <div
      className="flex flex-col md:h-full md:min-h-0 md:flex-1 md:overflow-hidden"
      role="status"
      aria-label="Loading My Journey"
    >
      <div className="shrink-0 pb-3 md:border-b md:border-line md:px-4 md:py-3 lg:px-5">
        <StatCardsSkeleton count={4} />
      </div>

      {/* Mobile cards skeleton */}
      <div className="space-y-2.5 md:hidden" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-line bg-card p-3.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-6 w-20 rounded-[5px]" />
            </div>
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Desktop edge-to-edge table skeleton + bottom pagination */}
      <div className="hidden md:flex md:min-h-0 md:flex-1 md:flex-col overflow-hidden bg-paper" aria-hidden="true">
        <div className="border-b border-line bg-paper-sunk px-5 py-3">
          <Skeleton className="h-3.5 w-full" />
        </div>
        <div className="flex-1 divide-y divide-line overflow-hidden">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-20 lg:block" />
              <Skeleton className="hidden h-4 w-24 lg:block" />
              <Skeleton className="h-6 w-24 rounded-[5px]" />
            </div>
          ))}
        </div>
        <PaginationSkeleton />
      </div>
    </div>
  );
}

export function SubmitPageSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-paper" role="status" aria-label="Loading submission form">
      <div className="h-14 border-b border-line bg-[rgb(var(--chrome))]" aria-hidden="true" />
      <div className="mx-auto grid max-w-5xl items-start gap-5 px-3 py-4 sm:px-5 sm:py-5 lg:grid-cols-[minmax(0,1fr)_248px]">
        <div className="card space-y-4 p-5" aria-hidden="true">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3.5 w-72" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="card hidden space-y-3 p-4 lg:block" aria-hidden="true">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-1.5 w-full rounded-full" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MorePageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-5" role="status" aria-label="Loading menu">
      {[3, 4, 3].map((count, g) => (
        <div key={g} className="space-y-1.5" aria-hidden="true">
          <Skeleton className="ml-1 h-3 w-24" />
          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-3.5 py-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-48" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading analytics">
      <StatCardsSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
        <div className="card p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
        <div className="card p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
      </div>
      <div className="card p-5 space-y-3" aria-hidden="true">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-44 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading form">
      <div className="card p-5 space-y-4" aria-hidden="true">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: fields }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading details">
      <div className="card p-5 space-y-3" aria-hidden="true">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-3.5 w-60" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]" aria-hidden="true">
        <div className="card p-5 space-y-3">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
        <div className="card p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DirectoryListSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading list">
      <TableFiltersSkeleton />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <PaginationSkeleton />
    </div>
  );
}

export const PersonalJourneySkeleton = TransitJourneySkeleton;
export const PersonalForecastSkeleton = TransitJourneySkeleton;

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading My dashboard">
      <StatCardsSkeleton count={4} />
      <PersonalForecastSkeleton />
      <div className="grid items-start gap-3 lg:grid-cols-12" aria-hidden="true">
        <div className="card p-4 space-y-2 lg:col-span-6">
          <Skeleton className="h-4 w-44" />
          <div className="grid gap-1.5 sm:grid-cols-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="card p-4 space-y-2.5 lg:col-span-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
        <div className="card p-4 space-y-2.5 lg:col-span-3">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
