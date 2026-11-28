const DAY_MS = 86_400_000;
const MIN_YEAR = 2020;

export type OverviewApplicantRecord = {
  consulate: string;
  visaStatus: string;
  waitingListDate: Date | string | null;
  submissionInviteDate: Date | string | null;
  documentSubmissionDate: Date | string | null;
  correctionRequestDate: Date | string | null;
  correctionSubmittedDate: Date | string | null;
  appointmentDate: Date | string | null;
  decisionDate: Date | string | null;
};

export type EmbassyQueueSnapshot = {
  consulate: "Islamabad" | "Karachi";
  hasEnoughData: boolean;
  sampleCount: number;
  currentInviteJoinDate: string | null;
  currentAppointmentSubmissionDate: string | null;
  weeklyProgressionDays: number | null;
  timelineMonths: { key: string; label: string; startMs: number; endMs: number }[];
  markerPercent: number | null;
  markerShortDate: string | null;
};

export type StageDurationStat = {
  medianDays: number | null;
  q1Days: number | null;
  q3Days: number | null;
  sampleSize: number;
  windowLabel: "last 12 months" | "all recorded entries";
};

export type JourneyStepDurations = {
  totalTracked: number;
  submissionInviteCount: number;
  appointmentCount: number;
  decidedCount: number;
  issuedCount: number;
  approvalRate: number | null;
  waitingToInvite: StageDurationStat;
  inviteToAppointment: StageDurationStat;
  appointmentToDecision: StageDurationStat;
  correction: {
    submissionsCount: number;
    correctionCount: number;
    percent: number | null;
    oneInN: number | null;
    postCorrectionMedianDays: number | null;
    postCorrectionSampleSize: number;
  };
  usedAllTimeFallback: boolean;
};

function toValidDate(v: Date | string | null | undefined, nowMs: number): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;
  const y = d.getUTCFullYear();
  if (y < MIN_YEAR || t > nowMs + 7 * DAY_MS) return null;
  return d;
}

function gapDays(a: Date | null, b: Date | null, maxDays: number): number | null {
  if (!a || !b) return null;
  const days = Math.round((b.getTime() - a.getTime()) / DAY_MS);
  if (days < 0 || days > maxDays) return null;
  return days;
}

export function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function medianDateMs(dates: Date[]): number | null {
  if (dates.length === 0) return null;
  const sorted = dates.map((d) => d.getTime()).sort((a, b) => a - b);
  return Math.round(percentile(sorted, 0.5)!);
}

function formatIsoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function buildMonthSpan(startMs: number, endMs: number): { key: string; label: string; startMs: number; endMs: number }[] {
  const startDate = new Date(startMs);
  const endDate = new Date(endMs);
  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth();
  const endYear = endDate.getUTCFullYear();
  const endMonth = endDate.getUTCMonth();

  let totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  let cursorYear = startYear;
  let cursorMonth = startMonth;

  // Keep a readable 6..12 month window ending at endDate rather than projecting empty future months
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

  const months: { key: string; label: string; startMs: number; endMs: number }[] = [];
  for (let i = 0; i < totalMonths; i++) {
    const mStart = Date.UTC(cursorYear, cursorMonth + i, 1);
    const mEnd = Date.UTC(cursorYear, cursorMonth + i + 1, 1);
    const dt = new Date(mStart);
    const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = dt.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
    months.push({ key, label, startMs: mStart, endMs: mEnd });
  }
  return months;
}

export function computeQueueRightNow(
  applicants: OverviewApplicantRecord[],
  now: Date = new Date()
): EmbassyQueueSnapshot[] {
  const nowMs = now.getTime();
  const embassies: ("Islamabad" | "Karachi")[] = ["Islamabad", "Karachi"];

  return embassies.map((consulate) => {
    const rows = applicants.filter((a) => a.consulate === consulate);

    // Valid invite observations: plausible waitingListDate <= submissionInviteDate within 730d
    const inviteObs = rows
      .map((r) => {
        const wl = toValidDate(r.waitingListDate, nowMs);
        const inv = toValidDate(r.submissionInviteDate, nowMs);
        const gap = gapDays(wl, inv, 730);
        if (!wl || !inv || gap === null) return null;
        return { wl, inv };
      })
      .filter((x): x is { wl: Date; inv: Date } => x !== null)
      .sort((a, b) => b.inv.getTime() - a.inv.getTime());

    if (inviteObs.length < 3) {
      return {
        consulate,
        hasEnoughData: false,
        sampleCount: inviteObs.length,
        currentInviteJoinDate: null,
        currentAppointmentSubmissionDate: null,
        weeklyProgressionDays: null,
        timelineMonths: [],
        markerPercent: null,
        markerShortDate: null,
      };
    }

    // Use the most recent 10 invite observations (or all if <10) to avoid stale historical bias
    const recentInvites = inviteObs.slice(0, Math.min(10, inviteObs.length));
    const currentInviteJoinMs = medianDateMs(recentInvites.map((x) => x.wl))!;

    // Current appointment submission date from recent valid submission -> appointment pairs
    const apptObs = rows
      .map((r) => {
        const sub = toValidDate(r.documentSubmissionDate, nowMs) || toValidDate(r.submissionInviteDate, nowMs);
        const appt = toValidDate(r.appointmentDate, nowMs);
        const gap = gapDays(sub, appt, 365);
        if (!sub || !appt || gap === null) return null;
        return { sub, appt };
      })
      .filter((x): x is { sub: Date; appt: Date } => x !== null)
      .sort((a, b) => b.appt.getTime() - a.appt.getTime());

    const recentAppts = apptObs.slice(0, Math.min(10, apptObs.length));
    const currentApptSubMs = recentAppts.length >= 3 ? medianDateMs(recentAppts.map((x) => x.sub)) : null;

    // Weekly queue progression via Theil-Sen median pairwise slope over recent 90 days (or latest 20 entries)
    const cutoffMs = inviteObs[0].inv.getTime() - 120 * DAY_MS;
    const trendSample = inviteObs.filter((x) => x.inv.getTime() >= cutoffMs).slice(0, 25);
    const slopes: number[] = [];
    for (let i = 0; i < trendSample.length; i++) {
      for (let j = i + 1; j < trendSample.length; j++) {
        const invDiffDays = (trendSample[i].inv.getTime() - trendSample[j].inv.getTime()) / DAY_MS;
        if (invDiffDays < 7) continue;
        const wlDiffDays = (trendSample[i].wl.getTime() - trendSample[j].wl.getTime()) / DAY_MS;
        const perWeek = (wlDiffDays / invDiffDays) * 7;
        if (perWeek >= 0.5 && perWeek <= 90) {
          slopes.push(perWeek);
        }
      }
    }
    slopes.sort((a, b) => a - b);
    const weeklyProgressionDays =
      trendSample.length >= 4 && slopes.length >= 2 ? Math.max(1, Math.round(percentile(slopes, 0.5)!)) : null;

    // Build timeline span across valid waiting-list dates for this consulate (falling back around currentInviteJoinMs)
    const wlDates = rows
      .map((r) => toValidDate(r.waitingListDate, nowMs))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    const minWl = wlDates.length > 0 ? Math.min(wlDates[0].getTime(), currentInviteJoinMs) : currentInviteJoinMs - 60 * DAY_MS;
    const maxWl = wlDates.length > 0 ? Math.max(wlDates[wlDates.length - 1].getTime(), currentInviteJoinMs) : currentInviteJoinMs + 210 * DAY_MS;
    const timelineMonths = buildMonthSpan(minWl, maxWl);

    const spanStart = timelineMonths[0].startMs;
    const spanEnd = timelineMonths[timelineMonths.length - 1].endMs;
    const markerPercent = Math.max(1, Math.min(99, ((currentInviteJoinMs - spanStart) / (spanEnd - spanStart)) * 100));
    const markerShortDate = new Date(currentInviteJoinMs).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

    return {
      consulate,
      hasEnoughData: true,
      sampleCount: inviteObs.length,
      currentInviteJoinDate: formatIsoDay(currentInviteJoinMs),
      currentAppointmentSubmissionDate: currentApptSubMs ? formatIsoDay(currentApptSubMs) : null,
      weeklyProgressionDays,
      timelineMonths,
      markerPercent,
      markerShortDate,
    };
  });
}

function summarizeDurations(
  pairs: { from: Date; to: Date; maxDays: number }[],
  cutoffMs: number
): StageDurationStat {
  const allGaps = pairs
    .map((p) => gapDays(p.from, p.to, p.maxDays))
    .filter((d): d is number => d !== null);

  const recentGaps = pairs
    .filter((p) => p.to.getTime() >= cutoffMs)
    .map((p) => gapDays(p.from, p.to, p.maxDays))
    .filter((d): d is number => d !== null);

  const useRecent = recentGaps.length >= 3 || allGaps.length < 3;
  const chosen = (useRecent ? recentGaps : allGaps).slice().sort((a, b) => a - b);

  if (chosen.length === 0) {
    return {
      medianDays: null,
      q1Days: null,
      q3Days: null,
      sampleSize: 0,
      windowLabel: useRecent ? "last 12 months" : "all recorded entries",
    };
  }

  return {
    medianDays: Math.round(percentile(chosen, 0.5)!),
    q1Days: Math.round(percentile(chosen, 0.25)!),
    q3Days: Math.round(percentile(chosen, 0.75)!),
    sampleSize: chosen.length,
    windowLabel: useRecent ? "last 12 months" : "all recorded entries",
  };
}

export function computeJourneyStepDurations(
  applicants: OverviewApplicantRecord[],
  now: Date = new Date()
): JourneyStepDurations {
  const nowMs = now.getTime();
  const twelveMonthsAgoMs = nowMs - 365 * DAY_MS;

  const wToInvPairs: { from: Date; to: Date; maxDays: number }[] = [];
  const invToApptPairs: { from: Date; to: Date; maxDays: number }[] = [];
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
    const subRef = inv ?? doc;
    if (subRef && appt) invToApptPairs.push({ from: subRef, to: appt, maxDays: 365 });
    if (appt && dec) apptToDecPairs.push({ from: appt, to: dec, maxDays: 365 });

    if (doc || corrReq || corrSub || appt || a.visaStatus === "SUBMISSION_RECEIVED" || a.visaStatus === "UNDER_CORRECTION") {
      submissionsCount++;
    }
    if (corrReq || a.visaStatus === "UNDER_CORRECTION") {
      correctionCount++;
    }
    const corrGap = gapDays(corrSub, appt, 180);
    if (corrGap !== null) corrToApptGaps.push(corrGap);
  }

  const waitingToInvite = summarizeDurations(wToInvPairs, twelveMonthsAgoMs);
  const inviteToAppointment = summarizeDurations(invToApptPairs, twelveMonthsAgoMs);
  const appointmentToDecision = summarizeDurations(apptToDecPairs, twelveMonthsAgoMs);

  corrToApptGaps.sort((a, b) => a - b);
  const postCorrectionMedianDays =
    corrToApptGaps.length >= 2 ? Math.round(percentile(corrToApptGaps, 0.5)!) : null;

  const approvalRate = decidedCount >= 3 ? Math.round((issuedCount / decidedCount) * 1000) / 10 : null;
  const percent = submissionsCount >= 3 ? Math.round((correctionCount / submissionsCount) * 100) : null;
  const oneInN =
    submissionsCount >= 3 && correctionCount > 0
      ? Math.max(1, Math.round(submissionsCount / correctionCount))
      : null;

  return {
    totalTracked: applicants.length,
    submissionInviteCount,
    appointmentCount,
    decidedCount,
    issuedCount,
    approvalRate,
    waitingToInvite,
    inviteToAppointment,
    appointmentToDecision,
    correction: {
      submissionsCount,
      correctionCount,
      percent,
      oneInN,
      postCorrectionMedianDays,
      postCorrectionSampleSize: corrToApptGaps.length,
    },
    usedAllTimeFallback:
      waitingToInvite.windowLabel === "all recorded entries" ||
      inviteToAppointment.windowLabel === "all recorded entries" ||
      appointmentToDecision.windowLabel === "all recorded entries",
  };
}

export function formatApproxDuration(days: number): string {
  if (days < 14) {
    const d = Math.max(1, Math.round(days));
    return `${d} ${d === 1 ? "day" : "days"}`;
  }
  if (days < 45) {
    const weeks = Math.round((days / 7) * 2) / 2;
    return `${weeks % 1 === 0 ? weeks : weeks.toFixed(1)} ${weeks === 1 ? "week" : "weeks"}`;
  }
  const months = Math.round((days / 30.44) * 10) / 10;
  return `${months % 1 === 0 ? months.toFixed(0) : months.toFixed(1)} months`;
}

export function formatDurationRange(q1Days: number, q3Days: number): string {
  if (q3Days >= 45) {
    const m1 = (q1Days / 30.44).toFixed(1).replace(/\.0$/, "");
    const m2 = (q3Days / 30.44).toFixed(1).replace(/\.0$/, "");
    return m1 === m2 ? `~${m1} months` : `${m1}–${m2} months`;
  }
  return q1Days === q3Days ? `${q1Days} days` : `${q1Days}–${q3Days} days`;
}
