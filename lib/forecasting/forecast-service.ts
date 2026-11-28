import { hasForecastDelegates, prisma } from "@/lib/db";
import { TEAM_PUBLIC_ID } from "@/lib/listings";
import { EMBASSIES, MODEL_VERSION } from "./config";
import { normalizeExternalTimeline, normalizeInternalApplicant } from "./data-validation";
import { toIsoDay, toUtcDay } from "./date-utils";
import { combineAndDeduplicateJourneys, deduplicateQueuePoints } from "./deduplication";
import { computeEmbassyDurations, type EmbassyDurationProfile } from "./duration-model";
import { buildPersonalForecast } from "./forecast-ensemble";
import { computeEmbassyFrontiers } from "./queue-frontier";
import { buildFrontierSeries, computeQueueVelocity } from "./queue-velocity";
import type {
  Embassy,
  EmbassyFrontierSummary,
  NormalizedJourneyRecord,
  PersonalForecastInput,
  PersonalForecastResult,
  QueueObservationPoint,
  QueueVelocitySummary,
} from "./types";

interface CachedDataset {
  loadedAt: number;
  version: number;
  journeys: NormalizedJourneyRecord[];
  internalCount: number;
  externalCount: number;
  queuePoints: QueueObservationPoint[];
}

const globalCache = globalThis as unknown as {
  __vtForecastVersion?: number;
  __vtForecastDataset?: CachedDataset;
};

export function invalidateForecastCache() {
  globalCache.__vtForecastVersion = (globalCache.__vtForecastVersion ?? 0) + 1;
  globalCache.__vtForecastDataset = undefined;
}

export async function loadForecastDataset(asOfDate: Date = toUtcDay(new Date())): Promise<CachedDataset> {
  const version = globalCache.__vtForecastVersion ?? 0;
  const cached = globalCache.__vtForecastDataset;
  if (cached && cached.version === version && Date.now() - cached.loadedAt < 60_000) {
    return cached;
  }

  let internalNorm: NormalizedJourneyRecord[] = [];
  let externalNorm: NormalizedJourneyRecord[] = [];
  let queuePoints: QueueObservationPoint[] = [];

  if (hasForecastDelegates) {
    const [internalRows, externalRows, queueRows] = await Promise.all([
      prisma.applicant.findMany({
        where: { approval: "APPROVED", publicId: { not: TEAM_PUBLIC_ID } },
        select: {
          id: true,
          consulate: true,
          visaType: true,
          visaStatus: true,
          waitingListDate: true,
          submissionInviteDate: true,
          documentSubmissionDate: true,
          preliminaryReviewDate: true,
          correctionRequestDate: true,
          correctionSubmittedDate: true,
          correctionAcceptedDate: true,
          appointmentInviteDate: true,
          appointmentDate: true,
          interviewDate: true,
          decisionDate: true,
          passportDispatchedDate: true,
          passportReceivedDate: true,
          lastConfirmedAt: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      prisma.externalTimelineObservation.findMany({
        where: { verificationStatus: "APPROVED" },
        include: { source: { select: { reliability: true } } },
      }),
      prisma.queueObservation.findMany({
        where: { verificationStatus: "APPROVED" },
        include: { source: { select: { name: true, sourceType: true, reliability: true } } },
        orderBy: { observationDate: "asc" },
      }),
    ]);

    internalNorm = internalRows
      .map((r) => normalizeInternalApplicant(r, asOfDate))
      .filter((x): x is NormalizedJourneyRecord => x !== null);

    externalNorm = externalRows
      .map((r) => normalizeExternalTimeline({ ...r, reliability: r.source.reliability }, asOfDate))
      .filter((x): x is NormalizedJourneyRecord => x !== null);

    queuePoints = deduplicateQueuePoints(
      queueRows
        .filter((q) => q.embassy === "Islamabad" || q.embassy === "Karachi")
        .map((q) => ({
          id: q.id,
          sourceName: q.source.name,
          sourceType: q.source.sourceType,
          reliability: q.source.reliability,
          embassy: q.embassy as Embassy,
          queueType: q.queueType,
          observationDate: toUtcDay(q.observationDate),
          observedFrontierDate: toUtcDay(q.observedFrontierDate),
          sampleSize: q.sampleSize,
          reportedSubmissions: q.reportedSubmissions,
          reportedCorrections: q.reportedCorrections,
          reportedAppointments: q.reportedAppointments,
          reportedActivityCount: q.reportedActivityCount,
          confidence: q.confidence,
        }))
    );
  } else {
    // Stale dev Prisma client in RAM before server restart: query pre-migration fields + SQL tables directly.
    const [internalRows, externalRaw, queueRaw] = await Promise.all([
      prisma.applicant.findMany({
        where: { approval: "APPROVED", publicId: { not: TEAM_PUBLIC_ID } },
        select: {
          id: true,
          consulate: true,
          visaType: true,
          visaStatus: true,
          waitingListDate: true,
          submissionInviteDate: true,
          documentSubmissionDate: true,
          correctionRequestDate: true,
          correctionSubmittedDate: true,
          appointmentDate: true,
          interviewDate: true,
          decisionDate: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
      prisma.$queryRaw<Array<{
        id: string;
        embassy: string;
        visaCategory: string;
        reliability: string;
        confidence: number;
        reportPublishedAt: Date;
        waitingListJoinedDate: Date | null;
        submissionInvitedDate: Date | null;
        documentsSubmittedDate: Date | null;
        preliminaryReviewDate: Date | null;
        correctionRequestDates: unknown;
        correctionResponseDates: unknown;
        correctionAcceptedDate: Date | null;
        appointmentInvitedDate: Date | null;
        appointmentBookedDate: Date | null;
        appointmentAttendedDate: Date | null;
        decisionDate: Date | null;
        decisionOutcome: string | null;
        passportDispatchedDate: Date | null;
        passportReceivedDate: Date | null;
        dedupeFingerprint: string;
      }>>`
        SELECT e."id", e."embassy", e."visaCategory", s."reliability"::text AS "reliability",
               e."confidence", e."reportPublishedAt", e."waitingListJoinedDate",
               e."submissionInvitedDate", e."documentsSubmittedDate", e."preliminaryReviewDate",
               e."correctionRequestDates", e."correctionResponseDates", e."correctionAcceptedDate",
               e."appointmentInvitedDate", e."appointmentBookedDate", e."appointmentAttendedDate",
               e."decisionDate", e."decisionOutcome", e."passportDispatchedDate",
               e."passportReceivedDate", e."dedupeFingerprint"
        FROM "ExternalTimelineObservation" e
        JOIN "EvidenceSource" s ON s."id" = e."sourceId"
        WHERE e."verificationStatus"::text = 'APPROVED'
      `,
      prisma.$queryRaw<Array<{
        id: string;
        sourceName: string;
        sourceType: string;
        reliability: QueueObservationPoint["reliability"];
        embassy: string;
        queueType: QueueObservationPoint["queueType"];
        observationDate: Date;
        observedFrontierDate: Date;
        sampleSize: number | null;
        reportedSubmissions: number | null;
        reportedCorrections: number | null;
        reportedAppointments: number | null;
        reportedActivityCount: number | null;
        confidence: number;
      }>>`
        SELECT q."id", s."name" AS "sourceName", s."sourceType"::text AS "sourceType",
               s."reliability"::text AS "reliability", q."embassy", q."queueType"::text AS "queueType",
               q."observationDate", q."observedFrontierDate", q."sampleSize",
               q."reportedSubmissions", q."reportedCorrections", q."reportedAppointments",
               q."reportedActivityCount", q."confidence"
        FROM "QueueObservation" q
        JOIN "EvidenceSource" s ON s."id" = q."sourceId"
        WHERE q."verificationStatus"::text = 'APPROVED'
        ORDER BY q."observationDate" ASC
      `,
    ]);

    internalNorm = internalRows
      .map((r) => normalizeInternalApplicant(r, asOfDate))
      .filter((x): x is NormalizedJourneyRecord => x !== null);

    externalNorm = externalRaw
      .map((r) => normalizeExternalTimeline(r, asOfDate))
      .filter((x): x is NormalizedJourneyRecord => x !== null);

    queuePoints = deduplicateQueuePoints(
      queueRaw
        .filter((q) => q.embassy === "Islamabad" || q.embassy === "Karachi")
        .map((q) => ({
          ...q,
          embassy: q.embassy as Embassy,
          observationDate: toUtcDay(q.observationDate),
          observedFrontierDate: toUtcDay(q.observedFrontierDate),
        }))
    );
  }

  const journeys = combineAndDeduplicateJourneys(internalNorm, externalNorm);

  const fresh: CachedDataset = {
    loadedAt: Date.now(),
    version,
    journeys,
    internalCount: internalNorm.length,
    externalCount: externalNorm.length,
    queuePoints,
  };
  globalCache.__vtForecastDataset = fresh;
  return fresh;
}

export interface EmbassyIntelligenceReport {
  modelVersion: string;
  generatedAt: string;
  embassy: Embassy;
  frontiers: {
    submission: EmbassyFrontierSummary;
    appointmentBySubmission: EmbassyFrontierSummary;
    appointmentByWaitingList: EmbassyFrontierSummary;
  };
  velocity: QueueVelocitySummary;
  durations: Omit<EmbassyDurationProfile, "waitingToInviteSurvival"> & {
    survivalMedianDays: number | null;
    survivalP25Days: number | null;
    survivalP75Days: number | null;
  };
  progressionHistory: {
    observationDate: string;
    submissionFrontier: string | null;
    appointmentWlFrontier: string | null;
    reportedSubmissions: number | null;
    reportedCorrections: number | null;
    reportedAppointments: number | null;
  }[];
  weeklyActivity: {
    weekStart: string;
    submissions: number;
    corrections: number;
    appointments: number;
    cohortDaysCleared: number | null;
  }[];
  cohortProgress: {
    month: string;
    total: number;
    waitingList: number;
    submissionInvited: number;
    documentsSubmitted: number;
    appointmentStage: number;
    visaIssued: number;
    visaRejected: number;
    withdrawn: number;
  }[];
  waitByInviteMonth: {
    month: string;
    medianDays: number;
    p25Days: number;
    p75Days: number;
    sampleSize: number;
  }[];
}

export async function getIntelligenceDashboardData(asOfDate: Date = toUtcDay(new Date())) {
  const ds = await loadForecastDataset(asOfDate);

  const byEmbassy = EMBASSIES.reduce(
    (acc, embassy) => {
      const frontiers = computeEmbassyFrontiers(embassy, ds.journeys, ds.queuePoints, asOfDate);
      const velocity = computeQueueVelocity(embassy, "SUBMISSION_FRONTIER", ds.journeys, ds.queuePoints, asOfDate);
      const { waitingToInviteSurvival, ...durRest } = computeEmbassyDurations(embassy, ds.journeys, asOfDate);

      // Queue progression history (daily/reported frontier points + internal timeline frontier points)
      const dayMap = new Map<
        string,
        {
          observationDate: string;
          submissionFrontier: string | null;
          appointmentWlFrontier: string | null;
          reportedSubmissions: number | null;
          reportedCorrections: number | null;
          reportedAppointments: number | null;
        }
      >();

      for (const q of ds.queuePoints.filter((p) => p.embassy === embassy)) {
        const day = toIsoDay(q.observationDate)!;
        const slot = dayMap.get(day) ?? {
          observationDate: day,
          submissionFrontier: null,
          appointmentWlFrontier: null,
          reportedSubmissions: null,
          reportedCorrections: null,
          reportedAppointments: null,
        };
        if (q.queueType === "SUBMISSION_FRONTIER") slot.submissionFrontier = toIsoDay(q.observedFrontierDate);
        if (q.queueType === "APPOINTMENT_WL_COHORT_FRONTIER") slot.appointmentWlFrontier = toIsoDay(q.observedFrontierDate);
        if (q.reportedSubmissions !== null) slot.reportedSubmissions = q.reportedSubmissions;
        if (q.reportedCorrections !== null) slot.reportedCorrections = q.reportedCorrections;
        if (q.reportedAppointments !== null) slot.reportedAppointments = q.reportedAppointments;
        dayMap.set(day, slot);
      }

      // Include grouped invite milestones if not already covered
      for (const pt of buildFrontierSeries(embassy, "SUBMISSION_FRONTIER", ds.journeys, [], asOfDate)) {
        const day = toIsoDay(new Date(pt.obsMs))!;
        const slot = dayMap.get(day) ?? {
          observationDate: day,
          submissionFrontier: null,
          appointmentWlFrontier: null,
          reportedSubmissions: null,
          reportedCorrections: null,
          reportedAppointments: null,
        };
        if (!slot.submissionFrontier) slot.submissionFrontier = toIsoDay(new Date(pt.frontierMs));
        dayMap.set(day, slot);
      }

      const progressionHistory = Array.from(dayMap.values()).sort((a, b) =>
        a.observationDate.localeCompare(b.observationDate)
      );

      // Weekly processing activity aggregated by ISO Monday week start
      const weekMap = new Map<
        string,
        { weekStart: string; submissions: number; corrections: number; appointments: number; frontiers: number[] }
      >();
      const weekKey = (d: Date) => {
        const day = d.getUTCDay();
        const monOffset = (day + 6) % 7;
        const mon = new Date(d.getTime() - monOffset * 86_400_000);
        return toIsoDay(mon)!;
      };
      for (const r of ds.journeys.filter((j) => j.embassy === embassy)) {
        if (r.submissionInvitedDate) {
          const wk = weekKey(r.submissionInvitedDate);
          const s = weekMap.get(wk) ?? { weekStart: wk, submissions: 0, corrections: 0, appointments: 0, frontiers: [] };
          s.submissions++;
          if (r.waitingListJoinedDate) s.frontiers.push(r.waitingListJoinedDate.getTime());
          weekMap.set(wk, s);
        }
        for (const cr of r.correctionRequestDates) {
          const wk = weekKey(cr);
          const s = weekMap.get(wk) ?? { weekStart: wk, submissions: 0, corrections: 0, appointments: 0, frontiers: [] };
          s.corrections++;
          weekMap.set(wk, s);
        }
        if (r.appointmentInvitedDate) {
          const wk = weekKey(r.appointmentInvitedDate);
          const s = weekMap.get(wk) ?? { weekStart: wk, submissions: 0, corrections: 0, appointments: 0, frontiers: [] };
          s.appointments++;
          weekMap.set(wk, s);
        }
      }
      const weeklyActivity = Array.from(weekMap.values())
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
        .slice(-12)
        .map((w) => ({
          weekStart: w.weekStart,
          submissions: w.submissions,
          corrections: w.corrections,
          appointments: w.appointments,
          cohortDaysCleared:
            w.frontiers.length >= 2
              ? Math.round((Math.max(...w.frontiers) - Math.min(...w.frontiers)) / 86_400_000)
              : null,
        }));

      // Progress by joining month — strictly mutually exclusive current outcome categories per internal applicant
      const cohortMap = new Map<
        string,
        {
          month: string;
          total: number;
          waitingList: number;
          submissionInvited: number;
          documentsSubmitted: number;
          appointmentStage: number;
          visaIssued: number;
          visaRejected: number;
          withdrawn: number;
        }
      >();
      for (const r of ds.journeys.filter((j) => j.embassy === embassy && j.sourceType === "internal" && j.waitingListJoinedDate)) {
        const m = toIsoDay(r.waitingListJoinedDate)!.slice(0, 7);
        const slot = cohortMap.get(m) ?? {
          month: m,
          total: 0,
          waitingList: 0,
          submissionInvited: 0,
          documentsSubmitted: 0,
          appointmentStage: 0,
          visaIssued: 0,
          visaRejected: 0,
          withdrawn: 0,
        };
        slot.total++;
        if (r.decisionOutcome === "APPROVED") slot.visaIssued++;
        else if (r.decisionOutcome === "REJECTED") slot.visaRejected++;
        else if (r.decisionOutcome === "WITHDRAWN") slot.withdrawn++;
        else if (r.appointmentAttendedDate || r.appointmentBookedDate || r.appointmentInvitedDate) slot.appointmentStage++;
        else if (r.documentsSubmittedDate) slot.documentsSubmitted++;
        else if (r.submissionInvitedDate) slot.submissionInvited++;
        else slot.waitingList++;
        cohortMap.set(m, slot);
      }
      const cohortProgress = Array.from(cohortMap.values()).sort((a, b) => a.month.localeCompare(b.month));

      // Historical wait by invitation month
      const inviteMonths = new Map<string, number[]>();
      for (const r of ds.journeys.filter((j) => j.embassy === embassy && j.waitingListJoinedDate && j.submissionInvitedDate)) {
        const wait = Math.round((r.submissionInvitedDate!.getTime() - r.waitingListJoinedDate!.getTime()) / 86_400_000);
        if (wait < 0 || wait > 730) continue;
        const m = toIsoDay(r.submissionInvitedDate)!.slice(0, 7);
        const arr = inviteMonths.get(m) ?? [];
        arr.push(wait);
        inviteMonths.set(m, arr);
      }
      const waitByInviteMonth = Array.from(inviteMonths.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, arr]) => {
          const s = [...arr].sort((x, y) => x - y);
          const pick = (q: number) => Math.round(s[Math.min(s.length - 1, Math.floor((s.length - 1) * q))]);
          return {
            month,
            medianDays: pick(0.5),
            p25Days: pick(0.25),
            p75Days: pick(0.75),
            sampleSize: s.length,
          };
        });

      acc[embassy] = {
        modelVersion: MODEL_VERSION,
        generatedAt: new Date().toISOString(),
        embassy,
        frontiers,
        velocity,
        durations: {
          ...durRest,
          survivalMedianDays: waitingToInviteSurvival.medianDays,
          survivalP25Days: waitingToInviteSurvival.p25Days,
          survivalP75Days: waitingToInviteSurvival.p75Days,
        },
        progressionHistory,
        weeklyActivity,
        cohortProgress,
        waitByInviteMonth,
      };
      return acc;
    },
    {} as Record<Embassy, EmbassyIntelligenceReport>
  );

  const cohortBounds: Partial<Record<Embassy, { minWlIso: string | null; maxWlIso: string | null }>> = {};
  for (const embassy of EMBASSIES) {
    const wlDates = ds.journeys
      .filter((j) => j.embassy === embassy && j.sourceType === "internal" && j.waitingListJoinedDate && j.waitingListJoinedDate.getUTCFullYear() >= 2020)
      .map((j) => toIsoDay(j.waitingListJoinedDate)!)
      .filter(Boolean)
      .sort();
    cohortBounds[embassy] = {
      minWlIso: wlDates.length > 0 ? wlDates[0] : null,
      maxWlIso: wlDates.length > 0 ? wlDates[wlDates.length - 1] : null,
    };
  }

  return {
    modelVersion: MODEL_VERSION,
    generatedAt: new Date().toISOString(),
    datasetSummary: {
      internalApprovedCount: ds.internalCount,
      externalTimelineCount: ds.externalCount,
      combinedDeduplicatedCount: ds.journeys.length,
      queueObservationsCount: ds.queuePoints.length,
    },
    cohortBounds,
    embassies: byEmbassy,
  };
}

export async function generatePersonalForecast(
  input: PersonalForecastInput,
  options: { applicantId?: string; persistSnapshot?: boolean; iterations?: number } = {}
): Promise<PersonalForecastResult> {
  const ds = await loadForecastDataset(toUtcDay(new Date()));
  const forecast = buildPersonalForecast(input, ds.journeys, ds.queuePoints, toUtcDay(new Date()), {
    iterations: options.iterations,
  });

  if (hasForecastDelegates && options.persistSnapshot && options.applicantId) {
    const nextStage = forecast.stages.find((s) => s.status === "estimated" || s.status === "cohort_reached");
    if (nextStage) {
      await prisma.forecastSnapshot
        .create({
          data: {
            applicantId: options.applicantId,
            modelVersion: forecast.modelVersion,
            embassy: forecast.embassy,
            visaCategory: forecast.visaCategory,
            inputJoinDate: input.waitingListJoinedDate,
            predictedMilestone: nextStage.stage,
            p10Date: nextStage.p10Date ? new Date(`${nextStage.p10Date}T00:00:00Z`) : null,
            p25Date: nextStage.p25Date ? new Date(`${nextStage.p25Date}T00:00:00Z`) : null,
            p50Date: nextStage.p50Date ? new Date(`${nextStage.p50Date}T00:00:00Z`) : null,
            p75Date: nextStage.p75Date ? new Date(`${nextStage.p75Date}T00:00:00Z`) : null,
            p90Date: nextStage.p90Date ? new Date(`${nextStage.p90Date}T00:00:00Z`) : null,
            sourcesSummary: forecast.methodologySummary,
            sampleSize: nextStage.sampleSize,
            effectiveSampleSize: nextStage.effectiveSampleSize,
            confidenceLevel: forecast.confidence,
          },
        })
        .catch(() => {});
    }
  }

  return forecast;
}
