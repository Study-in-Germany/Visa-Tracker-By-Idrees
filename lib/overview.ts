import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache";
import { TEAM_PUBLIC_ID } from "@/lib/listings";
import { ACTIVE_STATUSES, CONSULATES } from "@/lib/constants";
import { ELIGIBLE_PUBLIC_APPLICANT_WHERE } from "@/lib/analytics-filter";

export type StageDurationMetric = {
  avgDays: number | null;
  medianDays: number | null;
  sampleSize: number;
  reliable: boolean;
};

export type EmbassyFrontier = {
  consulate: string;
  latestInvitedWlDate: string | null;
  latestInviteDate: string | null;
  confirmedCount: number;
  totalInEmbassy: number;
  activeInEmbassy: number;
};

export type OverviewData = {
  ok: true;
  total: number;
  islamabad: number;
  karachi: number;
  active: number;
  issued: number;
  rejected: number;
  withdrawn: number;
  statusCounts: Record<string, number>;
  embassies: EmbassyFrontier[];
  processing: {
    waitingToInvite: StageDurationMetric;
    submissionToAppointment: StageDurationMetric;
    appointmentToDecision: StageDurationMetric;
    totalEstimated: StageDurationMetric;
  };
  latestInvitations: {
    publicId: string;
    consulate: string;
    waitingListDate: string;
    submissionInviteDate: string;
    waitDays: number;
  }[];
  recentAppointments: {
    publicId: string;
    consulate: string;
    waitingListDate: string | null;
    appointmentDate: string;
    visaStatus: string;
  }[];
  recentActivity: {
    publicId: string;
    university: string | null;
    consulate: string;
    waitingListDate: string | null;
    visaStatus: string;
    updatedAt: string;
  }[];
  announcements: {
    id: string;
    title: string;
    body: string;
    consulate: string | null;
    pinned: boolean;
    createdAt: string;
  }[];
};

type AvgRow = {
  w2i_avg: number | null;
  w2i_med: number | null;
  w2i_n: bigint | number;
  s2a_avg: number | null;
  s2a_med: number | null;
  s2a_n: bigint | number;
  a2d_avg: number | null;
  a2d_med: number | null;
  a2d_n: bigint | number;
};

const ACTIVE_SET = new Set<string>(ACTIVE_STATUSES);

function toMetric(avgVal: number | null, medVal: number | null, countRaw: bigint | number): StageDurationMetric {
  const sampleSize = Number(countRaw || 0);
  return {
    avgDays: sampleSize > 0 && avgVal !== null ? Math.round(Number(avgVal)) : null,
    medianDays: sampleSize > 0 && medVal !== null ? Math.round(Number(medVal)) : null,
    sampleSize,
    reliable: sampleSize >= 5,
  };
}

async function computeOverviewData(): Promise<OverviewData> {
  const approvedBase = ELIGIBLE_PUBLIC_APPLICANT_WHERE;

  const [
    grouped,
    inviteSamples,
    avgRows,
    latestInvitesRaw,
    recentApptsRaw,
    recentActivityRaw,
    announcementsRaw,
  ] = await Promise.all([
    prisma.applicant.groupBy({
      by: ["consulate", "visaStatus"],
      where: approvedBase,
      _count: { _all: true },
    }),
    prisma.applicant.findMany({
      where: {
        ...approvedBase,
        waitingListDate: { gte: new Date("2000-01-01T00:00:00Z") },
        submissionInviteDate: { gte: new Date("2000-01-01T00:00:00Z"), lte: new Date() },
      },
      select: { consulate: true, waitingListDate: true, submissionInviteDate: true },
    }),
    prisma.$queryRaw<AvgRow[]>`
      SELECT
        AVG(CASE WHEN "waitingListDate" >= '2000-01-01' AND "submissionInviteDate" >= "waitingListDate" AND "submissionInviteDate" <= NOW()
          AND EXTRACT(EPOCH FROM ("submissionInviteDate" - "waitingListDate")) / 86400 BETWEEN 0 AND 730
          THEN EXTRACT(EPOCH FROM ("submissionInviteDate" - "waitingListDate")) / 86400 END)::float8 AS w2i_avg,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN "waitingListDate" >= '2000-01-01' AND "submissionInviteDate" >= "waitingListDate" AND "submissionInviteDate" <= NOW()
          AND EXTRACT(EPOCH FROM ("submissionInviteDate" - "waitingListDate")) / 86400 BETWEEN 0 AND 730
          THEN EXTRACT(EPOCH FROM ("submissionInviteDate" - "waitingListDate")) / 86400 END)::float8 AS w2i_med,
        COUNT(CASE WHEN "waitingListDate" >= '2000-01-01' AND "submissionInviteDate" >= "waitingListDate" AND "submissionInviteDate" <= NOW()
          AND EXTRACT(EPOCH FROM ("submissionInviteDate" - "waitingListDate")) / 86400 BETWEEN 0 AND 730 THEN 1 END) AS w2i_n,

        AVG(CASE WHEN "documentSubmissionDate" >= '2000-01-01' AND "appointmentDate" >= "documentSubmissionDate"
          AND EXTRACT(EPOCH FROM ("appointmentDate" - "documentSubmissionDate")) / 86400 BETWEEN 0 AND 730
          THEN EXTRACT(EPOCH FROM ("appointmentDate" - "documentSubmissionDate")) / 86400 END)::float8 AS s2a_avg,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN "documentSubmissionDate" >= '2000-01-01' AND "appointmentDate" >= "documentSubmissionDate"
          AND EXTRACT(EPOCH FROM ("appointmentDate" - "documentSubmissionDate")) / 86400 BETWEEN 0 AND 730
          THEN EXTRACT(EPOCH FROM ("appointmentDate" - "documentSubmissionDate")) / 86400 END)::float8 AS s2a_med,
        COUNT(CASE WHEN "documentSubmissionDate" >= '2000-01-01' AND "appointmentDate" >= "documentSubmissionDate"
          AND EXTRACT(EPOCH FROM ("appointmentDate" - "documentSubmissionDate")) / 86400 BETWEEN 0 AND 730 THEN 1 END) AS s2a_n,

        AVG(CASE WHEN "appointmentDate" >= '2000-01-01' AND "decisionDate" >= "appointmentDate"
          AND EXTRACT(EPOCH FROM ("decisionDate" - "appointmentDate")) / 86400 BETWEEN 0 AND 730
          THEN EXTRACT(EPOCH FROM ("decisionDate" - "appointmentDate")) / 86400 END)::float8 AS a2d_avg,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN "appointmentDate" >= '2000-01-01' AND "decisionDate" >= "appointmentDate"
          AND EXTRACT(EPOCH FROM ("decisionDate" - "appointmentDate")) / 86400 BETWEEN 0 AND 730
          THEN EXTRACT(EPOCH FROM ("decisionDate" - "appointmentDate")) / 86400 END)::float8 AS a2d_med,
        COUNT(CASE WHEN "appointmentDate" >= '2000-01-01' AND "decisionDate" >= "appointmentDate"
          AND EXTRACT(EPOCH FROM ("decisionDate" - "appointmentDate")) / 86400 BETWEEN 0 AND 730 THEN 1 END) AS a2d_n
      FROM "Applicant"
      WHERE "approval" = 'APPROVED'
        AND "publicId" <> ${TEAM_PUBLIC_ID}
        AND "publicId" NOT ILIKE 'DEMO-%'
        AND "publicId" NOT ILIKE 'TEST-%'
        AND ("email" IS NULL OR "email" NOT ILIKE '%@example.com')
    `,
    prisma.applicant.findMany({
      where: {
        ...approvedBase,
        waitingListDate: { gte: new Date("2000-01-01T00:00:00Z") },
        submissionInviteDate: { gte: new Date("2000-01-01T00:00:00Z"), lte: new Date() },
      },
      orderBy: { submissionInviteDate: "desc" },
      take: 16,
      select: { publicId: true, consulate: true, waitingListDate: true, submissionInviteDate: true },
    }),
    prisma.applicant.findMany({
      where: {
        ...approvedBase,
        appointmentDate: { gte: new Date("2000-01-01T00:00:00Z") },
      },
      orderBy: [{ updatedAt: "desc" }, { appointmentDate: "desc" }],
      take: 6,
      select: { publicId: true, consulate: true, waitingListDate: true, appointmentDate: true, visaStatus: true },
    }),
    prisma.applicant.findMany({
      where: approvedBase,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: { publicId: true, university: true, consulate: true, waitingListDate: true, visaStatus: true, updatedAt: true },
    }),
    prisma.announcement.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: { id: true, title: true, body: true, consulate: true, pinned: true, createdAt: true },
    }),
  ]);

  // Tally totals, status counts, and per-embassy counts from the single groupBy
  let total = 0;
  let islamabad = 0;
  let karachi = 0;
  let active = 0;
  let issued = 0;
  let rejected = 0;
  let withdrawn = 0;
  const statusCounts: Record<string, number> = {};
  const embassyTotals: Record<string, { total: number; active: number }> = {};

  for (const r of grouped) {
    const n = r._count._all;
    total += n;
    statusCounts[r.visaStatus] = (statusCounts[r.visaStatus] ?? 0) + n;
    if (r.consulate === "Islamabad") islamabad += n;
    if (r.consulate === "Karachi") karachi += n;
    if (ACTIVE_SET.has(r.visaStatus)) active += n;
    if (r.visaStatus === "VISA_ISSUED") issued += n;
    if (r.visaStatus === "VISA_REJECTED") rejected += n;
    if (r.visaStatus === "WITHDRAWN") withdrawn += n;

    embassyTotals[r.consulate] = embassyTotals[r.consulate] ?? { total: 0, active: 0 };
    embassyTotals[r.consulate].total += n;
    if (ACTIVE_SET.has(r.visaStatus)) embassyTotals[r.consulate].active += n;
  }

  // Embassy frontiers (robust 95th percentile of chronologically valid waitingListDate among invited records)
  const embassies: EmbassyFrontier[] = CONSULATES.map((consulate) => {
    const valid = inviteSamples
      .filter((s) => s.consulate === consulate && s.waitingListDate && s.submissionInviteDate && s.submissionInviteDate >= s.waitingListDate)
      .sort((a, b) => a.waitingListDate!.getTime() - b.waitingListDate!.getTime());

    let latestInvitedWlDate: string | null = null;
    if (valid.length > 0 && valid.length < 5) {
      latestInvitedWlDate = valid[valid.length - 1].waitingListDate!.toISOString();
    } else if (valid.length >= 5) {
      const idx = Math.min(valid.length - 1, Math.floor(valid.length * 0.95));
      latestInvitedWlDate = valid[idx].waitingListDate!.toISOString();
    }

    const latestInvite = valid.reduce<Date | null>(
      (max, r) => (!max || r.submissionInviteDate! > max ? r.submissionInviteDate! : max),
      null,
    );

    return {
      consulate,
      latestInvitedWlDate,
      latestInviteDate: latestInvite ? latestInvite.toISOString() : null,
      confirmedCount: valid.length,
      totalInEmbassy: embassyTotals[consulate]?.total ?? 0,
      activeInEmbassy: embassyTotals[consulate]?.active ?? 0,
    };
  });

  const row = avgRows[0] ?? { w2i_avg: null, w2i_med: null, w2i_n: 0, s2a_avg: null, s2a_med: null, s2a_n: 0, a2d_avg: null, a2d_med: null, a2d_n: 0 };
  const waitingToInvite = toMetric(row.w2i_avg, row.w2i_med, row.w2i_n);
  const submissionToAppointment = toMetric(row.s2a_avg, row.s2a_med, row.s2a_n);
  const appointmentToDecision = toMetric(row.a2d_avg, row.a2d_med, row.a2d_n);

  const stages = [waitingToInvite, submissionToAppointment, appointmentToDecision];
  const allHaveAvg = stages.every((s) => s.avgDays !== null);
  const minSample = Math.min(...stages.map((s) => s.sampleSize));
  const totalEstimated: StageDurationMetric = {
    avgDays: allHaveAvg ? stages.reduce((sum, s) => sum + (s.avgDays ?? 0), 0) : null,
    medianDays: stages.every((s) => s.medianDays !== null) ? stages.reduce((sum, s) => sum + (s.medianDays ?? 0), 0) : null,
    sampleSize: minSample,
    reliable: stages.every((s) => s.reliable),
  };

  const latestInvitations = latestInvitesRaw
    .filter((r) => r.waitingListDate && r.submissionInviteDate && r.submissionInviteDate >= r.waitingListDate)
    .slice(0, 6)
    .map((r) => ({
      publicId: r.publicId,
      consulate: r.consulate,
      waitingListDate: r.waitingListDate!.toISOString(),
      submissionInviteDate: r.submissionInviteDate!.toISOString(),
      waitDays: Math.max(0, Math.round((r.submissionInviteDate!.getTime() - r.waitingListDate!.getTime()) / 86_400_000)),
    }));

  const recentAppointments = recentApptsRaw.map((r) => ({
    publicId: r.publicId,
    consulate: r.consulate,
    waitingListDate: r.waitingListDate ? r.waitingListDate.toISOString() : null,
    appointmentDate: r.appointmentDate!.toISOString(),
    visaStatus: r.visaStatus,
  }));

  const recentActivity = recentActivityRaw.map((r) => ({
    publicId: r.publicId,
    university: r.university,
    consulate: r.consulate,
    waitingListDate: r.waitingListDate ? r.waitingListDate.toISOString() : null,
    visaStatus: r.visaStatus,
    updatedAt: r.updatedAt.toISOString(),
  }));

  const announcements = announcementsRaw.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    consulate: a.consulate,
    pinned: a.pinned,
    createdAt: a.createdAt.toISOString(),
  }));

  return {
    ok: true,
    total,
    islamabad,
    karachi,
    active,
    issued,
    rejected,
    withdrawn,
    statusCounts,
    embassies,
    processing: {
      waitingToInvite,
      submissionToAppointment,
      appointmentToDecision,
      totalEstimated,
    },
    latestInvitations,
    recentAppointments,
    recentActivity,
    announcements,
  };
}

export const getCachedOverviewData = unstable_cache(
  computeOverviewData,
  ["overview-v1"],
  { revalidate: 60, tags: [CACHE_TAGS.APPLICANTS, CACHE_TAGS.ANNOUNCEMENTS] },
);
