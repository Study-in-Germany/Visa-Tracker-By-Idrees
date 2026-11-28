"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfidenceBars from "@/components/data-display/ConfidenceBars";
import Sparkline from "@/components/data-display/Sparkline";
import StatusBadge from "@/components/StatusBadge";
import MilestoneEditor from "@/components/tracker/MilestoneEditor";
import { Chip } from "@/components/ui/Chip";
import Icon from "@/components/ui/Icon";
import Panel from "@/components/ui/Panel";
import { DashboardPageSkeleton } from "@/components/ui/Skeletons";
import StatCard from "@/components/ui/StatCard";
import { ErrorState } from "@/components/ui/States";
import TransitJourneySkeleton from "@/components/visa/journey/TransitJourneySkeleton";
import TransitVisaJourney from "@/components/visa/journey/TransitVisaJourney";
import { invalidateApi, useApi } from "@/hooks/useApi";
import { useSession } from "@/hooks/useSession";
import { adaptDashboardKpis, adaptTransitJourney } from "@/lib/analytics/adapters";
import { ACTIVE_STATUSES, APPROVAL_COLORS, APPROVAL_LABELS, JOURNEY_STAGES } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import type { PersonalForecastResult } from "@/lib/forecasting/types";

const DAY = 86_400_000;
const daysBetween = (a: string, b: string | Date) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY));

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-1.5 last:border-0">
      <dt className="shrink-0 text-mute">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">
        {value || <span className="font-normal text-mute">—</span>}
      </dd>
    </div>
  );
}

export default function MyJourneyPage() {
  const router = useRouter();
  const session = useSession();
  const { data, error, loading, reload } = useApi<{ applicant: any }>("/api/applicant/me");
  const hasWaitingListDate = Boolean(data?.applicant?.waitingListDate);
  const {
    data: fcData,
    error: fcError,
    loading: fcLoading,
    reload: reloadForecast,
  } = useApi<{
    forecast?: PersonalForecastResult;
    progressionHistory?: { date: string; frontierDate: string; frontierMs?: number }[];
    missingWaitingListDate?: boolean;
  }>(hasWaitingListDate ? "/api/applicant/me/forecast" : null);

  useEffect(() => {
    if (error?.status === 401) router.push("/login");
  }, [error, router]);

  if (loading && !data) return <DashboardPageSkeleton />;
  if (error) return <div className="card"><ErrorState error={error} onRetry={reload} /></div>;
  const a = data?.applicant;
  if (!a) return null;

  const forecast = fcData?.forecast ?? null;
  const fcPending = hasWaitingListDate && fcLoading && !forecast && !fcError;
  const stages = JOURNEY_STAGES.map((s) => ({ ...s, date: a[s.key] as string | null }));
  const done = stages.filter((s) => s.date).length;
  const active = ACTIVE_STATUSES.includes(a.visaStatus);
  const waitingDays = a.waitingListDate
    ? daysBetween(a.waitingListDate, active ? new Date() : a.decisionDate || new Date())
    : null;

  const kpis = adaptDashboardKpis(a, forecast, fcData?.progressionHistory ?? [], {
    active,
    waitingDays,
    hasWaitingListDate,
    forecastError: Boolean(fcError),
  });

  const journeyView = forecast ? adaptTransitJourney(forecast, a) : null;

  const handleMilestoneSaved = () => {
    invalidateApi("/api/applicant/me");
    invalidateApi("/api/applicant/me/forecast");
    invalidateApi("/api/intelligence");
    invalidateApi("/api/session");
    session.refresh();
    reload();
    reloadForecast();
  };

  const scenarioAction = (
    <Link href="/calculator" className="btn-secondary !min-h-[30px] text-xs">
      <Icon name="calculator" size={13} /> Scenario calculator
    </Link>
  );

  return (
    <div className="space-y-3">
      {/* 1. Existing statistics cards with clean internal visuals (outer design preserved) */}
      <section aria-label="Journey summary" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          icon="clock"
          format="days"
          label={kpis.waitingTime.label}
          value={kpis.waitingTime.days}
          hint={kpis.waitingTime.secondary}
        />
        <StatCard
          icon="queue"
          label={kpis.queueFrontier.label}
          value={kpis.queueFrontier.value}
          hint={kpis.queueFrontier.secondary}
          sparkline={
            kpis.queueFrontier.sparklinePoints.length >= 3 ? (
              <Sparkline
                points={kpis.queueFrontier.sparklinePoints}
                width={76}
                height={26}
                ariaLabel="Queue frontier movement over time"
              />
            ) : undefined
          }
          loading={fcPending}
        />
        <StatCard
          icon="calendar"
          label={kpis.nextMilestone.label}
          value={kpis.nextMilestone.value}
          hint={kpis.nextMilestone.secondary}
          loading={fcPending}
        />
        <StatCard
          icon="shield"
          label={kpis.confidence.label}
          value={kpis.confidence.value}
          hint={kpis.confidence.secondary}
          sparkline={
            forecast ? (
              <ConfidenceBars
                bars={kpis.confidence.bars}
                label={`Forecast confidence: ${kpis.confidence.value}`}
              />
            ) : undefined
          }
          loading={fcPending}
        />
      </section>

      {/* 2. Connected transit map personal visa journey */}
      {fcPending ? (
        <TransitJourneySkeleton />
      ) : !hasWaitingListDate || fcData?.missingWaitingListDate ? (
        <Panel
          title="Your visa journey"
          description="Add your waiting-list joining date below to generate a personalized estimate."
          actions={scenarioAction}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-line-strong bg-paper-sunk px-4 py-3 text-xs">
            <span className="text-ink-700">Waiting-list joining date is not set on your record yet.</span>
            <MilestoneEditor
              milestone="waitingListDate"
              label="Waiting List"
              date={a.waitingListDate}
              onSaved={handleMilestoneSaved}
            />
          </div>
        </Panel>
      ) : fcError ? (
        <Panel title="Your visa journey" actions={scenarioAction}>
          <ErrorState error={fcError} onRetry={reloadForecast} />
        </Panel>
      ) : journeyView ? (
        <TransitVisaJourney
          data={journeyView}
          onMilestoneSaved={handleMilestoneSaved}
        />
      ) : (
        <Panel title="Your visa journey" actions={scenarioAction}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-line-strong bg-paper-sunk px-4 py-3 text-xs">
            <span className="text-ink-700">Not enough cohort data to generate an estimate yet.</span>
            <button type="button" onClick={reloadForecast} className="btn-secondary !min-h-[30px] text-xs">
              Retry
            </button>
          </div>
        </Panel>
      )}

      {/* 3, 4 & 5. Actual milestone management, Profile & visibility, Status history */}
      <div className="grid items-start gap-3 lg:grid-cols-12">
        <Panel
          title="Update actual milestones"
          description="Recording a milestone immediately updates your remaining estimate."
          className="lg:col-span-6"
          actions={<span className="text-[11px] font-semibold tabular-nums text-mute">{done} recorded</span>}
        >
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {stages.map((s) => (
              <li
                key={s.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-paper-sunk/60 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink-900">{s.label}</p>
                  <p className={`text-[11px] tabular-nums ${s.date ? "text-emerald-700 dark:text-emerald-400" : "text-mute"}`}>
                    {s.date ? fmtDate(s.date) : "Not recorded"}
                  </p>
                </div>
                <MilestoneEditor milestone={s.key} label={s.label} date={s.date} onSaved={handleMilestoneSaved} />
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-3 lg:col-span-3">
          <Panel
            title="Profile & visibility"
            actions={
              <Link href="/dashboard/information" className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                Edit details
              </Link>
            }
          >
            <dl className="text-xs">
              <Detail label="University" value={a.university} />
              <Detail label="Program" value={a.program} />
              <Detail label="Intake" value={a.intake} />
              <Detail label="Embassy" value={a.consulate} />
              <Detail label="Name" value={a.isAnonymous ? "Hidden publicly" : "Shown publicly"} />
            </dl>
            <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2 text-xs">
              <span className="text-mute">Review</span>
              <Chip className={APPROVAL_COLORS[a.approval]}>{APPROVAL_LABELS[a.approval] || a.approval}</Chip>
            </div>
            {a.approval === "APPROVED" && (
              <Link href={`/tracker/${a.publicId}`} className="btn-secondary mt-2.5 w-full !min-h-[32px] text-xs">
                Public page <Icon name="external" size={12} />
              </Link>
            )}
          </Panel>
        </div>

        <Panel
          title="Status history"
          className="lg:col-span-3"
          actions={
            <Link href="/dashboard/updates" className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
              All ({a.history?.length ?? 0})
            </Link>
          }
        >
          {a.history?.length ? (
            <ul className="divide-y divide-line text-xs">
              {a.history.slice(-4).reverse().map((h: any) => (
                <li key={h.id} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={h.visaStatus} />
                    <span className="shrink-0 text-[11px] tabular-nums text-mute">{fmtDate(h.occurredAt)}</span>
                  </div>
                  {h.note && <p className="mt-1 truncate text-[11px] text-mute">{h.note}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-mute">No status updates logged yet.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
