import { Skeleton } from "@/components/ui/States";

export default function ProgrammesLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading programmes">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-16 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="card divide-y divide-line overflow-hidden">
        <div className="h-10 bg-paper-raised" />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
