import type {
  CohortProgressItem,
  CorrectionAnalyticsStats,
  ProgressionHistoryPoint,
  ProgressionPointSource,
  WaitByInviteMonthItem,
  WeeklyActivityItem,
} from "./dashboard-types";

const DAY_MS = 86_400_000;

function toUtcMs(iso: string | null | undefined): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const ms = new Date(`${iso}T00:00:00Z`).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function getIsoMondayUtc(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDay();
  const monOffset = (day + 6) % 7;
  const mon = new Date(d.getTime() - monOffset * DAY_MS);
  return mon.toISOString().slice(0, 10);
}

export interface AdaptedProgressionChartPoint {
  obsMs: number;
  obsDate: string;
  subMs: number | null;
  subDate: string | null;
  apptMs: number | null;
  apptDate: string | null;
  /** Clean series omits flagged individual-report outliers so the main frontier curve stays honest without hiding them. */
  cleanSubMs: number | null;
  outlierSubMs: number | null;
  source: ProgressionPointSource;
  isAnomaly: boolean;
  anomalyReason: string | null;
  isGapSpacer?: boolean;
  reportedSubmissions: number | null;
  reportedCorrections: number | null;
  reportedAppointments: number | null;
}

export interface AdaptedProgressionSeries {
  points: AdaptedProgressionChartPoint[];
  rawPoints: AdaptedProgressionChartPoint[];
  flaggedAnomalies: AdaptedProgressionChartPoint[];
  totalObservations: number;
  checkpointCount: number;
  individualCount: number;
  gapCount: number;
}

/**
 * Transforms queue progression observations onto a true UTC time scale:
 * - Preserves chronological order and explicit missing-data gaps (> 14 days).
 * - Preserves genuine non-monotonic frontier movements in checkpoint data.
 * - Flags suspicious 0-day / off-trend individual timeline spikes without silently deleting them.
 */
export function adaptQueueProgressionSeries(
  rows: ProgressionHistoryPoint[],
  asOfDate: string
): AdaptedProgressionSeries {
  const asOfMs = toUtcMs(asOfDate) ?? Date.now();
  const sorted = [...rows]
    .filter((r) => {
      const ms = toUtcMs(r.observationDate);
      return ms !== null && ms <= asOfMs;
    })
    .sort((a, b) => a.observationDate.localeCompare(b.observationDate));

  // Reference baseline from structured queue checkpoints (or median wait across non-zero observations)
  const checkpointWaits = sorted
    .filter((r) => r.source !== "individual_report" && r.submissionFrontier)
    .map((r) => {
      const o = toUtcMs(r.observationDate);
      const s = toUtcMs(r.submissionFrontier);
      return o !== null && s !== null ? Math.round((o - s) / DAY_MS) : null;
    })
    .filter((w): w is number => w !== null && w >= 0);

  const allPositiveWaits = sorted
    .filter((r) => r.submissionFrontier)
    .map((r) => {
      const o = toUtcMs(r.observationDate);
      const s = toUtcMs(r.submissionFrontier);
      return o !== null && s !== null ? Math.round((o - s) / DAY_MS) : null;
    })
    .filter((w): w is number => w !== null && w > 14)
    .sort((a, b) => a - b);

  const refWaitDays =
    checkpointWaits.length > 0
      ? [...checkpointWaits].sort((a, b) => a - b)[Math.floor(checkpointWaits.length / 2)]
      : allPositiveWaits.length > 0
        ? allPositiveWaits[Math.floor(allPositiveWaits.length / 2)]
        : null;

  // Build local neighborhood median for individual-report outlier checks
  const rawPoints: AdaptedProgressionChartPoint[] = sorted.map((r, idx) => {
    const obsMs = toUtcMs(r.observationDate)!;
    const subMs = toUtcMs(r.submissionFrontier);
    const apptMs = toUtcMs(r.appointmentWlFrontier);

    let isAnomaly = false;
    let anomalyReason: string | null = null;

    if (r.source === "individual_report" && subMs !== null) {
      const impliedWaitDays = Math.round((obsMs - subMs) / DAY_MS);

      // Compute median frontier of surrounding checkpoints/points within +-21 days (excluding current)
      const neighborSubs = sorted
        .filter((other, oIdx) => {
          if (oIdx === idx || !other.submissionFrontier) return false;
          const oMs = toUtcMs(other.observationDate);
          if (oMs === null || Math.abs(oMs - obsMs) > 21 * DAY_MS) return false;
          const sMs = toUtcMs(other.submissionFrontier);
          if (sMs === null) return false;
          const w = Math.round((oMs - sMs) / DAY_MS);
          return refWaitDays !== null && refWaitDays > 60 ? w >= 14 : true;
        })
        .map((other) => toUtcMs(other.submissionFrontier)!)
        .sort((a, b) => a - b);

      const localMedSub =
        neighborSubs.length > 0 ? neighborSubs[Math.floor(neighborSubs.length / 2)] : null;

      if (impliedWaitDays <= 7 && refWaitDays !== null && refWaitDays > 60) {
        isAnomaly = true;
        anomalyReason = `Individual report shows ${impliedWaitDays}d wait vs ~${refWaitDays}d typical queue wait`;
      } else if (localMedSub !== null && Math.abs(subMs - localMedSub) > 45 * DAY_MS) {
        const diff = Math.round(Math.abs(subMs - localMedSub) / DAY_MS);
        isAnomaly = true;
        anomalyReason = `Individual report cohort diverges ${diff}d from surrounding queue observations`;
      }
    }

    return {
      obsMs,
      obsDate: r.observationDate,
      subMs,
      subDate: r.submissionFrontier,
      apptMs,
      apptDate: r.appointmentWlFrontier,
      cleanSubMs: isAnomaly ? null : subMs,
      outlierSubMs: isAnomaly ? subMs : null,
      source: r.source,
      isAnomaly,
      anomalyReason,
      reportedSubmissions: r.reportedSubmissions,
      reportedCorrections: r.reportedCorrections,
      reportedAppointments: r.reportedAppointments,
    };
  });

  // Insert explicit null gap spacers whenever consecutive valid observations are > 14 days apart
  const pointsWithGaps: AdaptedProgressionChartPoint[] = [];
  let gapCount = 0;
  for (let i = 0; i < rawPoints.length; i++) {
    const cur = rawPoints[i];
    if (i > 0) {
      const prev = rawPoints[i - 1];
      const deltaDays = (cur.obsMs - prev.obsMs) / DAY_MS;
      if (deltaDays > 14) {
        gapCount += 1;
        const midMs = Math.round((prev.obsMs + cur.obsMs) / 2);
        pointsWithGaps.push({
          obsMs: midMs,
          obsDate: new Date(midMs).toISOString().slice(0, 10),
          subMs: null,
          subDate: null,
          apptMs: null,
          apptDate: null,
          cleanSubMs: null,
          outlierSubMs: null,
          source: "combined",
          isAnomaly: false,
          anomalyReason: null,
          isGapSpacer: true,
          reportedSubmissions: null,
          reportedCorrections: null,
          reportedAppointments: null,
        });
      }
    }
    pointsWithGaps.push(cur);
  }

  return {
    points: pointsWithGaps,
    rawPoints,
    flaggedAnomalies: rawPoints.filter((p) => p.isAnomaly),
    totalObservations: rawPoints.length,
    checkpointCount: rawPoints.filter((p) => p.source === "queue_checkpoint" || p.source === "combined").length,
    individualCount: rawPoints.filter((p) => p.source === "individual_report").length,
    gapCount,
  };
}

export interface AdaptedWaitMonthPoint {
  month: string;
  medianDays: number;
  p25Days: number;
  p75Days: number;
  rangeSpan: [number, number];
  sampleSize: number;
  isSmallSample: boolean;
  isSuspiciousZeroDay: boolean;
}

export interface AdaptedHistoricalWaitResult {
  points: AdaptedWaitMonthPoint[];
  futureExcluded: { month: string; sampleSize: number }[];
  totalSamples: number;
  wellSupportedMonths: number;
}

export function adaptHistoricalWaitSeries(
  rows: WaitByInviteMonthItem[],
  asOfDate: string
): AdaptedHistoricalWaitResult {
  const currentMonth = asOfDate.slice(0, 7);
  const sorted = [...rows].sort((a, b) => a.month.localeCompare(b.month));

  const points: AdaptedWaitMonthPoint[] = [];
  const futureExcluded: { month: string; sampleSize: number }[] = [];

  for (const r of sorted) {
    if (r.month > currentMonth) {
      futureExcluded.push({ month: r.month, sampleSize: r.sampleSize });
      continue;
    }
    const low = Math.min(r.p25Days, r.medianDays);
    const high = Math.max(r.p75Days, r.medianDays);
    points.push({
      month: r.month,
      medianDays: r.medianDays,
      p25Days: r.p25Days,
      p75Days: r.p75Days,
      rangeSpan: [low, high],
      sampleSize: r.sampleSize,
      isSmallSample: r.sampleSize < 5,
      isSuspiciousZeroDay: r.medianDays === 0,
    });
  }

  return {
    points,
    futureExcluded,
    totalSamples: points.reduce((s, p) => s + p.sampleSize, 0),
    wellSupportedMonths: points.filter((p) => !p.isSmallSample).length,
  };
}

export interface AdaptedWeeklyActivityItem {
  weekStart: string;
  submissions: number;
  corrections: number;
  appointments: number;
  totalEvents: number;
  cohortDaysCleared: number | null;
  isCurrentWeek: boolean;
}

export interface AdaptedWeeklyActivityResult {
  weeks: AdaptedWeeklyActivityItem[];
  futureExcludedCount: number;
  sourceLabel: string;
}

export function adaptWeeklyActivitySeries(
  rows: WeeklyActivityItem[],
  asOfDate: string
): AdaptedWeeklyActivityResult {
  const currentMonday = getIsoMondayUtc(asOfDate);
  const sorted = [...rows].sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  const weeks: AdaptedWeeklyActivityItem[] = [];
  let futureExcludedCount = 0;

  for (const w of sorted) {
    if (w.weekStart > currentMonday) {
      futureExcludedCount += 1;
      continue;
    }
    weeks.push({
      weekStart: w.weekStart,
      submissions: w.submissions,
      corrections: w.corrections,
      appointments: w.appointments,
      totalEvents: w.submissions + w.corrections + w.appointments,
      cohortDaysCleared: w.cohortDaysCleared,
      isCurrentWeek: w.weekStart === currentMonday,
    });
  }

  return {
    weeks,
    futureExcludedCount,
    sourceLabel: "Combined deduplicated timeline events",
  };
}

export interface AdaptedCorrectionStats {
  eligibleSubmissionsCount: number;
  applicantsWithCorrection: number;
  withoutCorrection: number;
  totalCorrectionEvents: number;
  repeatCorrectionEvents: number;
  correctionRatePct: number | null;
  hasSufficientDenominator: boolean;
  postCorrectionMedianDays: number | null;
  postCorrectionSampleSize: number;
  hasSufficientPostCorrection: boolean;
}

export function adaptCorrectionView(
  corr: CorrectionAnalyticsStats
): AdaptedCorrectionStats {
  const hasSufficientDenominator = corr.eligibleSubmissionsCount >= 5;
  const hasSufficientPostCorrection =
    corr.postCorrectionProcessing.sampleSize >= 5 &&
    corr.postCorrectionProcessing.median !== null;

  return {
    eligibleSubmissionsCount: corr.eligibleSubmissionsCount,
    applicantsWithCorrection: corr.applicantsWithCorrection,
    withoutCorrection: Math.max(0, corr.eligibleSubmissionsCount - corr.applicantsWithCorrection),
    totalCorrectionEvents: corr.totalCorrectionEvents,
    repeatCorrectionEvents: Math.max(0, corr.totalCorrectionEvents - corr.applicantsWithCorrection),
    correctionRatePct: hasSufficientDenominator ? corr.correctionRatePct : null,
    hasSufficientDenominator,
    postCorrectionMedianDays: hasSufficientPostCorrection
      ? Math.round(corr.postCorrectionProcessing.median!)
      : null,
    postCorrectionSampleSize: corr.postCorrectionProcessing.sampleSize,
    hasSufficientPostCorrection,
  };
}

export interface CohortChartRow {
  month: string;
  total: number;
  waitingList: number;
  submissionInvited: number;
  documentsSubmitted: number;
  appointmentStage: number;
  visaIssued: number;
  visaRejected: number;
  withdrawn: number;
  waitingListPct: number;
  submissionInvitedPct: number;
  documentsSubmittedPct: number;
  appointmentStagePct: number;
  visaIssuedPct: number;
  visaRejectedPct: number;
  withdrawnPct: number;
}

export function adaptCohortMatrix(
  rows: CohortProgressItem[]
): CohortChartRow[] {
  const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);
  return [...rows]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((r) => ({
      ...r,
      waitingListPct: pct(r.waitingList, r.total),
      submissionInvitedPct: pct(r.submissionInvited, r.total),
      documentsSubmittedPct: pct(r.documentsSubmitted, r.total),
      appointmentStagePct: pct(r.appointmentStage, r.total),
      visaIssuedPct: pct(r.visaIssued, r.total),
      visaRejectedPct: pct(r.visaRejected, r.total),
      withdrawnPct: pct(r.withdrawn, r.total),
    }));
}
