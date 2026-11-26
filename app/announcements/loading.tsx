import { Skeleton } from "@/components/ui/States";

export default function AnnouncementsLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading announcements">
      <Skeleton className="h-4 w-56" />
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-36 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
