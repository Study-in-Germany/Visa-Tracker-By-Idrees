"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import QueueProgressChart from "@/components/forecasting/QueueProgressChart";
import PeriodFilters from "@/components/PeriodFilters";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import { ChartsSkeleton, QueueOverviewSkeleton } from "@/components/ui/Skeletons";
import StatCard from "@/components/ui/StatCard";
import { EmptyState, ErrorState } from "@/components/ui/States";
import QueueOverview from "@/components/visa/queue/QueueOverview";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useApi } from "@/hooks/useApi";
import { usePeriod } from "@/hooks/usePeriod";
import { adaptQueueOverview, type IntelligencePayloadLike } from "@/lib/analytics/adapters";
import type { EmbassyIntelligenceReport } from "@/lib/forecasting/forecast-service";

const MonthlyBars = dynamic(() => import("@/components/charts/MonthlyBars"), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse rounded-lg bg-paper-sunk" aria-hidden="true" />,
});

function QueueInner() {
  const [period, setPeriod] = usePeriod();
  const [consulate, setConsulate] = useState("");
  const { data, error, loading, reload } = useAnalytics(period, consulate);
  const intel = useApi<
    IntelligencePayloadLike & {
      embassies: { Islamabad: EmbassyIntelligenceReport; Karachi: EmbassyIntelligenceReport };
    }
  >("/api/intelligence");
  const first = loading && !data;

  const queueOverview = intel.data ? adaptQueueOverview(intel.data) : null;

  return (
    <>
      <PageHeader
        title="Queue progress"
        actions={<PeriodFilters period={period} onPeriod={setPeriod} consulate={consulate} onConsulate={setConsulate} />}
      />

      {error && !data ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : (
        <div className={`space-y-4 transition-opacity ${loading && data ? "opacity-60" : ""}`}>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard variant="wide" format="days" icon="hourglass" label="Waiting list → invitation" value={data?.processing.avgWaitingToSubmission} loading={first} />
            <StatCard variant="wide" format="days" icon="send" label="Documents → appointment" value={data?.processing.avgSubmissionToAppointment} loading={first} />
            <StatCard variant="wide" format="days" icon="calendar" label="Appointment → decision" value={data?.processing.avgAppointmentToDecision} loading={first} />
          </section>

          {queueOverview ? <QueueOverview data={queueOverview} /> : intel.loading ? <QueueOverviewSkeleton /> : null}

          {intel.data && (
            <Panel title="Islamabad queue progression history" description="Cohort dates receiving submission & appointment invitations over time">
              <QueueProgressChart data={intel.data.embassies.Islamabad.progressionHistory} />
            </Panel>
          )}

          <Panel title="New waiting-list joins" description="Applicants per month">
            {data && data.monthlyVolume.length > 0 ? (
              <MonthlyBars data={data.monthlyVolume} series={[{ key: "count", label: "Applicants", color: "#2563eb" }]} height={280} />
            ) : first ? (
              <div className="h-[280px] animate-pulse rounded-lg bg-paper-sunk" aria-hidden="true" />
            ) : (
              <EmptyState title="No waiting-list dates in this period" hint="Try a wider date range." />
            )}
          </Panel>

          <p className="text-xs text-ink-600">Community-submitted entries paired with validated historical checkpoints.</p>
        </div>
      )}
    </>
  );
}

export default function QueueProgressPage() {
  return (
    <Suspense fallback={<ChartsSkeleton />}>
      <QueueInner />
    </Suspense>
  );
}
