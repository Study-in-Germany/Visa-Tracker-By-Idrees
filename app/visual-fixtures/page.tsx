import { notFound } from "next/navigation";
import ConfidenceBars from "@/components/data-display/ConfidenceBars";
import Sparkline from "@/components/data-display/Sparkline";
import { QueueOverviewSkeleton, StatCardsSkeleton, VisaStageTimelineSkeleton } from "@/components/ui/Skeletons";
import StatCard from "@/components/ui/StatCard";
import EmbassyQueueSection from "@/components/visa/queue/EmbassyQueueSection";
import QueueOverview from "@/components/visa/queue/QueueOverview";
import TimelineTools from "@/components/overview/TimelineTools";
import AnnouncementsPreview from "@/components/overview/AnnouncementsPreview";
import TransitJourneySkeleton from "@/components/visa/journey/TransitJourneySkeleton";
import TransitVisaJourney from "@/components/visa/journey/TransitVisaJourney";
import VisaStageDurationTimeline from "@/components/visa/VisaStageDurationTimeline";
import {
  adaptDashboardKpis,
  adaptQueueOverview,
  adaptTransitJourney,
  buildMonthlyQueueTimeline,
  type IntelligencePayloadLike,
} from "@/lib/analytics/adapters";
import type { CanonicalQueueOverview, VisaStageTimelineView } from "@/lib/analytics/types";
import type { PersonalForecastResult } from "@/lib/forecasting/types";

export const dynamic = "force-dynamic";

const FIXED_NOW = new Date("2026-11-27T00:00:00Z");

function makeQueuePayload(opts: {
  isbFrontier?: string;
  isbAppt?: string | null;
  isbPace?: number | null;
  isbConfidence?: "high" | "moderate" | "low" | "insufficient";
  isbConflict?: boolean;
  khiFrontier?: string | null;
  khiAppt?: string | null;
  khiPace?: number | null;
  khiConfidence?: "high" | "moderate" | "low" | "insufficient";
  khiSample?: number;
} = {}): IntelligencePayloadLike {
  const isbFrontier = opts.isbFrontier ?? "2026-03-09";
  const isbAppt = opts.isbAppt === undefined ? "2026-11-24" : opts.isbAppt;
  const isbPace = opts.isbPace === undefined ? 7.3 : opts.isbPace;
  const khiFrontier = opts.khiFrontier === undefined ? "2026-07-09" : opts.khiFrontier;
  const khiAppt = opts.khiAppt === undefined ? "2026-10-18" : opts.khiAppt;
  const khiPace = opts.khiPace === undefined ? 4.0 : opts.khiPace;
  const khiSample = opts.khiSample ?? 7;

  return {
    modelVersion: "v2.0.0-mc-km-ensemble",
    generatedAt: "2026-11-27T11:00:00Z",
    datasetSummary: {
      internalApprovedCount: 1254,
      externalTimelineCount: 412,
      combinedDeduplicatedCount: 1580,
      queueObservationsCount: 42,
    },
    embassies: {
      Islamabad: {
        embassy: "Islamabad",
        frontiers: {
          submission: {
            embassy: "Islamabad",
            queueType: "SUBMISSION_FRONTIER",
            internalLatestCohort: "2026-03-02",
            internalSampleSize: 18,
            combinedFrontierDate: isbFrontier,
            observedRangeStart: "2026-03-02",
            observedRangeEnd: "2026-03-10",
            sampleSize: 12,
            effectiveSampleSize: 8.4,
            lastUpdatedDate: "2026-11-26",
            hasConflict: opts.isbConflict ?? false,
            conflictSummary: opts.isbConflict
              ? "Recent same-day reports vary across an 8-day cohort span."
              : null,
            sourceClassification: "Combined internal & community evidence",
            confidence: opts.isbConfidence ?? "moderate",
          },
          appointmentBySubmission: {
            embassy: "Islamabad",
            queueType: "APPOINTMENT_SUBMISSION_FRONTIER",
            internalLatestCohort: "2026-11-20",
            internalSampleSize: 8,
            combinedFrontierDate: isbAppt,
            observedRangeStart: isbAppt ? "2026-11-18" : null,
            observedRangeEnd: isbAppt ? "2026-11-26" : null,
            sampleSize: isbAppt ? 8 : 0,
            effectiveSampleSize: isbAppt ? 6.2 : 0,
            lastUpdatedDate: isbAppt ? "2026-11-26" : null,
            hasConflict: false,
            conflictSummary: null,
            sourceClassification: "Combined internal & community evidence",
            confidence: isbAppt ? "moderate" : "insufficient",
          },
          appointmentByWaitingList: {
            embassy: "Islamabad",
            queueType: "APPOINTMENT_WL_COHORT_FRONTIER",
            internalLatestCohort: "2026-02-18",
            internalSampleSize: 6,
            combinedFrontierDate: "2026-02-22",
            observedRangeStart: "2026-02-16",
            observedRangeEnd: "2026-02-25",
            sampleSize: 6,
            effectiveSampleSize: 4.5,
            lastUpdatedDate: "2026-11-26",
            hasConflict: false,
            conflictSummary: null,
            sourceClassification: "Combined internal & community evidence",
            confidence: "moderate",
          },
        },
        velocity: {
          weightedWeeklyDays: isbPace,
          rawLatestWeeklyDays: isbPace,
          windows: isbPace
            ? [
                { windowDays: 7, weeklyRateDays: isbPace, observationsCount: 4, spanDays: 7 },
                { windowDays: 30, weeklyRateDays: isbPace - 0.3, observationsCount: 11, spanDays: 30 },
                { windowDays: 90, weeklyRateDays: isbPace - 0.5, observationsCount: 24, spanDays: 90 },
              ]
            : [],
          isStalled: false,
          weightsUsed: {},
        },
      },
      Karachi: {
        embassy: "Karachi",
        frontiers: {
          submission: {
            embassy: "Karachi",
            queueType: "SUBMISSION_FRONTIER",
            internalLatestCohort: khiFrontier ? "2026-07-04" : null,
            internalSampleSize: khiSample,
            combinedFrontierDate: khiFrontier,
            observedRangeStart: khiFrontier ? "2026-07-02" : null,
            observedRangeEnd: khiFrontier ? "2026-07-12" : null,
            sampleSize: khiSample,
            effectiveSampleSize: khiFrontier ? 5.2 : 1.4,
            lastUpdatedDate: khiFrontier ? "2026-11-25" : null,
            hasConflict: false,
            conflictSummary: null,
            sourceClassification: khiFrontier ? "Combined internal & community evidence" : "Insufficient observations",
            confidence: opts.khiConfidence ?? (khiFrontier ? "low" : "insufficient"),
          },
          appointmentBySubmission: {
            embassy: "Karachi",
            queueType: "APPOINTMENT_SUBMISSION_FRONTIER",
            internalLatestCohort: khiAppt ? "2026-10-14" : null,
            internalSampleSize: khiAppt ? 5 : 0,
            combinedFrontierDate: khiAppt,
            observedRangeStart: khiAppt ? "2026-10-12" : null,
            observedRangeEnd: khiAppt ? "2026-10-20" : null,
            sampleSize: khiAppt ? 5 : 0,
            effectiveSampleSize: khiAppt ? 4.1 : 0,
            lastUpdatedDate: khiAppt ? "2026-11-25" : null,
            hasConflict: false,
            conflictSummary: null,
            sourceClassification: khiAppt ? "Combined internal & community evidence" : "Insufficient observations",
            confidence: khiAppt ? "low" : "insufficient",
          },
          appointmentByWaitingList: {
            embassy: "Karachi",
            queueType: "APPOINTMENT_WL_COHORT_FRONTIER",
            internalLatestCohort: null,
            internalSampleSize: 0,
            combinedFrontierDate: null,
            observedRangeStart: null,
            observedRangeEnd: null,
            sampleSize: 0,
            effectiveSampleSize: 0,
            lastUpdatedDate: null,
            hasConflict: false,
            conflictSummary: null,
            sourceClassification: "Insufficient observations",
            confidence: "insufficient",
          },
        },
        velocity: {
          weightedWeeklyDays: khiPace,
          rawLatestWeeklyDays: khiPace,
          windows: khiPace ? [{ windowDays: 30, weeklyRateDays: khiPace, observationsCount: 6, spanDays: 30 }] : [],
          isStalled: false,
          weightsUsed: {},
        },
      },
    },
  };
}

function fixtureQueueOverview(): CanonicalQueueOverview {
  return adaptQueueOverview(
    makeQueuePayload({ isbConflict: true }),
    {
      Islamabad: { minWlMs: Date.UTC(2025, 11, 1), maxWlMs: Date.UTC(2026, 10, 26) },
      Karachi: { minWlMs: Date.UTC(2026, 4, 1), maxWlMs: Date.UTC(2026, 10, 25) },
    },
    FIXED_NOW
  );
}

function fixtureStageTimeline(): VisaStageTimelineView {
  return {
    subtitle: "Typical waits from people who completed each step in the last 12 months.",
    usedAllTimeFallback: false,
    stages: [
      {
        id: "waiting_list",
        title: "Join the waiting list",
        subtitle: "1,254 tracked",
      },
      {
        id: "submission_invite",
        title: "Submission invite",
        subtitle: "394 so far",
      },
      {
        id: "appointment",
        title: "Appointment",
        subtitle: "265 so far",
      },
      {
        id: "visa_decision",
        title: "Visa decision",
        subtitle: "99.2% approved",
      },
    ],
    transitions: [],
    correction: {
      hasData: true,
      submissionsCount: 432,
      correctionCount: 144,
      percent: 33,
      oneInN: 3,
      postCorrectionApprox: "3 days",
      postCorrectionSampleSize: 48,
    },
    externalDecisionNote: null,
    details: {
      windowDescription: "Last 12 months",
      internalDecidedCount: 120,
      externalDecisionSampleSize: 14,
      externalDecisionMedianDays: 14,
      stageDefinitions: [
        { stage: "Waiting list → Submission invite", definition: "Waiting-list join to invite.", sampleSize: 383 },
        { stage: "Submission → Appointment", definition: "Document submission to appointment.", sampleSize: 230 },
        { stage: "Appointment → Visa decision", definition: "Physical interview to decision.", sampleSize: 120 },
      ],
    },
  };
}

function makeFixtureForecast(overrides: Partial<PersonalForecastResult> = {}): PersonalForecastResult {
  return {
    modelVersion: "v2.0.0-mc-km-ensemble",
    generatedAt: "2026-11-27T11:00:00Z",
    asOfDate: "2026-11-27",
    embassy: "Islamabad",
    visaCategory: "Study",
    cohortAlreadyReached: false,
    daysSinceCohortReached: null,
    cohortReachedMessage: null,
    currentSubmissionFrontier: "2026-03-05",
    frontierLagDays: 27,
    elapsedWaitingDays: 240,
    weeklyVelocityDays: 5.2,
    confidence: "moderate",
    confidenceReasons: ["Solid recent community sample."],
    stages: [
      {
        stage: "WAITING_LIST_JOINED",
        label: "Waiting list joined",
        status: "completed",
        actualDate: "2026-04-01",
        p10Date: "2026-04-01",
        p25Date: "2026-04-01",
        p50Date: "2026-04-01",
        p75Date: "2026-04-01",
        p90Date: "2026-04-01",
        p50DaysRemaining: 0,
        unresolvedFraction: 0,
        sampleSize: 1,
        effectiveSampleSize: 1,
        note: null,
      },
      {
        stage: "SUBMISSION_INVITED",
        label: "Submission invitation",
        status: "estimated",
        actualDate: null,
        p10Date: "2026-12-10",
        p25Date: "2026-12-16",
        p50Date: "2026-12-21",
        p75Date: "2026-12-27",
        p90Date: "2027-01-04",
        p50DaysRemaining: 24,
        unresolvedFraction: 0,
        sampleSize: 84,
        effectiveSampleSize: 42,
        note: null,
      },
      {
        stage: "DOCUMENTS_SUBMITTED",
        label: "Documents submitted",
        status: "estimated",
        actualDate: null,
        p10Date: "2026-12-13",
        p25Date: "2026-12-19",
        p50Date: "2026-12-24",
        p75Date: "2026-12-30",
        p90Date: "2027-01-08",
        p50DaysRemaining: 27,
        unresolvedFraction: 0,
        sampleSize: 60,
        effectiveSampleSize: 30,
        note: null,
      },
      {
        stage: "APPOINTMENT_INVITED",
        label: "Appointment invitation",
        status: "estimated",
        actualDate: null,
        p10Date: "2026-12-26",
        p25Date: "2027-01-02",
        p50Date: "2027-01-08",
        p75Date: "2027-01-15",
        p90Date: "2027-01-24",
        p50DaysRemaining: 42,
        unresolvedFraction: 0,
        sampleSize: 45,
        effectiveSampleSize: 22,
        note: null,
      },
      {
        stage: "APPOINTMENT_ATTENDED",
        label: "Physical appointment",
        status: "estimated",
        actualDate: null,
        p10Date: "2027-01-03",
        p25Date: "2027-01-10",
        p50Date: "2027-01-17",
        p75Date: "2027-01-25",
        p90Date: "2027-02-04",
        p50DaysRemaining: 51,
        unresolvedFraction: 0,
        sampleSize: 34,
        effectiveSampleSize: 18,
        note: null,
      },
      {
        stage: "DECISION_MADE",
        label: "Visa decision",
        status: "unavailable",
        actualDate: null,
        p10Date: null,
        p25Date: null,
        p50Date: null,
        p75Date: null,
        p90Date: null,
        p50DaysRemaining: null,
        unresolvedFraction: 1,
        sampleSize: 3,
        effectiveSampleSize: 2.1,
        note: "Not enough data to estimate.",
      },
    ],
    scenarios: [
      { key: "faster", label: "Faster (P25)", weeklyVelocityDays: 6.4, submissionInviteDate: "2026-12-16", appointmentInviteDate: "2027-01-02", decisionDate: null },
      { key: "typical", label: "Typical (P50)", weeklyVelocityDays: 5.2, submissionInviteDate: "2026-12-21", appointmentInviteDate: "2027-01-08", decisionDate: null },
      { key: "slower", label: "Slower (P75)", weeklyVelocityDays: 4.1, submissionInviteDate: "2026-12-27", appointmentInviteDate: "2027-01-15", decisionDate: null },
    ],
    speedSensitivity: [
      { windowDays: 7, label: "7d", weeklyVelocityDays: 5.4, estimatedSubmissionInviteDate: "2026-12-20" },
      { windowDays: 30, label: "30d", weeklyVelocityDays: 5.0, estimatedSubmissionInviteDate: "2026-12-22" },
      { windowDays: 90, label: "90d", weeklyVelocityDays: 4.8, estimatedSubmissionInviteDate: "2026-12-24" },
    ],
    methodologySummary: {
      iterations: 5000,
      internalSampleSize: 120,
      externalTimelineSampleSize: 80,
      queueObservationsCount: 24,
      effectiveSampleSize: 42,
      queueModelWeight: 0.72,
      durationModelWeight: 0.28,
      halfLifeDays: 45,
      shrinkageK: 30,
    },
    limitations: ["Estimates rely on community-shared reports and historical embassy pacing; they are not official commitments."],
    ...overrides,
  };
}

export default function VisualFixturesPage({ searchParams }: { searchParams?: { theme?: string } }) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_VISUAL_FIXTURES !== "1") {
    notFound();
  }

  const dark = searchParams?.theme === "dark";
  const queueOverview = fixtureQueueOverview();
  const edgeStartQueue = adaptQueueOverview(
    makeQueuePayload({ isbFrontier: "2026-01-02", isbAppt: "2026-11-10", isbPace: 12.4 }),
    { Islamabad: { minWlMs: Date.UTC(2026, 0, 1), maxWlMs: Date.UTC(2026, 10, 26) } },
    FIXED_NOW
  );
  const edgeEndQueue = adaptQueueOverview(
    makeQueuePayload({ isbFrontier: "2026-11-28", isbAppt: "2026-11-29", isbPace: 6.1 }),
    { Islamabad: { minWlMs: Date.UTC(2026, 0, 1), maxWlMs: Date.UTC(2026, 10, 28) } },
    FIXED_NOW
  );
  const crossYearPartial = adaptQueueOverview(
    makeQueuePayload({
      isbFrontier: "2026-01-12",
      isbAppt: null,
      isbPace: 3.5,
      isbConfidence: "low",
    }),
    { Islamabad: { minWlMs: Date.UTC(2025, 9, 1), maxWlMs: Date.UTC(2026, 7, 1) } },
    FIXED_NOW
  );
  const emptyQueue = adaptQueueOverview(
    makeQueuePayload({ khiFrontier: null, khiAppt: null, khiPace: null, khiSample: 1 }),
    {},
    FIXED_NOW
  );
  const stageTimeline = fixtureStageTimeline();
  const forecast = makeFixtureForecast();
  const transitCurrent = adaptTransitJourney(forecast, {
    visaStatus: "WAITING_LIST",
    waitingListDate: "2026-04-01",
  });

  const actionForecast = makeFixtureForecast({
    confidence: "low",
    confidenceReasons: ["An expected milestone date has passed without confirmation."],
    stages: forecast.stages.map((s) =>
      s.stage === "WAITING_LIST_JOINED"
        ? { ...s, status: "completed", actualDate: "2026-03-02" }
        : s.stage === "SUBMISSION_INVITED"
          ? { ...s, status: "completed", actualDate: "2026-05-12" }
          : s.stage === "DOCUMENTS_SUBMITTED"
            ? { ...s, status: "completed", actualDate: "2026-05-26" }
            : s.stage === "APPOINTMENT_INVITED"
              ? { ...s, status: "completed", actualDate: "2026-06-30" }
              : s.stage === "APPOINTMENT_ATTENDED"
                ? {
                    ...s,
                    status: "needs_confirmation",
                    p10Date: null,
                    p25Date: null,
                    p50Date: null,
                    p75Date: null,
                    p90Date: null,
                    note: "Your scheduled appointment date has passed without a recorded attendance date.",
                  }
                : { ...s, status: "unavailable", p10Date: null, p25Date: null, p50Date: null, p75Date: null, p90Date: null }
    ),
  });
  const transitAction = adaptTransitJourney(actionForecast, {
    visaStatus: "APPOINTMENT_SCHEDULED",
    waitingListDate: "2026-03-02",
    submissionInviteDate: "2026-05-12",
    documentSubmissionDate: "2026-05-26",
    appointmentInviteDate: "2026-06-30",
    appointmentDate: "2026-07-10",
  });

  const completedForecast = makeFixtureForecast({
    confidence: "high",
    confidenceReasons: ["All milestones completed."],
    stages: forecast.stages.map((s, idx) => {
      const dates = ["2026-02-01", "2026-04-12", "2026-04-16", "2026-05-10", "2026-05-21", "2026-06-18"];
      return { ...s, status: "completed", actualDate: dates[idx] };
    }),
  });
  const transitCompleted = adaptTransitJourney(completedForecast, {
    visaStatus: "VISA_ISSUED",
    waitingListDate: "2026-02-01",
    submissionInviteDate: "2026-04-12",
    documentSubmissionDate: "2026-04-16",
    appointmentInviteDate: "2026-05-10",
    appointmentDate: "2026-05-21",
    interviewDate: "2026-05-21",
    decisionDate: "2026-06-18",
  });

  const missingForecast = makeFixtureForecast({
    confidence: "insufficient",
    currentSubmissionFrontier: null,
    confidenceReasons: ["Not enough recent verified reports for this embassy."],
    stages: forecast.stages.map((s) =>
      s.stage === "WAITING_LIST_JOINED"
        ? s
        : { ...s, status: "unavailable", p10Date: null, p25Date: null, p50Date: null, p75Date: null, p90Date: null }
    ),
  });
  const transitMissing = adaptTransitJourney(missingForecast, {
    visaStatus: "WAITING_LIST",
    waitingListDate: "2026-04-01",
  });

  const kpis = adaptDashboardKpis(
    { waitingListDate: "2026-04-01", visaStatus: "WAITING_LIST" },
    forecast,
    [
      { date: "2026-10-16", frontierDate: "2026-02-02" },
      { date: "2026-10-23", frontierDate: "2026-02-08" },
      { date: "2026-10-30", frontierDate: "2026-02-15" },
      { date: "2026-11-06", frontierDate: "2026-02-20" },
      { date: "2026-11-13", frontierDate: "2026-02-27" },
      { date: "2026-11-26", frontierDate: "2026-03-05" },
    ],
    { active: true, waitingDays: 240, hasWaitingListDate: true, now: new Date("2026-11-27T00:00:00Z") }
  );

  const stageInsufficient: VisaStageTimelineView = {
    ...stageTimeline,
    subtitle: "Typical waits from community-reported stage completions.",
    stages: stageTimeline.stages.map((s) =>
      s.id === "visa_decision" ? { ...s, subtitle: "No decisions recorded yet" } : s
    ),
    correction: {
      hasData: true,
      submissionsCount: 100,
      correctionCount: 26,
      percent: 26,
      oneInN: 4,
      postCorrectionApprox: null,
      postCorrectionSampleSize: 3,
    },
  };

  return (
    <div className={dark ? "dark bg-paper text-ink-900 p-4" : "p-4"}>
      <div className="mx-auto max-w-6xl space-y-8">
        <section data-testid="fixture-overview-tools" className="grid gap-4 md:grid-cols-2">
          <TimelineTools />
          <AnnouncementsPreview announcements={[]} />
        </section>
        <div data-testid="fixture-queue-overview">
          <QueueOverview data={queueOverview} />
        </div>

        <div data-testid="fixture-embassy-partial" className="overflow-hidden rounded-xl border border-line bg-card">
          <EmbassyQueueSection data={crossYearPartial.embassies[0]} />
        </div>

        <div data-testid="fixture-embassy-empty" className="overflow-hidden rounded-xl border border-line bg-card">
          <EmbassyQueueSection data={emptyQueue.embassies[1]} />
        </div>

        <div data-testid="fixture-stage-timeline">
          <VisaStageDurationTimeline data={stageTimeline} />
        </div>

        <div data-testid="fixture-stage-timeline-insufficient">
          <VisaStageDurationTimeline data={stageInsufficient} />
        </div>

        <div data-testid="fixture-transit-journey-current">
          <TransitVisaJourney data={transitCurrent} />
        </div>

        <div data-testid="fixture-transit-journey-action">
          <TransitVisaJourney data={transitAction} />
        </div>

        <div data-testid="fixture-transit-journey-completed">
          <TransitVisaJourney data={transitCompleted} />
        </div>

        <div data-testid="fixture-transit-journey-missing">
          <TransitVisaJourney data={transitMissing} />
        </div>

        <section data-testid="fixture-stat-cards" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
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
              <Sparkline
                points={kpis.queueFrontier.sparklinePoints}
                width={76}
                height={26}
                ariaLabel="Queue frontier movement over time"
              />
            }
          />
          <StatCard
            icon="calendar"
            label={kpis.nextMilestone.label}
            value={kpis.nextMilestone.value}
            hint={kpis.nextMilestone.secondary}
          />
          <StatCard
            icon="shield"
            label={kpis.confidence.label}
            value={kpis.confidence.value}
            hint={kpis.confidence.secondary}
            sparkline={<ConfidenceBars bars={kpis.confidence.bars} label="Moderate confidence" />}
          />
        </section>

        <div data-testid="fixture-skeletons" className="space-y-4">
          <StatCardsSkeleton count={4} />
          <QueueOverviewSkeleton />
          <VisaStageTimelineSkeleton />
          <TransitJourneySkeleton />
        </div>

        <div data-testid="fixture-queue-edge-start" className="overflow-hidden rounded-xl border border-line bg-card">
          <EmbassyQueueSection data={edgeStartQueue.embassies[0]} />
        </div>

        <div data-testid="fixture-queue-edge-end" className="overflow-hidden rounded-xl border border-line bg-card">
          <EmbassyQueueSection data={edgeEndQueue.embassies[0]} />
        </div>
      </div>
    </div>
  );
}
