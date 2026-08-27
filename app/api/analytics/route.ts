import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function daysBetween(a: Date | null, b: Date | null) {
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function avg(nums: number[]) {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((s, d) => s + d, 0) / nums.length);
}

export async function GET() {
  const applicants = await prisma.applicant.findMany({
    where: { approval: "APPROVED" },
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

  // Status funnel counts
  const statusCounts: Record<string, number> = {};
  for (const a of applicants) statusCounts[a.visaStatus] = (statusCounts[a.visaStatus] || 0) + 1;

  const activeStatuses = new Set([
    "WAITING_LIST",
    "WAITING_FOR_SUBMISSION",
    "SUBMISSION_RECEIVED",
    "UNDER_CORRECTION",
    "APPOINTMENT_SCHEDULED",
    "PROCESSING",
  ]);
  const activeApplicants = applicants.filter((a) => activeStatuses.has(a.visaStatus)).length;
  const completedCases = applicants.filter((a) =>
    ["VISA_ISSUED", "VISA_REJECTED", "WITHDRAWN"].includes(a.visaStatus)
  ).length;
  const visaIssued = statusCounts["VISA_ISSUED"] || 0;
  const visaRejected = statusCounts["VISA_REJECTED"] || 0;

  // Top universities by volume
  const uniCounts: Record<string, number> = {};
  for (const a of applicants) {
    if (!a.university) continue;
    uniCounts[a.university] = (uniCounts[a.university] || 0) + 1;
  }
  const topUniversities = Object.entries(uniCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([university, count]) => ({ university, count }));

  // Consulate breakdown + comparison
  const byConsulate: Record<string, typeof applicants> = {};
  for (const a of applicants) {
    byConsulate[a.consulate] = byConsulate[a.consulate] || [];
    byConsulate[a.consulate].push(a);
  }
  const consulateComparison = Object.entries(byConsulate).map(([consulate, list]) => {
    const wToS = list.map((a) => daysBetween(a.waitingListDate, a.submissionInviteDate)).filter((d): d is number => d !== null);
    const sToA = list.map((a) => daysBetween(a.documentSubmissionDate, a.appointmentDate)).filter((d): d is number => d !== null);
    const aToD = list.map((a) => daysBetween(a.appointmentDate, a.decisionDate)).filter((d): d is number => d !== null);
    return {
      consulate,
      total: list.length,
      issued: list.filter((a) => a.visaStatus === "VISA_ISSUED").length,
      rejected: list.filter((a) => a.visaStatus === "VISA_REJECTED").length,
      avgWaitingToSubmission: avg(wToS),
      avgSubmissionToAppointment: avg(sToA),
      avgAppointmentToDecision: avg(aToD),
    };
  });

  // Processing analytics (overall)
  const waitingToSubmission = applicants
    .map((a) => daysBetween(a.waitingListDate, a.submissionInviteDate))
    .filter((d): d is number => d !== null);
  const submissionToAppointment = applicants
    .map((a) => daysBetween(a.documentSubmissionDate, a.appointmentDate))
    .filter((d): d is number => d !== null);
  const appointmentToDecision = applicants
    .map((a) => daysBetween(a.appointmentDate, a.decisionDate))
    .filter((d): d is number => d !== null);

  // Monthly volume (by waiting-list join month) + monthly outcomes
  const monthCounts: Record<string, number> = {};
  const monthOutcomes: Record<string, { issued: number; rejected: number }> = {};
  for (const a of applicants) {
    const d = a.waitingListDate;
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  }
  for (const a of applicants) {
    const d = a.decisionDate;
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

  return NextResponse.json({
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
    },
    monthlyVolume,
    monthlyOutcomes,
  });
}
