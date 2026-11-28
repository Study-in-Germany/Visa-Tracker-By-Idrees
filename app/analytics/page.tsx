import { Suspense } from "react";
import AnalyticsWorkspace from "@/components/analytics/layout/AnalyticsWorkspace";
import { AnalyticsDashboardSkeleton } from "@/components/analytics/shared/AnalyticsChartSkeleton";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsDashboardSkeleton />}>
      <AnalyticsWorkspace />
    </Suspense>
  );
}
