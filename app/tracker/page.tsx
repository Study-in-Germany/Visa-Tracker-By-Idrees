import { Suspense } from "react";
import { TrackerPageSkeleton } from "@/components/ui/Skeletons";
import TrackerWorkspace from "@/components/tracker/TrackerWorkspace";

export default function TrackerPage() {
  return (
    <Suspense fallback={<TrackerPageSkeleton />}>
      <TrackerWorkspace />
    </Suspense>
  );
}
