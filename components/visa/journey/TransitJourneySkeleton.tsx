import { Skeleton } from "@/components/ui/States";

export default function TransitJourneySkeleton() {
  return (
    <section
      className="rounded-xl border border-line bg-card px-4 py-4 sm:px-6 sm:py-5"
      role="status"
      aria-label="Loading visa journey"
    >
      <div className="flex items-center justify-between gap-3" aria-hidden="true">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-b border-line pb-4" aria-hidden="true">
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-36" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>

      {/* Desktop horizontal stations */}
      <div className="mt-5 hidden md:grid md:grid-cols-6 gap-3" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col items-center space-y-2 pt-5">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Mobile vertical stations */}
      <div className="mt-5 space-y-4 md:hidden" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="space-y-1.5 pt-0.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-3.5" aria-hidden="true">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3.5 w-32" />
      </div>
    </section>
  );
}
