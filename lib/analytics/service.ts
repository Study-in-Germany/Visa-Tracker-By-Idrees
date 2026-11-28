import { ACTIVE_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getIntelligenceDashboardData } from "@/lib/forecasting/forecast-service";
import type { Embassy } from "@/lib/forecasting/types";
import { TEAM_PUBLIC_ID } from "@/lib/listings";
import { adaptQueueOverview, adaptStageDurationTimeline } from "./adapters";
import type { SparklinePoint } from "./types";

export async function getCanonicalOverviewData(now: Date = new Date()) {
  try {
    const [applicants, announcements, intelligence] = await Promise.all([
      prisma.applicant.findMany({
        where: { approval: "APPROVED", publicId: { not: TEAM_PUBLIC_ID } },
        orderBy: { createdAt: "desc" },
        select: {
          publicId: true,
          university: true,
          consulate: true,
          visaStatus: true,
          waitingListDate: true,
          submissionInviteDate: true,
          documentSubmissionDate: true,
          correctionRequestDate: true,
          correctionSubmittedDate: true,
          appointmentDate: true,
          interviewDate: true,
          decisionDate: true,
          createdAt: true,
        },
      }),
      prisma.announcement.findMany({
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 3,
      }),
      getIntelligenceDashboardData(now),
    ]);

    const activeSet = new Set(ACTIVE_STATUSES);
    const statusCounts: Record<string, number> = {};
    const monthJoinMap = new Map<string, number>();
    const cohortBounds: Partial<Record<Embassy, { minWlMs: number | null; maxWlMs: number | null }>> = {};

    let islamabad = 0;
    let karachi = 0;
    let active = 0;
    let issued = 0;
    let rejected = 0;
    let withdrawn = 0;

    for (const a of applicants) {
      statusCounts[a.visaStatus] = (statusCounts[a.visaStatus] ?? 0) + 1;
      if (a.consulate === "Islamabad") islamabad++;
      else if (a.consulate === "Karachi") karachi++;

      if (activeSet.has(a.visaStatus)) active++;
      if (a.visaStatus === "VISA_ISSUED") issued++;
      else if (a.visaStatus === "VISA_REJECTED") rejected++;
      else if (a.visaStatus === "WITHDRAWN") withdrawn++;

      if (a.waitingListDate && a.waitingListDate.getUTCFullYear() >= 2020) {
        const wlMs = a.waitingListDate.getTime();
        const mKey = `${a.waitingListDate.getUTCFullYear()}-${String(a.waitingListDate.getUTCMonth() + 1).padStart(2, "0")}`;
        monthJoinMap.set(mKey, (monthJoinMap.get(mKey) ?? 0) + 1);

        if (a.consulate === "Islamabad" || a.consulate === "Karachi") {
          const b = cohortBounds[a.consulate] ?? { minWlMs: null, maxWlMs: null };
          b.minWlMs = b.minWlMs === null ? wlMs : Math.min(b.minWlMs, wlMs);
          b.maxWlMs = b.maxWlMs === null ? wlMs : Math.max(b.maxWlMs, wlMs);
          cohortBounds[a.consulate] = b;
        }
      }
    }

    const monthlyJoinTrend: SparklinePoint[] = Array.from(monthJoinMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([month, count]) => ({ date: month, value: count, label: `${month}: ${count}` }));

    const queueOverview = adaptQueueOverview(intelligence, cohortBounds, now);
    const stageTimeline = adaptStageDurationTimeline(applicants, intelligence, now);

    return {
      ok: true as const,
      total: applicants.length,
      islamabad,
      karachi,
      active,
      issued,
      rejected,
      withdrawn,
      statusCounts,
      monthlyJoinTrend,
      queueOverview,
      stageTimeline,
      announcements,
      recentApplicants: applicants.slice(0, 5),
    };
  } catch (e) {
    console.error("[analytics/service] overview query failed", e);
    return { ok: false as const };
  }
}
