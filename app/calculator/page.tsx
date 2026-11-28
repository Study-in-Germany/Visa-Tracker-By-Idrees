import type { Metadata } from "next";
import TimelineCalculator from "@/components/forecasting/TimelineCalculator";
import QueueOverview from "@/components/visa/queue/QueueOverview";
import { adaptQueueOverview } from "@/lib/analytics/adapters";
import { generatePersonalForecast, getIntelligenceDashboardData } from "@/lib/forecasting/forecast-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Timeline Calculator",
  description: "Estimate German student visa timelines for Islamabad and Karachi.",
};

export default async function CalculatorPage() {
  const [intelligence, defaultForecast] = await Promise.all([
    getIntelligenceDashboardData(),
    generatePersonalForecast({
      embassy: "Islamabad",
      waitingListJoinedDate: new Date("2026-04-01T00:00:00Z"),
    }),
  ]);

  const queueOverview = adaptQueueOverview(intelligence);

  return (
    <div className="space-y-4">
      <TimelineCalculator initialForecast={defaultForecast} />
      <QueueOverview data={queueOverview} />
    </div>
  );
}
