import type {
  Embassy,
  EmbassyFrontierSummary,
  PersonalForecastResult,
  QueueVelocitySummary,
} from "@/lib/forecasting/types";
import {
  formatApproxStep,
  formatCompactConfidenceNote,
  formatCompactQueueDate,
  formatCompactWeeklyPace,
  formatConciseDateRange,
  formatConfidenceLabel,
  formatDisplayDate,
  formatEditorialMonthDay,
  formatFreshnessDate,
  formatShortMonthDay,
  formatStepRange,
  formatUtcShortMonth,
} from "./formatters";
import type {
  CanonicalQueueOverview,
  CorrectionHistoryItem,
  DashboardKpiView,
  EmbassyQueueView,
  JourneyNextActionView,
  MilestoneFieldKey,
  MonthlyTimelineMonth,
  PersonalJourneyStageView,
  PersonalJourneyView,
  SparklinePoint,
  StageTransitionView,
  TransitJourneyViewModel,
  TransitMilestoneView,
  VisaStageTimelineView,
} from "./types";

const DAY_MS = 86_400_000;
const MIN_YEAR = 2020;

export interface IntelligencePayloadLike {
  modelVersion: string;
  generatedAt: string;
  datasetSummary: {
    internalApprovedCount: number;
    externalTimelineCount: number;
    combinedDeduplicatedCount: number;
    queueObservationsCount: number;
  };
  cohortBounds?: Partial<Record<Embassy, { minWlIso: string | null; maxWlIso: string | null }>>;
  embassies: Record<
    Embassy,
    {
      embassy: Embassy;
      frontiers: {
        submission: EmbassyFrontierSummary;
        appointmentBySubmission: EmbassyFrontierSummary;
        appointmentByWaitingList: EmbassyFrontierSummary;
      };
      velocity: QueueVelocitySummary;
      durations?: {
        decisionProcessing?: {
          sampleSize: number;
          median: number | null;
        };
      };
    }
  >;
}

export interface StageApplicantInput {
  consulate: string;
  visaStatus: string;
  waitingListDate: Date | string | null;
  submissionInviteDate: Date | string | null;
  documentSubmissionDate: Date | string | null;
  correctionRequestDate: Date | string | null;
  correctionSubmittedDate: Date | string | null;
  appointmentInviteDate?: Date | string | null;
  appointmentDate: Date | string | null;
  interviewDate?: Date | string | null;
  decisionDate: Date | string | null;
  history?: Array<{
    visaStatus?: string;
    milestone?: string | null;
    eventDate?: Date | string | null;
    note?: string | null;
    occurredAt?: Date | string | null;
  }>;
}

const EMBASSY_FULL_NAMES: Record<Embassy, string> = {
  Islamabad: "German Embassy Islamabad",
  Karachi: "German Consulate General Karachi",
};

function toUtcDayMs(iso: string | null | undefined): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const ms = new Date(`${iso}T00:00:00Z`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function toIsoDateOnly(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    const parsed = new Date(v);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }
  return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
}

function toValidDate(v: Date | string | null | undefined, nowMs: number): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;
  if (d.getUTCFullYear() < MIN_YEAR || t > nowMs + 7 * DAY_MS) return null;
  return d;
}

function gapDays(a: Date | null, b: Date | null, maxDays: number): number | null {
  if (!a || !b) return null;
  const days = Math.round((b.getTime() - a.getTime()) / DAY_MS);
  return days >= 0 && days <= maxDays ? days : null;
}

function quantileSorted(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Builds an exact UTC calendar-day monthly segmented timeline from the canonical frontier date
 * and optional cohort bounds, handling month lengths (28-31), leap years, and year rollovers cleanly.
 */
export function buildMonthlyQueueTimeline(
  frontierIso: string | null,
  cohortBounds: { minWlMs?: number | null; maxWlMs?: number | null } = {},
  now: Date = new Date()
): EmbassyQueueView["timeline"] {
  const frontierMs = toUtcDayMs(frontierIso);
  if (frontierMs === null || !frontierIso) return null;

  const minMs = cohortBounds.minWlMs ? Math.min(cohortBounds.minWlMs, frontierMs) : frontierMs - 60 * DAY_MS;
  const maxMs = cohortBounds.maxWlMs ? Math.max(cohortBounds.maxWlMs, frontierMs) : frontierMs + 210 * DAY_MS;

  const startDate = new Date(minMs);
  const endDate = new Date(maxMs);
  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth();
  const endYear = endDate.getUTCFullYear();
  const endMonth = endDate.getUTCMonth();

  let totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  let cursorYear = startYear;
  let cursorMonth = startMonth;

  if (totalMonths < 6) {
    const shifted = new Date(Date.UTC(endYear, endMonth - 5, 1));
    cursorYear = shifted.getUTCFullYear();
    cursorMonth = shifted.getUTCMonth();
    totalMonths = 6;
  } else if (totalMonths > 12) {
    const shifted = new Date(Date.UTC(endYear, endMonth - 11, 1));
    cursorYear = shifted.getUTCFullYear();
    cursorMonth = shifted.getUTCMonth();
    totalMonths = 12;
  }

  const rawMonths: Omit<MonthlyTimelineMonth, "fillRatio" | "fillPercent">[] = [];
  for (let i = 0; i < totalMonths; i++) {
    const mStart = Date.UTC(cursorYear, cursorMonth + i, 1);
    const mEnd = Date.UTC(cursorYear, cursorMonth + i + 1, 1);
    const dt = new Date(mStart);
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth();
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    const shortMon = formatUtcShortMonth(m);
    rawMonths.push({ key, label: shortMon, year: y, startMs: mStart, endMs: mEnd });
  }

  const spansMultipleYears = rawMonths[0].year !== rawMonths[rawMonths.length - 1].year;
  const spanStart = rawMonths[0].startMs;
  const spanEnd = rawMonths[rawMonths.length - 1].endMs;

  let activeMonthIndex = 0;
  let activeMonthFillRatio = 0;

  if (frontierMs <= spanStart) {
    activeMonthIndex = 0;
    activeMonthFillRatio = 0;
  } else if (frontierMs >= spanEnd) {
    activeMonthIndex = rawMonths.length - 1;
    activeMonthFillRatio = 1;
  } else {
    const idx = rawMonths.findIndex((m) => frontierMs >= m.startMs && frontierMs < m.endMs);
    if (idx >= 0) {
      activeMonthIndex = idx;
      const m = rawMonths[idx];
      activeMonthFillRatio = Math.max(
        0,
        Math.min(1, (frontierMs - m.startMs) / (m.endMs - m.startMs))
      );
    }
  }

  const overallRatio = Math.max(
    0,
    Math.min(1, (activeMonthIndex + activeMonthFillRatio) / rawMonths.length)
  );
  const markerPercent = Math.max(1, Math.min(99, Math.round(overallRatio * 10000) / 100));

  const months: MonthlyTimelineMonth[] = rawMonths.map((m, i) => {
    const fillRatio = Math.max(0, Math.min(1, (frontierMs - m.startMs) / (m.endMs - m.startMs)));
    const fillPercent = Math.round(fillRatio * 100);
    const label =
      spansMultipleYears && (i === 0 || m.label === "Jan")
        ? `${m.label} '${String(m.year).slice(-2)}`
        : m.label;
    return { ...m, label, fillRatio, fillPercent };
  });

  const frontierYear = Number(frontierIso.slice(0, 4));
  const includeYearInPill = frontierYear !== now.getUTCFullYear();
  const markerShortDate =
    formatCompactQueueDate(frontierIso, { includeYear: includeYearInPill, shortYear: true }) ??
    formatShortMonthDay(frontierIso);

  return {
    months,
    activeMonthIndex,
    activeMonthFillRatio,
    overallRatio,
    markerPercent,
    markerShortDate,
    frontierDisplayDate: formatDisplayDate(frontierIso),
    frontierIsoDate: frontierIso,
  };
}

/**
 * Single canonical adapter for "The queue right now" (Option B: Modern Segmented Monochrome Timeline)
 * consumed by Overview, Calculator, and Queue Progress.
 */
export function adaptQueueOverview(
  intelligence: IntelligencePayloadLike,
  cohortBoundsByEmbassy: Partial<Record<Embassy, { minWlMs?: number | null; maxWlMs?: number | null }>> = {},
  now: Date = new Date()
): CanonicalQueueOverview {
  const asOfDate = now.toISOString().slice(0, 10);
  const asOfYear = now.getUTCFullYear();

  const embassies: EmbassyQueueView[] = (["Islamabad", "Karachi"] as const).map((embassy) => {
    const report = intelligence.embassies[embassy];
    const sub = report.frontiers.submission;
    const apptSub = report.frontiers.appointmentBySubmission;
    const apptWl = report.frontiers.appointmentByWaitingList;
    const vel = report.velocity;

    const hasSub = Boolean(sub.combinedFrontierDate && sub.sampleSize >= 3);
    const hasAppt = Boolean(apptSub.combinedFrontierDate && apptSub.sampleSize >= 3);
    const hasVel = vel.weightedWeeklyDays !== null && !Number.isNaN(vel.weightedWeeklyDays) && sub.sampleSize >= 3;
    const hasEnoughData = hasSub || hasAppt;

    const subYearMismatch = Boolean(hasSub && sub.combinedFrontierDate && Number(sub.combinedFrontierDate.slice(0, 4)) !== asOfYear);
    const apptYearMismatch = Boolean(hasAppt && apptSub.combinedFrontierDate && Number(apptSub.combinedFrontierDate.slice(0, 4)) !== asOfYear);

    const subDisplay = hasSub
      ? formatCompactQueueDate(sub.combinedFrontierDate, { includeYear: subYearMismatch, shortYear: true })
      : null;
    const apptDisplay = hasAppt
      ? formatCompactQueueDate(apptSub.combinedFrontierDate, { includeYear: apptYearMismatch, shortYear: true })
      : null;
    const paceStr = hasVel ? formatCompactWeeklyPace(vel.weightedWeeklyDays) : null;

    const intelBounds = intelligence.cohortBounds?.[embassy];
    const explicitBounds = cohortBoundsByEmbassy[embassy];
    const mergedBounds = {
      minWlMs: explicitBounds?.minWlMs ?? toUtcDayMs(intelBounds?.minWlIso),
      maxWlMs: explicitBounds?.maxWlMs ?? toUtcDayMs(intelBounds?.maxWlIso),
    };

    const timeline = hasSub
      ? buildMonthlyQueueTimeline(sub.combinedFrontierDate, mergedBounds, now)
      : null;

    const overallConfidence = !hasEnoughData ? "insufficient" : sub.confidence;
    const confidenceLabel = formatCompactConfidenceNote(overallConfidence, {
      isStalled: hasEnoughData && vel.isStalled,
      hasEnoughData,
      hasConflict: sub.hasConflict,
      effectiveSampleSize: sub.effectiveSampleSize,
    });

    let confidenceDetail: string | null = null;
    if (!hasEnoughData) {
      confidenceDetail = "Not enough verified reports for this consulate yet. Estimates will appear as more applicants add their submission and appointment dates.";
    } else if (vel.isStalled) {
      confidenceDetail = "Recent queue movement appears slow or paused.";
    } else if (sub.hasConflict && sub.conflictSummary) {
      confidenceDetail = sub.conflictSummary;
    } else if (overallConfidence === "low" || sub.effectiveSampleSize < 8) {
      confidenceDetail = "Limited recent reports — estimate may shift as new updates arrive.";
    }

    const confidenceTone: EmbassyQueueView["confidenceTone"] = !hasEnoughData || overallConfidence === "insufficient"
      ? "muted"
      : confidenceLabel
        ? "amber"
        : null;

    return {
      embassy,
      hasEnoughData,
      submissionFrontier: {
        label: "Invites reaching",
        mobileLabel: "Invites",
        value: subDisplay,
        sublabel: "Joining date",
        mobileSublabel: "Joined",
        rawDate: hasSub ? sub.combinedFrontierDate : null,
        available: hasSub,
      },
      appointmentFrontier: {
        label: "Appointments",
        mobileLabel: "Appt. invites",
        value: apptDisplay,
        sublabel: "Submission date",
        mobileSublabel: "Submitted",
        rawDate: hasAppt ? apptSub.combinedFrontierDate : null,
        available: hasAppt,
      },
      weeklyMovement: {
        label: "Weekly pace",
        mobileLabel: "Pace",
        value: paceStr,
        sublabel: "Joining dates / wk",
        mobileSublabel: "Per week",
        available: Boolean(paceStr),
      },
      timeline: timeline
        ? {
            ...timeline,
            markerShortDate: subDisplay ?? timeline.markerShortDate,
          }
        : null,
      confidenceLabel,
      confidenceDetail,
      confidenceTone,
      warning: confidenceDetail,
      diagnostics: {
        internalLatestCohort: sub.internalLatestCohort,
        internalSampleSize: sub.internalSampleSize,
        combinedFrontierDate: sub.combinedFrontierDate,
        observedRangeStart: sub.observedRangeStart,
        observedRangeEnd: sub.observedRangeEnd,
        sampleSize: sub.sampleSize,
        effectiveSampleSize: sub.effectiveSampleSize,
        sourceClassification: sub.sourceClassification,
        confidence: sub.confidence,
        hasConflict: sub.hasConflict,
        conflictSummary: sub.conflictSummary,
        lastUpdatedDate: sub.lastUpdatedDate,
        appointmentByWaitingListDate: apptWl.combinedFrontierDate,
        velocityWindows: vel.windows.map((w) => ({
          windowDays: w.windowDays,
          weeklyRateDays: w.weeklyRateDays,
          observationsCount: w.observationsCount,
        })),
        isStalled: vel.isStalled,
      },
    };
  });

  const updatedDates = embassies
    .map((e) => e.diagnostics.lastUpdatedDate)
    .filter((d): d is string => Boolean(d))
    .sort();
  const lastUpdatedDate = updatedDates.length > 0 ? updatedDates[updatedDates.length - 1] : null;
  const freshDate = formatFreshnessDate(lastUpdatedDate, asOfDate);
  const freshnessLabel = freshDate
    ? `Community estimates · Updated ${freshDate}`
    : "Community estimates · Not official embassy data";

  return {
    asOfDate,
    lastUpdatedDate,
    freshnessLabel,
    modelVersion: intelligence.modelVersion,
    datasetSummary: intelligence.datasetSummary,
    embassies,
  };
}

function summarizeStageDurations(
  pairs: { from: Date; to: Date; maxDays: number }[],
  cutoffMs: number
) {
  const allGaps = pairs.map((p) => gapDays(p.from, p.to, p.maxDays)).filter((d): d is number => d !== null);
  const recentGaps = pairs
    .filter((p) => p.to.getTime() >= cutoffMs)
    .map((p) => gapDays(p.from, p.to, p.maxDays))
    .filter((d): d is number => d !== null);

  const useRecent = recentGaps.length >= 3 || allGaps.length < 3;
  const chosen = (useRecent ? recentGaps : allGaps).slice().sort((a, b) => a - b);

  if (chosen.length === 0) {
    return { medianDays: null, q1Days: null, q3Days: null, sampleSize: 0, usedAllTime: false };
  }

  return {
    medianDays: Math.round(quantileSorted(chosen, 0.5)!),
    q1Days: Math.round(quantileSorted(chosen, 0.25)!),
    q3Days: Math.round(quantileSorted(chosen, 0.75)!),
    sampleSize: chosen.length,
    usedAllTime: !useRecent,
  };
}

/**
 * Canonical adapter for "How long each step takes", preserving honest decision/correction sample guards.
 */
export function adaptStageDurationTimeline(
  applicants: StageApplicantInput[],
  intelligence?: IntelligencePayloadLike | null,
  now: Date = new Date()
): VisaStageTimelineView {
  const nowMs = now.getTime();
  const twelveMonthsAgoMs = nowMs - 365 * DAY_MS;

  const wToInvPairs: { from: Date; to: Date; maxDays: number }[] = [];
  const docToApptPairs: { from: Date; to: Date; maxDays: number }[] = [];
  const apptToDecPairs: { from: Date; to: Date; maxDays: number }[] = [];
  const corrToApptGaps: number[] = [];

  let submissionInviteCount = 0;
  let appointmentCount = 0;
  let decidedCount = 0;
  let issuedCount = 0;
  let submissionsCount = 0;
  let correctionCount = 0;

  for (const a of applicants) {
    const wl = toValidDate(a.waitingListDate, nowMs);
    const inv = toValidDate(a.submissionInviteDate, nowMs);
    const doc = toValidDate(a.documentSubmissionDate, nowMs);
    const corrReq = toValidDate(a.correctionRequestDate, nowMs);
    const corrSub = toValidDate(a.correctionSubmittedDate, nowMs);
    const appt = toValidDate(a.appointmentDate, nowMs);
    const interview = toValidDate(a.interviewDate, nowMs);
    const dec = toValidDate(a.decisionDate, nowMs);

    if (inv || doc || appt || dec) submissionInviteCount++;
    if (appt || dec) appointmentCount++;
    if (a.visaStatus === "VISA_ISSUED") {
      issuedCount++;
      decidedCount++;
    } else if (a.visaStatus === "VISA_REJECTED") {
      decidedCount++;
    }

    if (wl && inv) wToInvPairs.push({ from: wl, to: inv, maxDays: 730 });

    // Appointment wait starts after actual document submission (falling back to invite only when doc date absent)
    const subRef = doc ?? inv;
    if (subRef && appt) docToApptPairs.push({ from: subRef, to: appt, maxDays: 365 });

    // Issue B guard: only compute decision duration for decided cases with valid appointment/interview date
    if ((a.visaStatus === "VISA_ISSUED" || a.visaStatus === "VISA_REJECTED") && dec) {
      const startRef = interview ?? appt;
      if (startRef) apptToDecPairs.push({ from: startRef, to: dec, maxDays: 365 });
    }

    if (doc || corrReq || corrSub || appt || a.visaStatus === "SUBMISSION_RECEIVED" || a.visaStatus === "UNDER_CORRECTION") {
      submissionsCount++;
    }
    if (corrReq || a.visaStatus === "UNDER_CORRECTION") {
      correctionCount++;
    }
    const corrGap = gapDays(corrSub, appt, 180);
    if (corrGap !== null) corrToApptGaps.push(corrGap);
  }

  const wStat = summarizeStageDurations(wToInvPairs, twelveMonthsAgoMs);
  const aStat = summarizeStageDurations(docToApptPairs, twelveMonthsAgoMs);
  const dStat = summarizeStageDurations(apptToDecPairs, twelveMonthsAgoMs);

  corrToApptGaps.sort((a, b) => a - b);
  const postCorrectionSampleSize = corrToApptGaps.length;
  // Never imply certainty from tiny <5 samples
  const postCorrectionMedianDays =
    postCorrectionSampleSize >= 5 ? Math.round(quantileSorted(corrToApptGaps, 0.5)!) : null;

  const approvalRate = decidedCount >= 3 ? Math.round((issuedCount / decidedCount) * 1000) / 10 : null;
  const percent = submissionsCount >= 5 ? Math.round((correctionCount / submissionsCount) * 100) : null;
  const oneInN =
    submissionsCount >= 5 && correctionCount > 0 ? Math.max(1, Math.round(submissionsCount / correctionCount)) : null;

  const isbDec = intelligence?.embassies?.Islamabad?.durations?.decisionProcessing;
  const khiDec = intelligence?.embassies?.Karachi?.durations?.decisionProcessing;
  const extDecisionSampleSize = (isbDec?.sampleSize ?? 0) + (khiDec?.sampleSize ?? 0);
  const extDecisionMedianDays =
    isbDec?.median !== null && isbDec?.median !== undefined
      ? Math.round(isbDec.median)
      : khiDec?.median !== null && khiDec?.median !== undefined
        ? Math.round(khiDec.median)
        : null;

  const externalDecisionNote =
    decidedCount === 0 && extDecisionSampleSize >= 5 && extDecisionMedianDays !== null
      ? `No internal decisions recorded yet; external historical timelines (${extDecisionSampleSize}) show ~${formatApproxStep(extDecisionMedianDays)} after interview.`
      : null;

  const usedAllTimeFallback = wStat.usedAllTime || aStat.usedAllTime || dStat.usedAllTime;
  const subtitle = usedAllTimeFallback
    ? "Typical processing times · All recorded entries"
    : "Typical processing times · Last 12 months";

  const toTransition = (
    st: ReturnType<typeof summarizeStageDurations>,
    meta: { fromId: string; toId: string; anchor: string | null; definition: string },
    eligible = true
  ): StageTransitionView => {
    const available = eligible && st.medianDays !== null && st.sampleSize > 0;
    return {
      fromId: meta.fromId,
      toId: meta.toId,
      available,
      approx: available ? formatApproxStep(st.medianDays!) : null,
      range:
        available && st.q1Days !== null && st.q3Days !== null ? formatStepRange(st.q1Days, st.q3Days) : null,
      sampleSize: available ? st.sampleSize : 0,
      anchor: meta.anchor,
      note: available ? null : "Limited data",
      definition: meta.definition,
    };
  };

  return {
    subtitle,
    usedAllTimeFallback,
    stages: [
      {
        id: "waiting_list",
        title: "Waiting list",
        subtitle: `${applicants.length.toLocaleString("en-US")} tracked`,
      },
      {
        id: "submission_invite",
        title: "Submission invite",
        subtitle: `${submissionInviteCount.toLocaleString("en-US")} received`,
      },
      {
        id: "appointment",
        title: "Appointment",
        subtitle: `${appointmentCount.toLocaleString("en-US")} recorded`,
      },
      {
        id: "visa_decision",
        title: "Visa decision",
        subtitle:
          approvalRate !== null
            ? `${approvalRate}% approved`
            : decidedCount > 0
              ? `${issuedCount} of ${decidedCount} approved`
              : "No decisions recorded yet",
      },
    ],
    transitions: [
      toTransition(wStat, {
        fromId: "waiting_list",
        toId: "submission_invite",
        anchor: null,
        definition: "Waiting-list joining date to submission invitation date.",
      }),
      toTransition(aStat, {
        fromId: "submission_invite",
        toId: "appointment",
        anchor: "After submission",
        definition:
          "Actual document submission date (submission invitation date when no submission date is recorded) to appointment date.",
      }),
      toTransition(
        dStat,
        {
          fromId: "appointment",
          toId: "visa_decision",
          anchor: null,
          definition: "Recorded appointment or interview date to decision date, across decided internal cases only.",
        },
        decidedCount > 0
      ),
    ],
    correction: {
      hasData: submissionsCount >= 5 && correctionCount > 0,
      submissionsCount,
      correctionCount,
      percent,
      oneInN,
      postCorrectionApprox: postCorrectionMedianDays !== null ? formatApproxStep(postCorrectionMedianDays) : null,
      postCorrectionSampleSize,
    },
    externalDecisionNote,
    details: {
      windowDescription: usedAllTimeFallback ? "Last 12 months with all-time fallback for small samples" : "Last 12 months",
      internalDecidedCount: decidedCount,
      externalDecisionSampleSize: extDecisionSampleSize,
      externalDecisionMedianDays: extDecisionMedianDays,
      stageDefinitions: [
        {
          stage: "Waiting list → Submission invite",
          definition: "Measured from waiting-list joining date to submission invitation date.",
          sampleSize: wStat.sampleSize,
        },
        {
          stage: "Submission → Appointment",
          definition:
            "Measured from the actual document submission date (not the invitation, unless no submission date is recorded) to the appointment date.",
          sampleSize: aStat.sampleSize,
        },
        {
          stage: "Appointment → Visa decision",
          definition: "Measured only across decided internal cases (issued or rejected) from interview/appointment to decision.",
          sampleSize: dStat.sampleSize,
        },
      ],
    },
  };
}

const STAGE_TITLES: Record<string, string> = {
  WAITING_LIST_JOINED: "Waiting list",
  SUBMISSION_INVITED: "Submission invitation",
  DOCUMENTS_SUBMITTED: "Documents submitted",
  APPOINTMENT_INVITED: "Appointment invitation",
  APPOINTMENT_ATTENDED: "Physical appointment",
  DECISION_MADE: "Visa decision",
};

const STAGE_FIELD_MAP: Record<string, MilestoneFieldKey> = {
  WAITING_LIST_JOINED: "waitingListDate",
  SUBMISSION_INVITED: "submissionInviteDate",
  DOCUMENTS_SUBMITTED: "documentSubmissionDate",
  CORRECTION_CYCLE: "correctionSubmittedDate",
  APPOINTMENT_INVITED: "appointmentDate",
  APPOINTMENT_ATTENDED: "interviewDate",
  DECISION_MADE: "decisionDate",
};

export interface TransitApplicantInput {
  visaStatus?: string | null;
  waitingListDate?: Date | string | null;
  submissionInviteDate?: Date | string | null;
  documentSubmissionDate?: Date | string | null;
  correctionRequestDate?: Date | string | null;
  correctionSubmittedDate?: Date | string | null;
  appointmentInviteDate?: Date | string | null;
  appointmentDate?: Date | string | null;
  interviewDate?: Date | string | null;
  decisionDate?: Date | string | null;
  history?: Array<{
    milestone?: string | null;
    eventDate?: Date | string | null;
    note?: string | null;
    occurredAt?: Date | string | null;
  }>;
}

function collectCorrectionEvents(applicant?: TransitApplicantInput | null): CorrectionHistoryItem[] {
  if (!applicant) return [];
  const items: CorrectionHistoryItem[] = [];
  const seen = new Set<string>();

  for (const h of applicant.history ?? []) {
    if (h.milestone === "correctionRequestDate" || h.milestone === "correctionSubmittedDate") {
      const iso = toIsoDateOnly(h.eventDate ?? h.occurredAt);
      if (!iso) continue;
      const type = h.milestone === "correctionRequestDate" ? "requested" : "submitted";
      const key = `${type}:${iso}:${h.note ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ type, date: iso, note: h.note ?? null });
      }
    }
  }

  const reqIso = toIsoDateOnly(applicant.correctionRequestDate);
  if (reqIso && !items.some((i) => i.type === "requested" && i.date === reqIso)) {
    items.push({ type: "requested", date: reqIso });
  }
  const subIso = toIsoDateOnly(applicant.correctionSubmittedDate);
  if (subIso && !items.some((i) => i.type === "submitted" && i.date === subIso)) {
    items.push({ type: "submitted", date: subIso });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Canonical adapter for Option D: TransitVisaJourney.
 * Maps normalized applicant milestones + canonical forecasting outputs into a connected transit route.
 */
export function adaptTransitJourney(
  forecast: PersonalForecastResult,
  applicant?: TransitApplicantInput | null,
  options: { scenario?: "faster" | "typical" | "slower"; now?: Date } = {}
): TransitJourneyViewModel {
  const asOfIso = forecast.asOfDate;
  const asOfYear = Number(asOfIso.slice(0, 4));
  const scenario = options.scenario ?? "typical";

  const visaStatus = applicant?.visaStatus ?? null;
  const isIssued = visaStatus === "VISA_ISSUED";
  const isRejected = visaStatus === "VISA_REJECTED";
  const isWithdrawn = visaStatus === "WITHDRAWN";
  const isTerminal = isIssued || isRejected || isWithdrawn;

  const actualSubInvite = toIsoDateOnly(applicant?.submissionInviteDate) ?? forecast.stages.find((s) => s.stage === "SUBMISSION_INVITED")?.actualDate ?? null;
  const actualDocs = toIsoDateOnly(applicant?.documentSubmissionDate) ?? forecast.stages.find((s) => s.stage === "DOCUMENTS_SUBMITTED")?.actualDate ?? null;
  const corrReqIso = toIsoDateOnly(applicant?.correctionRequestDate);
  const corrSubIso = toIsoDateOnly(applicant?.correctionSubmittedDate);
  const actualApptInvite = toIsoDateOnly(applicant?.appointmentInviteDate) ?? forecast.stages.find((s) => s.stage === "APPOINTMENT_INVITED")?.actualDate ?? null;
  const bookedApptIso = toIsoDateOnly(applicant?.appointmentDate);
  const actualInterview = toIsoDateOnly(applicant?.interviewDate) ?? forecast.stages.find((s) => s.stage === "APPOINTMENT_ATTENDED")?.actualDate ?? null;
  const actualDecision = toIsoDateOnly(applicant?.decisionDate) ?? forecast.stages.find((s) => s.stage === "DECISION_MADE")?.actualDate ?? null;

  const correctionEvents = collectCorrectionEvents(applicant);
  const activeCorrection =
    !isTerminal &&
    (visaStatus === "UNDER_CORRECTION" || (Boolean(corrReqIso) && (!corrSubIso || corrReqIso! > corrSubIso)));

  const apptStageForecast = forecast.stages.find((s) => s.stage === "APPOINTMENT_ATTENDED");
  const apptInviteForecast = forecast.stages.find((s) => s.stage === "APPOINTMENT_INVITED");
  const bookedIsPassed = Boolean(bookedApptIso && bookedApptIso < asOfIso && !actualInterview);
  const apptNeedsConfirm =
    !isTerminal &&
    (apptStageForecast?.status === "needs_confirmation" || bookedIsPassed);

  // Determine whether actual dates span multiple calendar years so we show years whenever omitting creates ambiguity
  const actualYears = new Set<number>();
  for (const st of forecast.stages) {
    if (st.actualDate) actualYears.add(Number(st.actualDate.slice(0, 4)));
  }
  const hasEstimatedYearMismatch = forecast.stages.some(
    (s) => s.status !== "completed" && s.p50Date && Number(s.p50Date.slice(0, 4)) !== asOfYear
  );
  const includeActualYear =
    actualYears.size > 1 ||
    Array.from(actualYears).some((y) => y !== asOfYear) ||
    hasEstimatedYearMismatch;

  const fmtActual = (iso: string | null) =>
    iso ? formatEditorialMonthDay(iso, { includeYear: includeActualYear }) : null;

  let seenActive = false;
  const milestones: TransitMilestoneView[] = [];

  for (const st of forecast.stages) {
    const title = STAGE_TITLES[st.stage] ?? st.label;
    const field = STAGE_FIELD_MAP[st.stage];

    if (st.stage === "APPOINTMENT_INVITED" && activeCorrection) {
      seenActive = true;
      milestones.push({
        id: "CORRECTION_CYCLE",
        label: "Correction",
        actualDate: corrReqIso,
        formattedActualDate: fmtActual(corrReqIso),
        estimatedRange: null,
        state: "action-required",
        confidence: null,
        statusLabel: "Submit response",
        isCurrentStep: true,
        milestoneField: "correctionSubmittedDate",
      });
    }

    if (st.stage === "DECISION_MADE" && isTerminal) {
      const outcome = isIssued ? "issued" : isRejected ? "rejected" : "withdrawn";
      const statusLabel = isIssued ? "Visa issued" : isRejected ? "Visa rejected" : "Withdrawn";
      milestones.push({
        id: st.stage,
        label: title,
        actualDate: actualDecision ?? st.actualDate,
        formattedActualDate: fmtActual(actualDecision ?? st.actualDate),
        estimatedRange: null,
        state: "terminal",
        terminalOutcome: outcome,
        confidence: "high",
        statusLabel,
        isCurrentStep: false,
        milestoneField: field,
      });
      continue;
    }

    if (st.status === "completed" && st.actualDate) {
      milestones.push({
        id: st.stage,
        label: title,
        actualDate: st.actualDate,
        formattedActualDate: fmtActual(st.actualDate),
        estimatedRange: null,
        state: "completed",
        confidence: "high",
        statusLabel: null,
        isCurrentStep: false,
        milestoneField: field,
      });
      continue;
    }

    if (isTerminal) {
      milestones.push({
        id: st.stage,
        label: title,
        actualDate: null,
        formattedActualDate: null,
        estimatedRange: null,
        state: "unavailable",
        confidence: null,
        statusLabel: "Not recorded",
        isCurrentStep: false,
        milestoneField: field,
      });
      continue;
    }

    if (st.status === "needs_confirmation" || (st.stage === "APPOINTMENT_ATTENDED" && apptNeedsConfirm)) {
      const isCurrent = !seenActive;
      seenActive = true;
      milestones.push({
        id: st.stage,
        label: title,
        actualDate: null,
        formattedActualDate: null,
        estimatedRange: null,
        state: "action-required",
        confidence: "low",
        statusLabel: "Confirm date",
        isCurrentStep: isCurrent,
        milestoneField: st.stage === "APPOINTMENT_INVITED" ? "appointmentDate" : "interviewDate",
      });
      continue;
    }

    // Booked future appointment recorded
    if (st.stage === "APPOINTMENT_ATTENDED" && bookedApptIso && !actualInterview && bookedApptIso >= asOfIso) {
      const isCurrent = !seenActive;
      seenActive = true;
      milestones.push({
        id: st.stage,
        label: title,
        actualDate: bookedApptIso,
        formattedActualDate: fmtActual(bookedApptIso),
        estimatedRange: null,
        state: isCurrent ? "current" : "upcoming",
        confidence: "high",
        statusLabel: "Scheduled",
        isCurrentStep: isCurrent,
        milestoneField: "interviewDate",
      });
      continue;
    }

    if (st.status === "cohort_reached") {
      const isCurrent = !seenActive;
      seenActive = true;
      milestones.push({
        id: st.stage,
        label: title,
        actualDate: null,
        formattedActualDate: null,
        estimatedRange: null,
        state: "action-required",
        confidence: st.stageConfidence ?? forecast.confidence,
        statusLabel: "Cohort reached",
        isCurrentStep: isCurrent,
        milestoneField: field,
      });
      continue;
    }

    if (st.status === "unavailable" || !st.p50Date) {
      const isCurrent = !seenActive && st.stage === "DECISION_MADE" && Boolean(actualInterview);
      if (isCurrent) seenActive = true;
      milestones.push({
        id: st.stage,
        label: title,
        actualDate: null,
        formattedActualDate: null,
        estimatedRange: null,
        state: isCurrent ? "current" : "unavailable",
        confidence: "insufficient",
        statusLabel: st.stage === "DECISION_MADE" ? "Pending" : "Unavailable",
        isCurrentStep: isCurrent,
        milestoneField: field,
      });
      continue;
    }

    // Estimated future milestone (adjusts cleanly for scenario toggle in calculator)
    const isCurrent = !seenActive;
    if (isCurrent) seenActive = true;

    let rangeStart = forecast.confidence === "low" && st.p10Date ? st.p10Date : st.p25Date ?? st.p50Date;
    let rangeEnd = forecast.confidence === "low" && st.p90Date ? st.p90Date : st.p75Date ?? st.p50Date;
    if (scenario === "faster") {
      rangeStart = st.p10Date ?? st.p25Date ?? st.p50Date;
      rangeEnd = st.p25Date ?? st.p50Date;
    } else if (scenario === "slower") {
      rangeStart = st.p75Date ?? st.p50Date;
      rangeEnd = st.p90Date ?? st.p75Date ?? st.p50Date;
    }

    milestones.push({
      id: st.stage,
      label: title,
      actualDate: null,
      formattedActualDate: null,
      estimatedRange: {
        from: rangeStart,
        to: rangeEnd,
        formatted: formatConciseDateRange(rangeStart, rangeEnd),
      },
      state: isCurrent ? "current" : "upcoming",
      confidence: st.stageConfidence ?? forecast.confidence,
      statusLabel: "Estimated",
      isCurrentStep: isCurrent,
      milestoneField: field,
    });
  }

  // Derive Current-Stage Summary strictly from normalized actual milestones & status
  let currentStage: TransitJourneyViewModel["currentStage"];
  if (isIssued) {
    currentStage = { label: "Visa issued", statusText: actualDecision ? formatDisplayDate(actualDecision) : "Decision recorded", tone: "completed" };
  } else if (isRejected) {
    currentStage = { label: "Visa rejected", statusText: actualDecision ? formatDisplayDate(actualDecision) : "Decision recorded", tone: "terminal-rejected" };
  } else if (isWithdrawn) {
    currentStage = { label: "Withdrawn", statusText: "Application closed", tone: "neutral" };
  } else if (activeCorrection) {
    currentStage = { label: "Correction required", statusText: "Response needed", tone: "action" };
  } else if (apptNeedsConfirm) {
    currentStage = { label: "Appointment", statusText: "Confirmation needed", tone: "action" };
  } else if (actualInterview || visaStatus === "PROCESSING") {
    currentStage = { label: "Visa processing", statusText: "Awaiting decision", tone: "neutral" };
  } else if (bookedApptIso && bookedApptIso >= asOfIso) {
    currentStage = { label: "Appointment scheduled", statusText: formatDisplayDate(bookedApptIso), tone: "neutral" };
  } else if (actualApptInvite) {
    currentStage = { label: "Appointment", statusText: "Confirmation needed", tone: "action" };
  } else if (actualDocs) {
    currentStage = {
      label: apptInviteForecast?.status === "needs_confirmation" ? "Preliminary review" : "Waiting for appointment",
      statusText: apptInviteForecast?.status === "needs_confirmation" ? "Update invite if received" : "Documents under review",
      tone: apptInviteForecast?.status === "needs_confirmation" ? "action" : "neutral",
    };
  } else if (actualSubInvite) {
    currentStage = { label: "Preparing documents", statusText: "Submission pending", tone: "action" };
  } else {
    currentStage = {
      label: "Waiting for submission invitation",
      statusText: forecast.cohortAlreadyReached ? "Cohort reached" : "In waiting list",
      tone: forecast.cohortAlreadyReached ? "action" : "neutral",
    };
  }

  // Derive Contextual Next Action (Section 4.8)
  let nextAction: JourneyNextActionView | null = null;
  if (!isTerminal) {
    if (activeCorrection) {
      nextAction = {
        actionId: "record-correction-submitted",
        title: "Record your correction response",
        description: "Update when you submitted your corrected documents to refine appointment estimates.",
        buttonLabel: "Update date",
        milestoneField: "correctionSubmittedDate",
        milestoneLabel: "Correction Submitted",
        currentDateValue: corrSubIso,
        tone: "action",
      };
    } else if (apptNeedsConfirm) {
      nextAction = {
        actionId: "confirm-appointment-attendance",
        title: "Confirm your appointment date",
        description: "Required to estimate your visa decision.",
        buttonLabel: "Update date",
        milestoneField: "interviewDate",
        milestoneLabel: "Physical Appointment",
        currentDateValue: actualInterview ?? bookedApptIso,
        tone: "action",
      };
    } else if (actualApptInvite && !bookedApptIso && !actualInterview) {
      nextAction = {
        actionId: "record-booked-appointment",
        title: "Record your booked appointment",
        description: "Add your scheduled appointment date to keep your timeline accurate.",
        buttonLabel: "Update date",
        milestoneField: "appointmentDate",
        milestoneLabel: "Appointment",
        currentDateValue: bookedApptIso,
        tone: "action",
      };
    } else if (actualSubInvite && !actualDocs) {
      nextAction = {
        actionId: "record-document-submission",
        title: "Record document submission",
        description: "Add your submission date to estimate when your appointment invite will arrive.",
        buttonLabel: "Update date",
        milestoneField: "documentSubmissionDate",
        milestoneLabel: "Documents Submitted",
        currentDateValue: actualDocs,
        tone: "action",
      };
    } else if (forecast.cohortAlreadyReached && !actualSubInvite) {
      nextAction = {
        actionId: "record-submission-invite",
        title: "Record your submission invitation",
        description: "Your waiting-list cohort has been reached — add your invite date once it arrives.",
        buttonLabel: "Update date",
        milestoneField: "submissionInviteDate",
        milestoneLabel: "Submission Invitation",
        currentDateValue: actualSubInvite,
        tone: "neutral",
      };
    } else if (actualInterview && !actualDecision) {
      nextAction = {
        actionId: "record-decision",
        title: "Record your visa decision",
        description: "Update your timeline once you receive the final outcome.",
        buttonLabel: "Update date",
        milestoneField: "decisionDate",
        milestoneLabel: "Decision",
        currentDateValue: actualDecision,
        tone: "neutral",
      };
    }
  }

  // Concise essential limitation warning only when confidence is insufficient or stage unavailable
  let warningNote: string | null = null;
  if (!isTerminal && (forecast.confidence === "insufficient" || !forecast.currentSubmissionFrontier)) {
    warningNote = "Limited historical data for some remaining stages — check Forecast details for methodology.";
  }

  const completedCorrectionCount = correctionEvents.filter((e) => e.type === "submitted").length;
  const correctionSummaryText =
    correctionEvents.length > 0 && !activeCorrection
      ? completedCorrectionCount > 1
        ? `${completedCorrectionCount} corrections completed`
        : corrSubIso
          ? `Correction submitted ${formatDisplayDate(corrSubIso)}`
          : corrReqIso
            ? `Correction requested ${formatDisplayDate(corrReqIso)}`
            : null
      : null;

  const freshDate = formatFreshnessDate(forecast.asOfDate, asOfIso) ?? formatDisplayDate(forecast.asOfDate);

  return {
    embassy: forecast.embassy,
    asOfDate: forecast.asOfDate,
    updatedAt: forecast.asOfDate,
    freshnessLabel: `Updated ${freshDate}`,
    currentStage,
    milestones,
    nextAction,
    corrections: {
      count: Math.max(
        correctionEvents.filter((e) => e.type === "requested").length,
        correctionEvents.filter((e) => e.type === "submitted").length,
        corrReqIso || corrSubIso ? 1 : 0
      ),
      isActive: activeCorrection,
      summaryText: correctionSummaryText,
      events: correctionEvents,
    },
    confidence: forecast.confidence,
    warningNote,
    forecast,
  };
}

/**
 * Legacy-compatible adapter kept temporarily while routes transition to adaptTransitJourney.
 */
export function adaptPersonalJourney(
  forecast: PersonalForecastResult,
  applicant?: {
    correctionRequestDate?: string | null;
    correctionSubmittedDate?: string | null;
  } | null
): PersonalJourneyView {
  let seenCurrent = false;
  const stages: PersonalJourneyStageView[] = forecast.stages.map((st) => {
    const title = STAGE_TITLES[st.stage] ?? st.label;

    if (st.status === "completed" && st.actualDate) {
      return {
        key: st.stage,
        title,
        status: "completed",
        primaryDate: formatDisplayDate(st.actualDate),
        secondaryLabel: null,
        isEstimated: false,
      };
    }

    if (st.status === "needs_confirmation") {
      seenCurrent = true;
      return {
        key: st.stage,
        title,
        status: "needs_confirmation",
        primaryDate: "Confirm date",
        secondaryLabel: "Update milestone",
        isEstimated: false,
      };
    }

    if (st.status === "cohort_reached") {
      seenCurrent = true;
      return {
        key: st.stage,
        title,
        status: "cohort_reached",
        primaryDate: "Cohort reached",
        secondaryLabel: "Check portal",
        isEstimated: false,
      };
    }

    if (st.status === "unavailable" || !st.p50Date) {
      return {
        key: st.stage,
        title,
        status: "unavailable",
        primaryDate: "Not enough data",
        secondaryLabel: null,
        isEstimated: false,
      };
    }

    const isCurrent = !seenCurrent;
    if (isCurrent) seenCurrent = true;

    const rangeStart = forecast.confidence === "low" && st.p10Date ? st.p10Date : st.p25Date ?? st.p50Date;
    const rangeEnd = forecast.confidence === "low" && st.p90Date ? st.p90Date : st.p75Date ?? st.p50Date;

    return {
      key: st.stage,
      title,
      status: isCurrent ? "current" : "estimated",
      primaryDate: formatConciseDateRange(rangeStart, rangeEnd),
      secondaryLabel: "Estimated",
      isEstimated: true,
    };
  });

  const needsConfirmStage = forecast.stages.find((s) => s.status === "needs_confirmation");
  let banner: PersonalJourneyView["banner"] = null;
  if (needsConfirmStage) {
    banner = {
      tone: "warn",
      title: `Confirm your ${STAGE_TITLES[needsConfirmStage.stage]?.toLowerCase() ?? "milestone"} date`,
      body: needsConfirmStage.note ?? "Your scheduled date has passed without a recorded update. Confirm the actual date below to update remaining estimates.",
    };
  } else if (forecast.cohortAlreadyReached && forecast.cohortReachedMessage) {
    banner = {
      tone: "info",
      title: "Your waiting-list cohort has been reached",
      body: "Check your Consular Services Portal inbox and email, then record your invitation date below when it arrives.",
    };
  }

  const hasCorrectionHistory = Boolean(applicant?.correctionRequestDate || applicant?.correctionSubmittedDate);
  const correctionSummaryText = hasCorrectionHistory
    ? applicant?.correctionSubmittedDate
      ? `Correction submitted ${formatDisplayDate(applicant.correctionSubmittedDate)}`
      : `Correction requested ${formatDisplayDate(applicant?.correctionRequestDate)}`
    : null;

  return {
    embassy: forecast.embassy,
    asOfDate: forecast.asOfDate,
    lastUpdatedLabel: formatDisplayDate(forecast.asOfDate),
    banner,
    stages,
    hasCorrectionHistory,
    correctionSummaryText,
    forecast,
  };
}

function simplifyConfidenceReason(reason: string | undefined, level: PersonalForecastResult["confidence"]): string {
  if (!reason) {
    return level === "high"
      ? "Supported by recent embassy reports"
      : level === "moderate"
        ? "Based on recent community pace"
        : "Limited recent data for this stage";
  }
  const lower = reason.toLowerCase();
  if (lower.includes("passed without confirmation")) return "Confirm overdue milestone date";
  if (lower.includes("limited sample") || lower.includes("limited effective")) return "Limited data for next stage";
  if (lower.includes("disagreement")) return "Recent reports vary slightly";
  if (lower.includes("slow") || lower.includes("stalled")) return "Queue pace recently slowed";
  if (lower.includes("horizon") || lower.includes("4 months")) return "Longer wait adds uncertainty";
  if (lower.includes("old")) return "Awaiting newer queue updates";
  if (lower.includes("strong")) return "Strong recent community sample";
  if (lower.includes("solid")) return "Solid recent community data";
  return "Based on community observations";
}

/**
 * Adapts the 4 dashboard StatCards cleanly without arbitrary progress bars or technical jargon.
 */
export function adaptDashboardKpis(
  applicant: {
    waitingListDate?: string | null;
    submissionInviteDate?: string | null;
    appointmentDate?: string | null;
    interviewDate?: string | null;
    decisionDate?: string | null;
    visaStatus: string;
  },
  forecast: PersonalForecastResult | null,
  progressionHistory: { date: string; frontierDate: string; frontierMs?: number }[] = [],
  options: { active: boolean; waitingDays: number | null; hasWaitingListDate: boolean; forecastError?: boolean; now?: Date }
): DashboardKpiView {
  const now = options.now ?? new Date();
  const todayIso = now.toISOString().slice(0, 10);

  // 1. Waiting time
  const waitingSecondary = applicant.waitingListDate
    ? `Since ${formatDisplayDate(applicant.waitingListDate)}`
    : "Add waiting-list date";

  // 2. Queue frontier (distinct from personal milestone; real sparkline only if >= 3 chronological points)
  const validHistory = progressionHistory
    .filter((pt) => pt.date && pt.frontierDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const sparklinePoints: SparklinePoint[] =
    validHistory.length >= 3
      ? validHistory.map((pt) => ({
          date: pt.date,
          value: pt.frontierMs ?? new Date(`${pt.frontierDate}T00:00:00Z`).getTime(),
          label: `${formatShortMonthDay(pt.date)}: ${formatShortMonthDay(pt.frontierDate)}`,
        }))
      : [];

  let frontierSecondary = "Embassy submission cohort";
  if (options.forecastError) {
    frontierSecondary = "Could not load queue data";
  } else if (!options.hasWaitingListDate) {
    frontierSecondary = "Set waiting-list date";
  } else if (applicant.submissionInviteDate) {
    frontierSecondary = "Invite already received";
  } else if (forecast?.cohortAlreadyReached) {
    frontierSecondary = "Your cohort reached";
  } else if (forecast?.frontierLagDays !== null && forecast?.frontierLagDays !== undefined && forecast.frontierLagDays > 0) {
    frontierSecondary = `~${forecast.frontierLagDays}d ahead of you`;
  }

  // 3. Next milestone
  const bookedIso = applicant.appointmentDate ? applicant.appointmentDate.slice(0, 10) : null;
  const bookedIsFuture = Boolean(bookedIso && bookedIso >= todayIso && !applicant.interviewDate);
  const nextStage = forecast?.stages.find(
    (s) => s.status === "estimated" || s.status === "cohort_reached" || s.status === "needs_confirmation"
  );

  let nextValue = "—";
  let nextSecondary = options.forecastError ? "Unable to estimate" : "Pending milestone";

  if (applicant.decisionDate) {
    nextValue = "Complete";
    nextSecondary = "Visa decision recorded";
  } else if (bookedIsFuture && bookedIso) {
    nextValue = formatDisplayDate(bookedIso);
    nextSecondary = "Booked appointment";
  } else if (nextStage) {
    const stageName = STAGE_TITLES[nextStage.stage] ?? nextStage.label;
    if (nextStage.status === "needs_confirmation") {
      nextValue = "Confirm date";
      nextSecondary = stageName;
    } else if (nextStage.status === "cohort_reached") {
      nextValue = "Cohort reached";
      nextSecondary = stageName;
    } else if (nextStage.p50Date) {
      const s = forecast?.confidence === "low" && nextStage.p10Date ? nextStage.p10Date : nextStage.p25Date ?? nextStage.p50Date;
      const e = forecast?.confidence === "low" && nextStage.p90Date ? nextStage.p90Date : nextStage.p75Date ?? nextStage.p50Date;
      nextValue = formatConciseDateRange(s, e);
      nextSecondary = stageName;
    }
  } else if (forecast && forecast.stages.some((s) => s.status === "unavailable")) {
    nextValue = "Unavailable";
    nextSecondary = "Not enough data";
  }

  // 4. Forecast confidence
  const confLevel = forecast?.confidence ?? "insufficient";
  const confBars: 0 | 1 | 2 | 3 = !forecast
    ? 0
    : confLevel === "high"
      ? 3
      : confLevel === "moderate"
        ? 2
        : 1;

  return {
    waitingTime: {
      label: options.active ? "Waiting time" : "Process time",
      days: options.waitingDays,
      secondary: waitingSecondary,
    },
    queueFrontier: {
      label: "Queue frontier",
      value: forecast?.currentSubmissionFrontier ? formatDisplayDate(forecast.currentSubmissionFrontier) : "—",
      secondary: frontierSecondary,
      sparklinePoints,
    },
    nextMilestone: {
      label: "Next milestone",
      value: nextValue,
      secondary: nextSecondary,
    },
    confidence: {
      label: "Forecast confidence",
      value: forecast ? formatConfidenceLabel(confLevel) : "—",
      secondary: forecast ? simplifyConfidenceReason(forecast.confidenceReasons[0], confLevel) : "Add waiting-list date",
      bars: confBars,
    },
  };
}
