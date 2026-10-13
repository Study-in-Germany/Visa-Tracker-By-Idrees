"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import PeriodFilters from "@/components/PeriodFilters";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { useAnalytics } from "@/hooks/useAnalytics";
import { usePeriod } from "@/hooks/usePeriod";
import { describePeriod } from "@/lib/dates";

const MonthlyBars = dynamic(() => import("@/components/charts/MonthlyBars"), {
  ssr: false,
  loading: () => <LoadingBlock label="Loading chart" rows={1} />,
});

function QueueInner() {
  const [period, setPeriod] = usePeriod();
  const [consulate, setConsulate] = useState("");
  const { data, error, loading, reload } = useAnalytics(period, consulate);
  const first = loading && !data;

  return (
    <>
      <PageHeader
        eyebrow="Queue progress"
        title="Stage by stage"
        description={`How long each step is taking · ${describePeriod(period)}${consulate ? ` · ${consulate}` : ""}.`}
        actions={<PeriodFilters period={period} onPeriod={setPeriod} consulate={consulate} onConsulate={setConsulate} />}
      />

      {error && !data ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : (
        <div className={`space-y-4 transition-opacity ${loading && data ? "opacity-60" : ""}`}>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard variant="wide" format="days" icon="hourglass" tone="warn" label="Waiting list → invitation" value={data?.processing.avgWaitingToSubmission} loading={first} />
            <StatCard variant="wide" format="days" icon="send" tone="sage" label="Documents → appointment" value={data?.processing.avgSubmissionToAppointment} loading={first} />
            <StatCard variant="wide" format="days" icon="calendar" tone="good" label="Appointment → decision" value={data?.processing.avgAppointmentToDecision} loading={first} />
          </section>

          <Panel title="New waiting-list joins" description="Applicants per month">
            {data && data.monthlyVolume.length > 0 ? (
              <MonthlyBars data={data.monthlyVolume} series={[{ key: "count", label: "Applicants", color: "#4a6350" }]} height={300} />
            ) : first ? (
              <LoadingBlock rows={1} />
            ) : (
              <EmptyState title="No waiting-list dates in this period" hint="Try a wider date range." />
            )}
          </Panel>

          <p className="text-xs text-ink-600">Based on community-submitted, admin-approved entries. Averages only include entries with both dates filled in.</p>
        </div>
      )}
    </>
  );
}

export default function QueueProgressPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <QueueInner />
    </Suspense>
  );
}
