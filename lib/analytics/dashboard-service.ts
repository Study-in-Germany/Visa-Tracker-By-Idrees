import { ACTIVE_STATUSES, CONSULATES, VISA_STATUS_ORDER } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { toUtcDay, toIsoDay } from "@/lib/forecasting/date-utils";
import { getIntelligenceDashboardData, loadForecastDataset } from "@/lib/forecasting/forecast-service";
import type { Embassy } from "@/lib/forecasting/types";
import { TEAM_PUBLIC_ID } from "@/lib/listings";
import { waitingListWhere } from "@/lib/period";
import type {
  ActivityBucket,
  AnalyticsDashboardPayload,
  AnalyticsEmbassyIntelligence,
  EmbassyDecisionComparison,
  ProcessingStageStat,
  ProgressionHistoryPoint,
} from "./dashboard-types";
import {
  aggregateProgrammes,
  aggregateUniversities,
  normalizeUniversityName,
} from "./university-normalizer";

const DAY_MS = 86_400_000;
const MIN_YEAR = 2000;

function validDate(d: Date | null | undefined, nowMs: number): Date | null {
  if (!d) return null;
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  if (d.getUTCFullYear() < MIN_YEAR || ms > nowMs + 7 * DAY_MS) return null;
  return d;
}

function diffValidDays(a: Date | null, b: Date | null, maxDays: number): number | null {
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
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
}

function summarizeDurations(nums: number[]) {
  if (nums.length === 0) {
    return {
      sampleSize: 0,
      medianDays: null,
      p25Days: null,
      p75Days: null,
      minDays: null,
      maxDays: null,
    };
  }
  const s = [...nums].sort((a, b) => a - b);
  return {
    sampleSize: s.length,
    medianDays: quantileSorted(s, 0.5),
    p25Days: quantileSorted(s, 0.25),
    p75Days: quantileSorted(s, 0.75),
    minDays: s[0],
    maxDays: s[s.length - 1],
  };
}

function monthKeyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isoMondayKeyUtc(d: Date): string {
  const day = d.getUTCDay();
  const monOffset = (day + 6) % 7;
  const mon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - monOffset));
  return mon.toISOString().slice(0, 10);
}

function buildActivityBuckets(
  rows: { date: Date | null; consulate: string }[],
  granularity: "month" | "week"
): ActivityBucket[] {
  const map = new Map<string, ActivityBucket>();
  for (const r of rows) {
    if (!r.date) continue;
    const key = granularity === "month" ? monthKeyUtc(r.date) : isoMondayKeyUtc(r.date);
    const slot = map.get(key) ?? { period: key, total: 0, islamabad: 0, karachi: 0 };
    slot.total += 1;
    if (r.consulate === "Islamabad") slot.islamabad += 1;
    else if (r.consulate === "Karachi") slot.karachi += 1;
    map.set(key, slot);
  }
  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

export interface AnalyticsQueryFilters {
  from?: string;
  to?: string;
  consulate?: string;
  visaStatus?: string;
  university?: string;
  intake?: string;
}

export async function getAnalyticsDashboardData(
  rawFilters: AnalyticsQueryFilters = {},
  now: Date = new Date()
): Promise<AnalyticsDashboardPayload> {
  const asOfDay = toUtcDay(now);
  const asOfIso = toIsoDay(asOfDay)!;
  const nowMs = now.getTime();

  const from = rawFilters.from?.trim() || "";
  const to = rawFilters.to?.trim() || "";
  const consulate = rawFilters.consulate?.trim() || "";
  const visaStatus = rawFilters.visaStatus?.trim() || "";
  const university = rawFilters.university?.trim() || "";
  const intake = rawFilters.intake?.trim() || "";

  const wlRange = waitingListWhere(from, to);

  const [allApproved, directoryUnis, intelligence, dataset] = await Promise.all([
    prisma.applicant.findMany({
      where: {
        approval: "APPROVED",
        publicId: { not: TEAM_PUBLIC_ID },
      },
      select: {
        consulate: true,
        university: true,
        program: true,
        intake: true,
        visaStatus: true,
        waitingListDate: true,
        submissionInviteDate: true,
        documentSubmissionDate: true,
        appointmentInviteDate: true,
        appointmentDate: true,
        interviewDate: true,
        decisionDate: true,
        createdAt: true,
      },
    }),
    prisma.university.findMany({
      where: { published: true },
      select: { name: true, shortName: true },
    }),
    getIntelligenceDashboardData(asOfDay),
    loadForecastDataset(asOfDay),
  ]);

  // Build directory lookup map for university normalization
  const dirIndex = new Map<string, { key: string; displayName: string }>();
  for (const u of directoryUnis) {
    const clean = u.name.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const norm = normalizeUniversityName(clean);
    dirIndex.set(clean.toLowerCase(), norm);
    if (u.shortName) {
      const sn = u.shortName.trim().toLowerCase();
      if (sn.length >= 3 && !dirIndex.has(sn)) dirIndex.set(sn, norm);
    }
  }

  // Compute facets from approved applicants so filter options stay populated
  const facetUnis = aggregateUniversities(
    allApproved.map((a) => a.university),
    directoryUnis
  ).map((u) => ({ value: u.key, label: u.displayName, count: u.count }));

  const intakeBucket = new Map<string, { label: string; count: number }>();
  for (const a of allApproved) {
    const raw = a.intake?.replace(/\s+/g, " ").trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    const cur = intakeBucket.get(key) ?? { label: raw, count: 0 };
    cur.count += 1;
    intakeBucket.set(key, cur);
  }
  const facetIntakes = Array.from(intakeBucket.entries())
    .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
    .map(([value, info]) => ({ value, label: info.label, count: info.count }));

  // Apply filter set consistently
  const filtered = allApproved.filter((a) => {
    if (consulate && a.consulate !== consulate) return false;
    if (visaStatus && a.visaStatus !== visaStatus) return false;
    if (wlRange) {
      if (!a.waitingListDate) return false;
      const ms = a.waitingListDate.getTime();
      if (wlRange.gte && ms < wlRange.gte.getTime()) return false;
      if (wlRange.lt && ms >= wlRange.lt.getTime()) return false;
    }
    if (intake) {
      const aIntake = a.intake?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
      if (aIntake !== intake.toLowerCase()) return false;
    }
    if (university) {
      if (!a.university) return false;
      const norm = normalizeUniversityName(a.university, dirIndex);
      const matchesKey = norm.key === university;
      const matchesExact = a.university.trim().toLowerCase() === university.toLowerCase();
      if (!matchesKey && !matchesExact) return false;
    }
    return true;
  });

  const total = filtered.length;
  const activeSet = new Set(ACTIVE_STATUSES);
  const terminalSet = new Set(["VISA_ISSUED", "VISA_REJECTED", "WITHDRAWN"]);

  const statusCounts: Record<string, number> = {};
  let withWaitingListDate = 0;
  let activeApplicants = 0;
  let completedCases = 0;
  let visaIssued = 0;
  let visaRejected = 0;
  let withdrawn = 0;
  let invitationsRecorded = 0;
  let appointmentsRecorded = 0;

  const wlToInvGaps: number[] = [];
  const docToApptGaps: number[] = [];
  const apptToDecGaps: number[] = [];
  const endToEndGaps: number[] = [];
  const monthlyOutcomesMap = new Map<string, { issued: number; rejected: number }>();

  for (const a of filtered) {
    statusCounts[a.visaStatus] = (statusCounts[a.visaStatus] ?? 0) + 1;
    if (activeSet.has(a.visaStatus)) activeApplicants += 1;
    if (terminalSet.has(a.visaStatus)) completedCases += 1;
    if (a.visaStatus === "VISA_ISSUED") visaIssued += 1;
    if (a.visaStatus === "VISA_REJECTED") visaRejected += 1;
    if (a.visaStatus === "WITHDRAWN") withdrawn += 1;

    const wl = validDate(a.waitingListDate, nowMs);
    const inv = validDate(a.submissionInviteDate, nowMs);
    const doc = validDate(a.documentSubmissionDate, nowMs);
    const appt = validDate(a.appointmentDate, nowMs);
    const interview = validDate(a.interviewDate, nowMs);
    const dec = validDate(a.decisionDate, nowMs);

    if (wl) withWaitingListDate += 1;
    if (inv || doc || appt || dec) invitationsRecorded += 1;
    if (appt || interview || dec) appointmentsRecorded += 1;

    const gWl = diffValidDays(wl, inv, 730);
    if (gWl !== null) wlToInvGaps.push(gWl);

    const gDoc = diffValidDays(doc ?? inv, appt, 365);
    if (gDoc !== null) docToApptGaps.push(gDoc);

    if (a.visaStatus === "VISA_ISSUED" || a.visaStatus === "VISA_REJECTED") {
      const gDec = diffValidDays(interview ?? appt, dec, 365);
      if (gDec !== null) apptToDecGaps.push(gDec);

      const gE2E = diffValidDays(wl, dec, 900);
      if (gE2E !== null) endToEndGaps.push(gE2E);

      if (dec) {
        const m = monthKeyUtc(dec);
        const cur = monthlyOutcomesMap.get(m) ?? { issued: 0, rejected: 0 };
        if (a.visaStatus === "VISA_ISSUED") cur.issued += 1;
        else cur.rejected += 1;
        monthlyOutcomesMap.set(m, cur);
      }
    }
  }

  const decidedCases = visaIssued + visaRejected;
  const approvalRatePct =
    decidedCases > 0 ? Math.round((visaIssued / decidedCases) * 1000) / 10 : null;

  const wlStats = summarizeDurations(wlToInvGaps);
  const docStats = summarizeDurations(docToApptGaps);
  const decStats = summarizeDurations(apptToDecGaps);
  const e2eStats = summarizeDurations(endToEndGaps);

  const stages: ProcessingStageStat[] = [
    {
      id: "wl_to_invite",
      label: "Waiting list → Submission invite",
      shortLabel: "Waiting list → Invite",
      definition: "Waiting-list registration date to submission invitation date (internal filtered cohort).",
      ...wlStats,
      available: wlStats.sampleSize > 0,
      note: wlStats.sampleSize > 0 ? null : "No paired wait-to-invite dates in current filter",
    },
    {
      id: "doc_to_appt",
      label: "Documents submitted → Appointment",
      shortLabel: "Docs → Appointment",
      definition: "Actual document submission date (falling back to invite date if absent) to appointment date.",
      ...docStats,
      available: docStats.sampleSize > 0,
      note: docStats.sampleSize > 0 ? null : "No paired submission-to-appointment dates in current filter",
    },
    {
      id: "appt_to_decision",
      label: "Physical appointment → Visa decision",
      shortLabel: "Appointment → Decision",
      definition: "Interview or physical appointment date to recorded decision date (decided internal cases only).",
      ...decStats,
      available: decidedCases > 0 && decStats.sampleSize > 0,
      note:
        decidedCases === 0
          ? "No recorded visa decisions in internal tracker cohort"
          : decStats.sampleSize === 0
            ? "Appointment dates missing on decided cases"
            : null,
    },
  ];

  // Embassy distribution (includes all configured consulates when unfiltered, or matched consulate)
  const embassyNames = Array.from(
    new Set([...CONSULATES, ...filtered.map((a) => a.consulate).filter(Boolean)])
  );
  const embassyDistribution = embassyNames
    .map((emb) => {
      const list = filtered.filter((a) => a.consulate === emb);
      return {
        consulate: emb,
        total: list.length,
        active: list.filter((a) => activeSet.has(a.visaStatus)).length,
        issued: list.filter((a) => a.visaStatus === "VISA_ISSUED").length,
        rejected: list.filter((a) => a.visaStatus === "VISA_REJECTED").length,
        sharePct: total > 0 ? Math.round((list.length / total) * 1000) / 10 : 0,
      };
    })
    .filter((row) => !consulate || row.consulate === consulate || row.total > 0);

  const statusDistribution = VISA_STATUS_ORDER.map((status) => {
    const count = statusCounts[status] ?? 0;
    return {
      status,
      count,
      sharePct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      isActive: activeSet.has(status),
      isTerminal: terminalSet.has(status),
    };
  }).filter((row) => row.count > 0);

  const monthlyByJoinDate = buildActivityBuckets(
    filtered.map((a) => ({ date: validDate(a.waitingListDate, nowMs), consulate: a.consulate })),
    "month"
  );
  const weeklyByJoinDate = buildActivityBuckets(
    filtered.map((a) => ({ date: validDate(a.waitingListDate, nowMs), consulate: a.consulate })),
    "week"
  );
  const monthlyByEntryDate = buildActivityBuckets(
    filtered.map((a) => ({ date: validDate(a.createdAt, nowMs), consulate: a.consulate })),
    "month"
  );
  const weeklyByEntryDate = buildActivityBuckets(
    filtered.map((a) => ({ date: validDate(a.createdAt, nowMs), consulate: a.consulate })),
    "week"
  );

  const universitiesItems = aggregateUniversities(
    filtered.map((a) => a.university),
    directoryUnis
  );
  const programmesItems = aggregateProgrammes(filtered.map((a) => a.program));

  // Enrich embassy intelligence with exact observation provenance & separated internal/external decision counts
  const embassiesEnriched = (["Islamabad", "Karachi"] as const).reduce(
    (acc, emb) => {
      const report = intelligence.embassies[emb];
      const checkpointDays = new Set(
        dataset.queuePoints
          .filter((q) => q.embassy === emb)
          .map((q) => toIsoDay(q.observationDate)!)
          .filter(Boolean)
      );

      const progressionPoints: ProgressionHistoryPoint[] = report.progressionHistory.map((pt) => {
        const hasCheckpoint = checkpointDays.has(pt.observationDate);
        const hasActivityCounts =
          pt.reportedSubmissions !== null ||
          pt.reportedCorrections !== null ||
          pt.reportedAppointments !== null;
        const source = hasCheckpoint
          ? hasActivityCounts
            ? "queue_checkpoint"
            : "combined"
          : "individual_report";
        return { ...pt, source };
      });

      const embJourneys = dataset.journeys.filter((j) => j.embassy === emb);
      const internalJ = embJourneys.filter((j) => j.sourceType === "internal");
      const externalJ = embJourneys.filter((j) => j.sourceType === "external");

      const extApproved = externalJ.filter((j) => j.decisionOutcome === "APPROVED").length;
      const extRejected = externalJ.filter((j) => j.decisionOutcome === "REJECTED").length;
      const extWithdrawn = externalJ.filter((j) => j.decisionOutcome === "WITHDRAWN").length;
      const extDecided = extApproved + extRejected;

      const intApproved = internalJ.filter((j) => j.decisionOutcome === "APPROVED").length;
      const intRejected = internalJ.filter((j) => j.decisionOutcome === "REJECTED").length;
      const intWithdrawn = internalJ.filter((j) => j.decisionOutcome === "WITHDRAWN").length;

      const decisionComparison: EmbassyDecisionComparison = {
        internalApprovedCount: intApproved,
        internalRejectedCount: intRejected,
        internalWithdrawnCount: intWithdrawn,
        internalDecidedCount: intApproved + intRejected,
        externalApprovedCount: extApproved,
        externalRejectedCount: extRejected,
        externalWithdrawnCount: extWithdrawn,
        externalDecidedCount: extDecided,
        externalApprovalRatePct:
          extDecided > 0 ? Math.round((extApproved / extDecided) * 1000) / 10 : null,
        externalDecisionMedianDays:
          report.durations.decisionProcessing.median !== null
            ? Math.round(report.durations.decisionProcessing.median)
            : null,
        externalDecisionSampleSize: report.durations.decisionProcessing.sampleSize,
      };

      acc[emb] = {
        ...report,
        progressionPoints,
        decisionComparison,
      };
      return acc;
    },
    {} as Record<Embassy, AnalyticsEmbassyIntelligence>
  );

  return {
    asOfDate: asOfIso,
    generatedAt: now.toISOString(),
    filtersApplied: {
      from,
      to,
      consulate,
      visaStatus,
      university,
      intake,
      dateDimension: "waitingListDate",
    },
    facets: {
      universities: facetUnis,
      intakes: facetIntakes,
    },
    summary: {
      total,
      withWaitingListDate,
      activeApplicants,
      completedCases,
      visaIssued,
      visaRejected,
      withdrawn,
      decidedCases,
      approvalRatePct,
      medianWaitDays: wlStats.medianDays,
      waitP25Days: wlStats.p25Days,
      waitP75Days: wlStats.p75Days,
      waitSampleSize: wlStats.sampleSize,
      invitationsRecorded,
      appointmentsRecorded,
    },
    activity: {
      monthlyByJoinDate,
      weeklyByJoinDate,
      monthlyByEntryDate,
      weeklyByEntryDate,
    },
    embassyDistribution,
    statusDistribution,
    processingDurations: {
      stages,
      observedEndToEnd: {
        ...e2eStats,
        available: e2eStats.sampleSize > 0 && e2eStats.medianDays !== null,
      },
    },
    internalDecisions: {
      issued: visaIssued,
      rejected: visaRejected,
      withdrawn,
      decided: decidedCases,
      approvalRatePct,
      monthlyOutcomes: Array.from(monthlyOutcomesMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({ month, ...v })),
      medianDecisionDays: decStats.medianDays,
      decisionDurationSampleSize: decStats.sampleSize,
    },
    universities: {
      totalWithUniversity: filtered.filter((a) => Boolean(a.university?.trim())).length,
      uniqueNormalizedCount: universitiesItems.length,
      items: universitiesItems,
    },
    programmes: {
      totalWithProgramme: filtered.filter((a) => Boolean(a.program?.trim())).length,
      items: programmesItems,
    },
    intelligence: {
      modelVersion: intelligence.modelVersion,
      datasetSummary: intelligence.datasetSummary,
      embassies: embassiesEnriched,
    },
  };
}
