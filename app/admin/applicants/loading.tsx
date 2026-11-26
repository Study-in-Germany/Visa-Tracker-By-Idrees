import { Skeleton } from "@/components/ui/States";

export default function AdminApplicantsLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading applicants">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-4 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="card divide-y divide-line overflow-hidden">
        <div className="h-10 bg-paper-raised" />
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
