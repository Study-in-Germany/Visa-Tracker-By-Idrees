"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import Accordion, { AccordionItem } from "@/components/ui/Accordion";
import { Skeleton } from "@/components/ui/States";
import { useSession } from "@/hooks/useSession";

const EstimatorCharts = dynamic(() => import("@/components/estimator/EstimatorCharts"), {
  ssr: false,
  loading: () => (
    <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Skeleton className="h-80 rounded-lg" />
      <Skeleton className="h-80 rounded-lg" />
    </div>
  ),
});

interface SpeedSummary {
  lastWeekClearedDays: number;
  last4WeeksAvgDaysPerWeek: number;
  sixMonthsAvgDaysPerWeek: number;
  recentObservedWaitDays: number;
  speedComparison: "faster" | "slower" | "steady" | "insufficient";
  speedComparisonText: string;
}

interface WeeklyProgressPoint {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  daysAdvanced: number;
  invitationsObserved: number;
  frontierDate: string;
  isLatest: boolean;
}

interface MonthlyWaitTimePoint {
  monthKey: string;
  monthLabel: string;
  medianWaitDays: number;
  avgWaitDays: number;
  p25WaitDays: number;
  p75WaitDays: number;
  completedCount: number;
}

interface ConsulateStats {
  consulate: "Islamabad" | "Karachi";
  totalRecords: number;
  usableInvitesCount: number;
  activeWaitingCount: number;
  observedFrontierDate: string;
  latestDataUpdate: string;
  dataQuality: "HIGH" | "MEDIUM" | "LIMITED";
  speedSummary: SpeedSummary;
  weeklyProgress: WeeklyProgressPoint[];
  monthlyWaitTimes: MonthlyWaitTimePoint[];
  backtest: {
    maeDays: number;
    coverage50Percent: number;
    coverage80Percent: number;
    sampleSize: number;
  };
}

interface PredictionData {
  consulate: "Islamabad" | "Karachi";
  userWaitingListDate: string;
  observedFrontierDate: string;
  status: "NORMAL" | "FRONTIER_REACHED" | "INSUFFICIENT_DATA";
  bestEstimatedDate: string;
  likelyWindow50: { from: string; to: string };
  widerWindow80: { from: string; to: string };
  estimatedRemainingDays: number;
  estimatedRemainingMonths: number;
  estimatedTotalWaitDays: number;
  estimatedTotalWaitMonths: number;
  usableRecords: number;
  latestDataUpdate: string;
  confidence: "High" | "Medium" | "Cautious";
  explanation: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(`${dateStr}T00:00:00Z`);
    return d.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

export default function VisaEstimatorPage() {
  const session = useSession();
  const [consulate, setConsulate] = useState<"Islamabad" | "Karachi">("Islamabad");
  const [waitingListDate, setWaitingListDate] = useState<string>("");
  const [stats, setStats] = useState<ConsulateStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [predicting, setPredicting] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileDateAvailable, setProfileDateAvailable] = useState<string | null>(null);

  useEffect(() => {
    if (session.signedIn && session.role === "applicant") {
      fetch("/api/applicant/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const app = data?.applicant;
          if (app?.waitingListDate) {
            const d = app.waitingListDate.slice(0, 10);
            setProfileDateAvailable(d);
            if (app.consulate === "Karachi" || app.consulate === "Islamabad") {
              setConsulate(app.consulate);
            }
          }
        })
        .catch(() => {});
    }
  }, [session.signedIn, session.role]);

  useEffect(() => {
    let active = true;
    setLoadingStats(true);
    setError(null);

    fetch(`/api/estimator?consulate=${consulate}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load consulate statistics.");
        return res.json();
      })
      .then((data) => {
        if (active) {
          setStats(data);
          setLoadingStats(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setLoadingStats(false);
        }
      });

    return () => {
      active = false;
    };
  }, [consulate]);

  const handleUseProfileDate = () => {
    if (profileDateAvailable) setWaitingListDate(profileDateAvailable);
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitingListDate) {
      setError("Please select your waiting-list registration date.");
      return;
    }

    setPredicting(true);
    setError(null);

    try {
      const res = await fetch("/api/estimator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consulate, date: waitingListDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Estimation failed.");
      setPrediction(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while calculating estimate.");
    } finally {
      setPredicting(false);
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const faqAccordionItems: AccordionItem[] = [
    {
      id: "faq-variance",
      title: "Why did another applicant with a later date receive an invitation before me?",
      subtitle: "Caseworker assignment and degree category variances",
      badge: "Pacing",
      badgeVariant: "neutral",
      defaultOpen: true,
      content: (
        <p className="pt-1 text-xs leading-relaxed text-mute">
          Screening is handled in parallel by multiple consular caseworkers at the embassy. Degree category,
          verification requirements, and seasonal surges can cause non-linear issuance variance. The frontier
          reflects verified median progression.
        </p>
      ),
    },
    {
      id: "faq-frequency",
      title: "How often is the statistical model updated?",
      subtitle: "Continuous automated recalculation",
      badge: "Automation",
      badgeVariant: "neutral",
      content: (
        <p className="pt-1 text-xs leading-relaxed text-mute">
          Forecasting parameters and velocity windows update as new community submissions and invitation
          confirmations are approved in the tracker database.
        </p>
      ),
    },
    {
      id: "faq-support",
      title: "How can I help improve estimate accuracy?",
      subtitle: "Community verification loop",
      badge: "Community",
      badgeVariant: "neutral",
      content: (
        <div className="space-y-2 pt-1 text-xs leading-relaxed text-mute">
          <p>
            When you receive your document submission invitation or booking notice, update your entry on the tracker.
            Every verified observation strengthens the dataset.
          </p>
          <Link href="/submit" className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline">
            <span>Submit or update your entry</span>
            <Icon name="arrowRight" size={12} />
          </Link>
        </div>
      ),
    },
  ];

  const methodologyAccordionItems: AccordionItem[] = [
    {
      id: "meth-details",
      title: "Simulation Model & Mathematical Principles",
      subtitle: "10,000 Monte Carlo bootstrap iterations",
      badge: "Methodology",
      badgeVariant: "default",
      defaultOpen: true,
      content: (
        <div className="space-y-3 pt-1 text-xs leading-relaxed text-ink-800">
          <p className="text-mute">
            The estimator simulates queue progression using a non-parametric Monte Carlo bootstrapping model
            configured with 10,000 iterations:
          </p>
          <ul className="list-inside list-disc space-y-1 text-mute">
            <li>Separates Islamabad and Karachi consular queues completely.</li>
            <li>Rejects anomalous date sequences and self-reported duplicate outliers.</li>
            <li>Calculates the robust observed frontier (95th percentile).</li>
            <li>Factors in zero-progress holiday/maintenance weeks.</li>
            <li>Produces empirical 50% (P25-P75) and 80% (P10-P90) confidence intervals.</li>
          </ul>
          <div className="flex justify-between border-t border-line pt-2 text-xs text-mute">
            <span>Historical Backtest MAE:</span>
            <strong className="tabular-nums text-ink-900">±{stats?.backtest.maeDays ?? 18} days</strong>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Visa Invitation Estimator"
        description="Statistical forecast of Consular Services Portal screening invitations based on community-submitted records (unofficial)."
        actions={
          <div className="flex items-center gap-2 rounded-md border border-line bg-paper-raised px-2.5 py-1 text-xs text-mute">
            <Icon name="pulse" size={13} className="text-blue-600" />
            <span>Dataset updated: {stats?.latestDataUpdate ? formatDate(stats.latestDataUpdate) : "Recent"}</span>
          </div>
        }
      />

      <div className="mb-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="card space-y-5 p-5 lg:col-span-5">
          <div className="space-y-1">
            <span className="eyebrow">Forecast parameters</span>
            <h2 className="text-[16px] font-semibold text-ink-900">Calculate estimated invitation</h2>
            <p className="text-xs text-mute">
              Enter your waiting-list registration date to simulate your invitation window.
            </p>
          </div>

          <form onSubmit={handleCalculate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="label">Embassy / Consulate</label>
              <div className="grid grid-cols-2 gap-2">
                {(["Islamabad", "Karachi"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setConsulate(c);
                      setPrediction(null);
                    }}
                    className={`cursor-pointer rounded-md border px-3 py-2 text-center text-xs font-medium transition-colors ${
                      consulate === c
                        ? "border-ink-800 bg-ink-800 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                        : "border-line bg-paper-raised text-ink-700 hover:bg-paper-sunk"
                    }`}
                  >
                    {c === "Islamabad" ? "Islamabad Embassy" : "Karachi Consulate"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="label">Waiting-list registration date</label>
                {profileDateAvailable && (
                  <button
                    type="button"
                    onClick={handleUseProfileDate}
                    className="text-[11px] font-medium text-blue-600 hover:underline"
                  >
                    Use profile date ({formatDate(profileDateAvailable)})
                  </button>
                )}
              </div>
              <input
                type="date"
                max={todayStr}
                value={waitingListDate}
                onChange={(e) => setWaitingListDate(e.target.value)}
                className="input text-xs font-medium"
                required
              />
              <p className="text-[11px] text-mute">
                Exact date your waiting-list confirmation was recorded.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={predicting || loadingStats}
              className="btn-primary flex w-full cursor-pointer items-center justify-center gap-2 py-2 text-xs font-medium"
            >
              {predicting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Simulating 10,000 outcomes…</span>
                </>
              ) : (
                <>
                  <Icon name="chart" size={14} />
                  <span>Calculate estimate</span>
                </>
              )}
            </button>
          </form>

          <div className="space-y-1.5 rounded-md border border-line bg-paper-raised p-3 text-xs">
            <div className="flex justify-between text-mute">
              <span>Observed {consulate} frontier:</span>
              <strong className="font-semibold tabular-nums text-ink-900">
                {stats ? formatDate(stats.observedFrontierDate) : "Loading…"}
              </strong>
            </div>
            <div className="flex justify-between text-mute">
              <span>Verified timeline records:</span>
              <span className="font-semibold tabular-nums text-ink-900">{stats?.usableInvitesCount ?? 0}</span>
            </div>
            <div className="flex justify-between text-mute">
              <span>Sample quality:</span>
              <span className="font-semibold text-ink-900">{stats?.dataQuality ?? "MEDIUM"}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:col-span-7">
          {prediction ? (
            <div className="card space-y-5 border-line-strong p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div>
                  <span className="eyebrow">{prediction.consulate} prediction</span>
                  <h3 className="mt-0.5 text-[15px] font-semibold text-ink-900">
                    Estimated screening invitation window
                  </h3>
                </div>
                <span className="badge border-line bg-paper-raised text-ink-800">
                  {prediction.confidence} Confidence
                </span>
              </div>

              {prediction.status === "FRONTIER_REACHED" ? (
                <div className="space-y-2 rounded-md border border-line bg-paper-raised p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                    <Icon name="checkCircle" size={16} className="text-emerald-600" />
                    <span>Frontier reached or surpassed</span>
                  </div>
                  <p className="text-xs leading-relaxed text-mute">
                    The observed invitation frontier for {prediction.consulate} is around{" "}
                    <strong className="text-ink-900">{formatDate(prediction.observedFrontierDate)}</strong>, which matches or precedes your
                    registration date ({formatDate(prediction.userWaitingListDate)}).
                  </p>
                  <p className="text-[11px] leading-relaxed text-mute">
                    Monitor your email inbox, spam folder, and the Consular Services Portal.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 rounded-md border border-line bg-paper-raised p-4">
                  <span className="block text-xs text-mute">Best estimated invitation date</span>
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span className="text-2xl font-semibold tabular-nums text-ink-900">
                      {formatDate(prediction.bestEstimatedDate)}
                    </span>
                    <span className="text-xs text-mute">(Median simulation outcome)</span>
                  </div>
                  <p className="text-xs text-mute tabular-nums">
                    Estimated remaining wait:{" "}
                    <strong className="text-ink-900">~{prediction.estimatedRemainingDays} days</strong> (≈{" "}
                    <strong className="text-ink-900">{prediction.estimatedRemainingMonths} months</strong>)
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1 rounded-md border border-line bg-paper-raised p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-900">Likely window (50%)</span>
                    <span className="text-[10px] font-medium text-mute">P25 – P75</span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-ink-900">
                    {formatDate(prediction.likelyWindow50.from)} – {formatDate(prediction.likelyWindow50.to)}
                  </p>
                  <p className="text-[11px] text-mute">50% of simulated outcomes fall within this range.</p>
                </div>

                <div className="space-y-1 rounded-md border border-line bg-paper-raised p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-900">Wider window (80%)</span>
                    <span className="text-[10px] font-medium text-mute">P10 – P90</span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-ink-900">
                    {formatDate(prediction.widerWindow80.from)} – {formatDate(prediction.widerWindow80.to)}
                  </p>
                  <p className="text-[11px] text-mute">Accounts for potential operational slowdowns.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                <div className="rounded-md border border-line bg-paper-raised p-2.5">
                  <span className="block text-[10px] uppercase text-mute">Total wait</span>
                  <strong className="text-sm font-semibold tabular-nums text-ink-900">{prediction.estimatedTotalWaitMonths} mos</strong>
                </div>
                <div className="rounded-md border border-line bg-paper-raised p-2.5">
                  <span className="block text-[10px] uppercase text-mute">Sample size</span>
                  <strong className="text-sm font-semibold tabular-nums text-ink-900">{prediction.usableRecords} invites</strong>
                </div>
                <div className="rounded-md border border-line bg-paper-raised p-2.5">
                  <span className="block text-[10px] uppercase text-mute">Model error</span>
                  <strong className="text-sm font-semibold tabular-nums text-ink-900">±{stats?.backtest.maeDays ?? 18} days</strong>
                </div>
              </div>

              <p className="border-t border-line pt-2.5 text-[11px] leading-relaxed text-mute">
                <strong>Disclaimer:</strong> {prediction.explanation} Community estimate only — not an official consular booking date.
              </p>
            </div>
          ) : (
            <div className="card flex flex-1 flex-col items-center justify-center space-y-2.5 border-dashed bg-paper-raised p-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-paper-sunk text-mute">
                <Icon name="chart" size={18} />
              </div>
              <h4 className="text-sm font-semibold text-ink-900">Enter your registration date</h4>
              <p className="max-w-sm text-xs leading-relaxed text-mute">
                Select an embassy and waiting-list registration date to simulate expected invitation dates from observed history.
              </p>
            </div>
          )}
        </div>
      </div>

      <section className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
          <div>
            <span className="eyebrow">Operational pacing</span>
            <h3 className="mt-0.5 text-[16px] font-semibold text-ink-900">
              {consulate} queue movement
            </h3>
          </div>
          {stats?.speedSummary && (
            <span className="rounded-md border border-line bg-paper-raised px-2.5 py-1 text-xs text-mute">
              {stats.speedSummary.speedComparisonText}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card space-y-1 p-4">
            <span className="text-xs font-medium text-mute">Last completed week</span>
            <p className="text-xl font-semibold tabular-nums text-ink-900">
              {stats?.speedSummary.lastWeekClearedDays ?? 0}{" "}
              <span className="text-xs font-normal text-mute">days cleared</span>
            </p>
            <p className="text-[11px] text-mute">Queue advanced last completed week</p>
          </div>
          <div className="card space-y-1 p-4">
            <span className="text-xs font-medium text-mute">4-week rolling average</span>
            <p className="text-xl font-semibold tabular-nums text-ink-900">
              ~{stats?.speedSummary.last4WeeksAvgDaysPerWeek ?? 0}{" "}
              <span className="text-xs font-normal text-mute">days / week</span>
            </p>
            <p className="text-[11px] text-mute">Recent 28-day clearing velocity</p>
          </div>
          <div className="card space-y-1 p-4">
            <span className="text-xs font-medium text-mute">6-month baseline</span>
            <p className="text-xl font-semibold tabular-nums text-ink-900">
              ~{stats?.speedSummary.sixMonthsAvgDaysPerWeek ?? 0}{" "}
              <span className="text-xs font-normal text-mute">days / week</span>
            </p>
            <p className="text-[11px] text-mute">Long-term medium pace reference</p>
          </div>
          <div className="card space-y-1 p-4">
            <span className="text-xs font-medium text-mute">Recent observed wait</span>
            <p className="text-xl font-semibold tabular-nums text-ink-900">
              ~{stats?.speedSummary.recentObservedWaitDays ?? 0}{" "}
              <span className="text-xs font-normal text-mute">days</span>
            </p>
            <p className="text-[11px] tabular-nums text-mute">
              Median wait (≈ {Math.round(((stats?.speedSummary.recentObservedWaitDays ?? 0) / 30.4) * 10) / 10} mos)
            </p>
          </div>
        </div>
      </section>

      {stats && (
        <EstimatorCharts
          consulate={consulate}
          weeklyProgress={stats.weeklyProgress}
          monthlyWaitTimes={stats.monthlyWaitTimes}
          sixMonthsAvgDaysPerWeek={stats.speedSummary.sixMonthsAvgDaysPerWeek}
        />
      )}

      <div className="mb-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-2.5 lg:col-span-5">
          <h4 className="text-sm font-semibold text-ink-900">Simulation Engine</h4>
          <Accordion items={methodologyAccordionItems} />
        </div>
        <div className="space-y-2.5 lg:col-span-7">
          <h4 className="text-sm font-semibold text-ink-900">Frequently Asked Questions</h4>
          <Accordion items={faqAccordionItems} />
        </div>
      </div>
    </>
  );
}
