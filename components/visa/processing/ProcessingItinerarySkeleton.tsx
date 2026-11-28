import { Skeleton } from "@/components/ui/States";

/** Mirrors the itinerary layout: horizontal route when wide, vertical route when narrow. */
export default function ProcessingItinerarySkeleton() {
  return (
    <section
      className="rounded-xl border border-line bg-card p-4 sm:p-5"
      role="status"
      aria-label="Loading processing times"
    >
      <div className="flex items-start justify-between gap-3" aria-hidden="true">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      <div className="[container-type:inline-size]" aria-hidden="true">
        <div className="mt-4 hidden grid-cols-4 [@container(min-width:560px)]:grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="relative flex flex-col items-center pb-[30px] pt-[42px]">
              {i < 3 && <Skeleton className="absolute left-full top-0 h-[26px] w-[84px] -translate-x-1/2 rounded-full" />}
              <div className="relative flex h-11 w-full items-center justify-center">
                {i > 0 && <span className="absolute left-0 right-1/2 top-1/2 h-[2px] -translate-y-1/2 bg-line" />}
                {i < 3 && <span className="absolute left-1/2 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-line" />}
                <Skeleton className="relative z-10 h-11 w-11 rounded-[10px]" />
              </div>
              <Skeleton className="mt-3 h-3.5 w-24" />
              <Skeleton className="mt-1.5 h-3 w-16" />
              {i < 3 && <Skeleton className="absolute bottom-0 left-full h-3 w-20 -translate-x-1/2" />}
            </div>
          ))}
        </div>

        <div className="mt-4 [@container(min-width:560px)]:hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3.5">
                <Skeleton className="h-11 w-11 rounded-[10px]" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              {i < 3 && (
                <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-3.5">
                  <div className="flex justify-center">
                    <span className="min-h-[3rem] w-[2px] self-stretch bg-line" />
                  </div>
                  <div className="space-y-1.5 py-3">
                    <Skeleton className="h-[26px] w-[84px] rounded-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3.5 rounded-xl border border-line bg-paper-sunk px-4 py-3" aria-hidden="true">
        <Skeleton className="h-[22px] w-[74px]" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3 w-48 max-w-full" />
        </div>
        <Skeleton className="h-6 w-10" />
      </div>
    </section>
  );
}
