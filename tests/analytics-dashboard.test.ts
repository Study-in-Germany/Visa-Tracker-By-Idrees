import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  adaptCohortMatrix,
  adaptCorrectionView,
  adaptHistoricalWaitSeries,
  adaptQueueProgressionSeries,
  adaptWeeklyActivitySeries,
} from "../lib/analytics/presentation-adapter";
import {
  aggregateProgrammes,
  aggregateUniversities,
} from "../lib/analytics/university-normalizer";

const ROOT = path.resolve(__dirname, "..");

function walkTsFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkTsFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) results.push(full);
  }
  return results;
}

test("Analytics UI components never import Prisma, db, or server-only analytics/forecasting services", () => {
  const forbidden = [
    "@/lib/db",
    "@prisma/client",
    "@/lib/forecasting/forecast-service",
    "@/lib/analytics/service",
    "@/lib/analytics/dashboard-service",
  ];
  for (const file of walkTsFiles(path.join(ROOT, "components/analytics"))) {
    const src = fs.readFileSync(file, "utf8");
    for (const imp of forbidden) {
      assert.equal(
        src.includes(imp),
        false,
        `${path.relative(ROOT, file)} must not import ${imp}`
      );
    }
  }
});

test("aggregateUniversities normalizes trailing spaces, casing, and curated aliases without mutating inputs", () => {
  const raw = [
    "TU Chemnitz",
    "TU Chemnitz ",
    "TU Ilmenau",
    "TU Ilmenau ",
    "TU ilmenau",
    "Arden university ",
    "Arden",
    "Ruhr Universität Bochum ",
    "Ruhr Bochum ",
    "University of Rostock ",
    "Rostock Universität ",
    "Distinct Unlisted Institute",
  ];
  const snapshot = [...raw];
  const grouped = aggregateUniversities(raw);

  assert.deepEqual(raw, snapshot);

  const byKey = new Map(grouped.map((g) => [g.displayName, g]));
  assert.equal(byKey.get("TU Chemnitz")?.count, 2);
  assert.equal(byKey.get("TU Ilmenau")?.count, 3);
  assert.equal(byKey.get("Arden University")?.count, 2);
  assert.equal(byKey.get("Ruhr University Bochum")?.count, 2);
  assert.equal(byKey.get("University of Rostock")?.count, 2);
  assert.equal(byKey.get("Distinct Unlisted Institute")?.count, 1);

  const progs = aggregateProgrammes(["Master", "Masters ", "Data science", "Data Science "]);
  const progMap = new Map(progs.map((p) => [p.displayName, p.count]));
  assert.equal(progMap.get("Master's (unspecified)"), 2);
  assert.equal(progMap.get("Data Science"), 2);
});

test("adaptQueueProgressionSeries flags individual outliers, inserts >14d gap spacers, and preserves genuine checkpoint dips", () => {
  const result = adaptQueueProgressionSeries(
    [
      { observationDate: "2026-06-05", submissionFrontier: "2026-06-05", appointmentWlFrontier: null, reportedSubmissions: null, reportedCorrections: null, reportedAppointments: null, source: "individual_report" },
      { observationDate: "2026-10-09", submissionFrontier: "2026-01-25", appointmentWlFrontier: "2026-01-12", reportedSubmissions: 20, reportedCorrections: 16, reportedAppointments: 22, source: "queue_checkpoint" },
      { observationDate: "2026-10-13", submissionFrontier: "2026-04-28", appointmentWlFrontier: null, reportedSubmissions: null, reportedCorrections: null, reportedAppointments: null, source: "individual_report" },
      { observationDate: "2026-11-25", submissionFrontier: "2026-03-10", appointmentWlFrontier: "2026-03-05", reportedSubmissions: 27, reportedCorrections: 5, reportedAppointments: 18, source: "queue_checkpoint" },
      { observationDate: "2026-11-26", submissionFrontier: "2026-03-02", appointmentWlFrontier: "2026-03-06", reportedSubmissions: 16, reportedCorrections: 8, reportedAppointments: 7, source: "queue_checkpoint" },
    ],
    "2026-11-28"
  );

  // 2026-06-05 (0d wait) and 2026-10-13 (+90d spike) are flagged as individual anomalies
  assert.equal(result.flaggedAnomalies.length, 2);
  assert.ok(result.gapCount >= 2);

  // Genuine checkpoint dip from 2026-03-10 back to 2026-03-02 is preserved in cleanSubMs
  const last = result.rawPoints[result.rawPoints.length - 1];
  assert.equal(last.obsDate, "2026-11-26");
  assert.equal(last.isAnomaly, false);
  assert.equal(last.subDate, "2026-03-02");
  assert.notEqual(last.cleanSubMs, null);
});

test("adaptHistoricalWaitSeries excludes future months and marks small-sample & zero-day months", () => {
  const res = adaptHistoricalWaitSeries(
    [
      { month: "2026-06", medianDays: 0, p25Days: 0, p75Days: 0, sampleSize: 3 },
      { month: "2026-10", medianDays: 259, p25Days: 257, p75Days: 260, sampleSize: 74 },
      { month: "2026-12", medianDays: 7, p25Days: 7, p75Days: 7, sampleSize: 1 },
    ],
    "2026-11-28"
  );

  assert.equal(res.points.length, 2);
  assert.equal(res.futureExcluded.length, 1);
  assert.equal(res.futureExcluded[0].month, "2026-12");
  assert.equal(res.points[0].isSmallSample, true);
  assert.equal(res.points[0].isSuspiciousZeroDay, true);
  assert.equal(res.points[1].isSmallSample, false);
});

test("adaptWeeklyActivitySeries excludes future weeks and marks current ISO week", () => {
  const res = adaptWeeklyActivitySeries(
    [
      { weekStart: "2026-11-16", submissions: 9, corrections: 8, appointments: 20, cohortDaysCleared: 8 },
      { weekStart: "2026-11-23", submissions: 12, corrections: 10, appointments: 23, cohortDaysCleared: 11 },
      { weekStart: "2026-11-30", submissions: 1, corrections: 1, appointments: 1, cohortDaysCleared: null },
    ],
    "2026-11-28"
  );

  assert.equal(res.weeks.length, 2);
  assert.equal(res.futureExcludedCount, 1);
  assert.equal(res.weeks[0].isCurrentWeek, false);
  assert.equal(res.weeks[1].isCurrentWeek, true);
  assert.equal(res.weeks[1].totalEvents, 45);
});

test("adaptCorrectionView separates distinct applicants from total events and suppresses post-correction median when n < 5", () => {
  const mkStat = (med: number, n: number) => ({
    sampleSize: n,
    effectiveSampleSize: n,
    censoredCount: 0,
    mean: med,
    median: med,
    weightedMedian: med,
    stdDev: null,
    min: med,
    max: med,
    p10: med,
    p25: med,
    p50: med,
    p75: med,
    p90: med,
    iqr: 0,
  });
  const view = adaptCorrectionView({
    eligibleSubmissionsCount: 138,
    applicantsWithCorrection: 22,
    totalCorrectionEvents: 25,
    correctionRatePct: 15.9,
    timeUntilFirstCorrection: mkStat(7, 10),
    correctionResponseTime: mkStat(2, 10),
    postCorrectionProcessing: mkStat(0, 3),
  });

  assert.equal(view.applicantsWithCorrection, 22);
  assert.equal(view.totalCorrectionEvents, 25);
  assert.equal(view.repeatCorrectionEvents, 3);
  assert.equal(view.hasSufficientPostCorrection, false);
  assert.equal(view.postCorrectionMedianDays, null);
});

test("adaptCohortMatrix computes exact mutually exclusive percentage shares summing to 100%", () => {
  const rows = adaptCohortMatrix([
    { month: "2026-06", total: 8, waitingList: 4, submissionInvited: 1, documentsSubmitted: 1, appointmentStage: 2, visaIssued: 0, visaRejected: 0, withdrawn: 0 },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].waitingListPct, 50);
  assert.equal(rows[0].appointmentStagePct, 25);
  assert.equal(rows[0].submissionInvitedPct, 12.5);
  assert.equal(rows[0].documentsSubmittedPct, 12.5);
});
