import { Skeleton } from "@/components/ui/States";

export default function ApplicantDetailLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading applicant details">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-36 w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Skeleton className="h-80 w-full rounded-lg" />
          <Skeleton className="h-44 w-full rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
