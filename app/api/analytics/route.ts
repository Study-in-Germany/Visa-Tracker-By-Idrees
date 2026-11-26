import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { waitingListWhere } from "@/lib/period";
import { ACTIVE_STATUSES, CONSULATES } from "@/lib/constants";
import { CACHE_TAGS } from "@/lib/cache";
import { ELIGIBLE_PUBLIC_APPLICANT_WHERE } from "@/lib/analytics-filter";

function daysBetween(a: Date | null, b: Date | null) {
  if (!a || !b) return null;
  if (a.getUTCFullYear() < 2000 || b.getUTCFullYear() < 2000) return null;
  const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0 || diff > 730) return null;
  return diff;
}

function avg(nums: number[]) {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((s, d) => s + d, 0) / nums.length);
}

const getCachedAnalytics = unstable_cache(
  async (consulateKey: string, fromStr: string, toStr: string) => {
    const consulate = consulateKey || undefined;
    const waitingListDate = waitingListWhere(fromStr || null, toStr || null);

    const applicants = await prisma.applicant.findMany({
      where: {
        ...ELIGIBLE_PUBLIC_APPLICANT_WHERE,
        ...(consulate ? { consulate } : {}),
        ...(waitingListDate ? { waitingListDate } : {}),
      },
      select: {
        university: true,
        consulate: true,
        visaStatus: true,
        waitingListDate: true,
        submissionInviteDate: true,
        documentSubmissionDate: true,
        appointmentDate: true,
        decisionDate: true,
      },
    });

    const total = applicants.length;
    const statusCounts: Record<string, number> = {};
    for (const a of applicants) statusCounts[a.visaStatus] = (statusCounts[a.visaStatus] || 0) + 1;

    const activeStatuses = new Set(ACTIVE_STATUSES);
    const activeApplicants = applicants.filter((a) => activeStatuses.has(a.visaStatus)).length;
    const completedCases = applicants.filter((a) =>
      ["VISA_ISSUED", "VISA_REJECTED", "WITHDRAWN"].includes(a.visaStatus),
    ).length;
    const visaIssued = statusCounts["VISA_ISSUED"] || 0;
    const visaRejected = statusCounts["VISA_REJECTED"] || 0;

    const uniCounts: Record<string, number> = {};
    for (const a of applicants) {
      if (!a.university) continue;
      uniCounts[a.university] = (uniCounts[a.university] || 0) + 1;
    }
    const topUniversities = Object.entries(uniCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([university, count]) => ({ university, count }));

    const byConsulate: Record<string, typeof applicants> = {};
    for (const a of applicants) {
      byConsulate[a.consulate] = byConsulate[a.consulate] || [];
      byConsulate[a.consulate].push(a);
    }
    const consulateComparison = Object.entries(byConsulate).map(([cName, list]) => {
      const wToS = list.map((a) => daysBetween(a.waitingListDate, a.submissionInviteDate)).filter((d): d is number => d !== null);
      const sToA = list.map((a) => daysBetween(a.documentSubmissionDate, a.appointmentDate)).filter((d): d is number => d !== null);
      const aToD = list.map((a) => daysBetween(a.appointmentDate, a.decisionDate)).filter((d): d is number => d !== null);
      return {
        consulate: cName,
        total: list.length,
        issued: list.filter((a) => a.visaStatus === "VISA_ISSUED").length,
        rejected: list.filter((a) => a.visaStatus === "VISA_REJECTED").length,
        avgWaitingToSubmission: avg(wToS),
        avgSubmissionToAppointment: avg(sToA),
        avgAppointmentToDecision: avg(aToD),
      };
    });

    const waitingToSubmission = applicants
      .map((a) => daysBetween(a.waitingListDate, a.submissionInviteDate))
      .filter((d): d is number => d !== null);
    const submissionToAppointment = applicants
      .map((a) => daysBetween(a.documentSubmissionDate, a.appointmentDate))
      .filter((d): d is number => d !== null);
    const appointmentToDecision = applicants
      .map((a) => daysBetween(a.appointmentDate, a.decisionDate))
      .filter((d): d is number => d !== null);

    const monthCounts: Record<string, number> = {};
    const monthOutcomes: Record<string, { issued: number; rejected: number }> = {};
    for (const a of applicants) {
      const d = a.waitingListDate;
      if (!d || d.getUTCFullYear() < 2000) continue;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
    for (const a of applicants) {
      const d = a.decisionDate;
      if (!d || d.getUTCFullYear() < 2000) continue;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      monthOutcomes[key] = monthOutcomes[key] || { issued: 0, rejected: 0 };
      if (a.visaStatus === "VISA_ISSUED") monthOutcomes[key].issued++;
      if (a.visaStatus === "VISA_REJECTED") monthOutcomes[key].rejected++;
    }
    const monthlyVolume = Object.entries(monthCounts)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, count]) => ({ month, count }));
    const monthlyOutcomes = Object.entries(monthOutcomes)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, v]) => ({ month, ...v }));

    return {
      total,
      activeApplicants,
      completedCases,
      visaIssued,
      visaRejected,
      statusCounts,
      topUniversities,
      consulateComparison,
      processing: {
        avgWaitingToSubmission: avg(waitingToSubmission),
        avgSubmissionToAppointment: avg(submissionToAppointment),
        avgAppointmentToDecision: avg(appointmentToDecision),
        sampleSizes: {
          waitingToSubmission: waitingToSubmission.length,
          submissionToAppointment: submissionToAppointment.length,
          appointmentToDecision: appointmentToDecision.length,
        },
      },
      monthlyVolume,
      monthlyOutcomes,
    };
  },
  ["analytics-v1"],
  { revalidate: 120, tags: [CACHE_TAGS.APPLICANTS] },
);

// GET /api/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD&consulate=Islamabad
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const consulate = searchParams.get("consulate") || "";
  if (consulate && !CONSULATES.includes(consulate)) {
    return NextResponse.json({ error: "Invalid consulate filter" }, { status: 400 });
  }
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const payload = await getCachedAnalytics(consulate, from, to);
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
