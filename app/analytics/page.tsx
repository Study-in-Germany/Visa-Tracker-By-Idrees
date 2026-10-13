"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import PeriodFilters from "@/components/PeriodFilters";
import StatusBar from "@/components/charts/StatusBar";
import RankList from "@/components/charts/RankList";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { useAnalytics } from "@/hooks/useAnalytics";
import { usePeriod } from "@/hooks/usePeriod";
import { describePeriod } from "@/lib/dates";
import { periodParams } from "@/lib/period";
import { VISA_STATUS_HEX, VISA_STATUS_LABELS, VISA_STATUS_ORDER } from "@/lib/constants";

const MonthlyArea = dynamic(() => import("@/components/charts/MonthlyArea"), {
  ssr: false,
  loading: () => <div className="h-[150px] animate-pulse rounded bg-paper-sunk" aria-hidden="true" />,
});

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
const dayText = (v: number | null) => (v === null ? "—" : `${v} d`);

function AnalyticsInner() {
  const [period, setPeriod] = usePeriod();
  const [consulate, setConsulate] = useState("");
  const { data, error, loading, reload } = useAnalytics(period, consulate);
  const first = loading && !data;
  const empty = data !== null && data.total === 0;

  const qs = periodParams(period);
  if (consulate) qs.set("consulate", consulate);
  const trackerHref = `/tracker${qs.toString() ? `?${qs}` : ""}`;

  const total = data?.total ?? 0;
  const withdrawn = data?.statusCounts.WITHDRAWN ?? 0;
  const decided = data ? data.visaIssued + data.visaRejected : 0;
  const stages = [
    { label: "Waiting list → invitation", v: data?.processing.avgWaitingToSubmission ?? null },
    { label: "Documents → appointment", v: data?.processing.avgSubmissionToAppointment ?? null },
    { label: "Appointment → decision", v: data?.processing.avgAppointmentToDecision ?? null },
  ];
  const endToEnd = stages.every((s) => s.v !== null) ? stages.reduce((sum, s) => sum + (s.v as number), 0) : null;
  const statusRows = data ? VISA_STATUS_ORDER.filter((k) => (data.statusCounts[k] ?? 0) > 0).map((k) => ({ k, n: data.statusCounts[k] })) : [];

  return (
    <>
      <PageHeader
        title="Analytics"
        description={`Admin-approved community entries · ${describePeriod(period)}${consulate ? ` · ${consulate}` : ""}. Not official consulate statistics.`}
        actions={
          <PeriodFilters period={period} onPeriod={setPeriod} consulate={consulate} onConsulate={setConsulate} />
        }
      />

      {error && !data ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : empty ? (
        <div className="card"><EmptyState title="No entries in this period" hint="Try a wider date range or a different consulate." /></div>
      ) : (
        <div className={`grid items-stretch gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3 ${loading && data ? "opacity-60" : ""}`}>
          {/* 1 — volume */}
          <MetricCard title="Applicants" value={total.toLocaleString("en-US")} pill={data ? `${data.activeApplicants} active` : undefined} action={{ label: "View entries", href: trackerHref }} loading={first}>
            {data && data.monthlyVolume.length > 0 ? (
              <MonthlyArea data={data.monthlyVolume} series={[{ key: "count", label: "Joined", color: "#b5532f" }]} />
            ) : (
              <EmptyState title="No waiting-list dates yet" />
            )}
            <ul className="mt-3 divide-y divide-line border-t border-line text-sm">
              {data?.consulateComparison.map((c) => (
                <li key={c.consulate} className="flex items-center justify-between py-2">
                  <span>{c.consulate}</span>
                  <span className="flex items-center gap-3 tabular-nums">
                    <span className="text-mute">{c.issued} issued</span>
                    <span className="w-8 text-right font-medium">{c.total}</span>
                  </span>
                </li>
              ))}
            </ul>
          </MetricCard>

          {/* 2 — outcomes */}
          <MetricCard title="Decided cases" value={decided > 0 ? `${pct(data!.visaIssued, decided)}% issued` : "—"} pill={decided > 0 ? `${decided} decided` : "none yet"} pillTone={decided > 0 ? "good" : "neutral"} loading={first}>
            <div className="grid grid-cols-3 gap-3 border-t border-line pt-4">
              {[
                { label: "Issued", n: data?.visaIssued ?? 0, color: "bg-emerald-500" },
                { label: "Rejected", n: data?.visaRejected ?? 0, color: "bg-red-500" },
                { label: "Withdrawn", n: withdrawn, color: "bg-ochre-500" },
              ].map((c) => (
                <div key={c.label} className="flex flex-col">
                  <span className="text-xs text-mute">{c.label}</span>
                  <span className="mt-1 text-xl font-semibold tabular-nums">{pct(c.n, total)}%</span>
                  <span className="text-xs text-mute">{c.n} {c.n === 1 ? "case" : "cases"}</span>
                  <span className={`mt-auto pt-6`}>
                    <span className={`block h-1.5 rounded-full ${c.color}`} style={{ width: `${Math.max(6, pct(c.n, total))}%` }} />
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-auto pt-5 text-xs text-mute">Shares are of all {total.toLocaleString("en-US")} applicants in this period.</p>
          </MetricCard>

          {/* 3 — waiting time */}
          <MetricCard title="Typical total wait" value={endToEnd === null ? "—" : `${endToEnd} days`} pill="sum of stage averages" loading={first}>
            <ul className="space-y-2 border-t border-line pt-3 text-sm">
              {stages.map((s) => (
                <li key={s.label} className="flex items-center justify-between">
                  <span>{s.label}</span>
                  <span className="font-medium tabular-nums">{dayText(s.v)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              {data && data.monthlyOutcomes.length > 0 ? (
                <MonthlyArea
                  data={data.monthlyOutcomes}
                  series={[
                    { key: "issued", label: "Issued", color: "#2f7d57" },
                    { key: "rejected", label: "Rejected", color: "#b3372f" },
                  ]}
                  height={120}
                />
              ) : (
                <p className="rounded-lg bg-paper-sunk px-3 py-4 text-center text-xs text-mute">Decisions by month appear once outcomes are recorded.</p>
              )}
            </div>
          </MetricCard>

          {/* 4 — pipeline */}
          <MetricCard title="Still in the queue" value={`${pct(data?.activeApplicants ?? 0, total)}%`} pill={`${data?.activeApplicants ?? 0} cases`} pillTone="warn" action={{ label: "Details", href: trackerHref }} loading={first}>
            {data && <StatusBar counts={data.statusCounts} hideLegend />}
            <table className="mt-4 w-full border-t border-line text-sm">
              <thead>
                <tr className="text-left text-xs text-mute">
                  <th className="py-2 font-normal">Status</th>
                  <th className="py-2 text-right font-normal">Share</th>
                  <th className="py-2 text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody>
                {statusRows.map((r) => (
                  <tr key={r.k}>
                    <td className="py-1.5">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: VISA_STATUS_HEX[r.k] }} />
                      {VISA_STATUS_LABELS[r.k]}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-mute">{pct(r.n, total)}%</td>
                    <td className="py-1.5 text-right font-medium tabular-nums">{r.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MetricCard>

          {/* 5 — universities */}
          <MetricCard title="Top universities" value={data?.topUniversities[0]?.university ?? "—"} pill={data?.topUniversities.length ? `Top ${data.topUniversities.length}` : undefined} loading={first}>
            <div className="border-t border-line pt-4">
              {data && data.topUniversities.length > 0 ? (
                <RankList rows={data.topUniversities.map((u) => ({ label: u.university, value: u.count }))} />
              ) : (
                <EmptyState title="No universities listed" />
              )}
            </div>
          </MetricCard>

          {/* 6 — consulates */}
          <MetricCard title="By consulate" value={data ? `${data.consulateComparison.length} ${data.consulateComparison.length === 1 ? "office" : "offices"}` : "—"} loading={first}>
            <div className="space-y-4 border-t border-line pt-4">
              {data?.consulateComparison.map((c) => (
                <div key={c.consulate}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium">{c.consulate}</span>
                    <span className="text-xs text-mute">{c.total} applicants · {c.issued} issued · {c.rejected} rejected</span>
                  </div>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    {[
                      ["Invite", c.avgWaitingToSubmission],
                      ["Appointment", c.avgSubmissionToAppointment],
                      ["Decision", c.avgAppointmentToDecision],
                    ].map(([label, v]) => (
                      <div key={label as string} className="rounded-lg bg-paper-sunk px-2.5 py-2">
                        <dt className="text-mute">{label}</dt>
                        <dd className="mt-0.5 text-sm font-semibold tabular-nums">{dayText(v as number | null)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
              <p className="text-xs text-mute">Average days to each stage.</p>
            </div>
          </MetricCard>
        </div>
      )}
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading analytics" />}>
      <AnalyticsInner />
    </Suspense>
  );
}
