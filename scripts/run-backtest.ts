import { performance } from "node:perf_hooks";
import { prisma } from "../lib/db";
import { runRollingOriginBacktest } from "../lib/forecasting/backtesting";
import { generatePersonalForecast, getIntelligenceDashboardData, loadForecastDataset } from "../lib/forecasting/forecast-service";

async function main() {
  const t0 = performance.now();
  const ds = await loadForecastDataset();
  const loadMs = Math.round(performance.now() - t0);

  const cutoffs = [
    new Date("2026-08-15T00:00:00Z"),
    new Date("2026-09-15T00:00:00Z"),
    new Date("2026-10-16T00:00:00Z"),
    new Date("2026-11-01T00:00:00Z"),
    new Date("2026-11-16T00:00:00Z"),
  ];

  const tBt = performance.now();
  const isbBacktest = runRollingOriginBacktest("Islamabad", ds.journeys, ds.queuePoints, cutoffs);
  const khiBacktest = runRollingOriginBacktest("Karachi", ds.journeys, ds.queuePoints, cutoffs);
  const backtestMs = Math.round(performance.now() - tBt);

  const tFc = performance.now();
  const intel = await getIntelligenceDashboardData();
  const exampleIsbNear = await generatePersonalForecast({
    embassy: "Islamabad",
    waitingListJoinedDate: new Date("2026-03-18T00:00:00Z"),
  });
  const exampleIsbMid = await generatePersonalForecast({
    embassy: "Islamabad",
    waitingListJoinedDate: new Date("2026-07-15T00:00:00Z"),
  });
  const exampleKhi = await generatePersonalForecast({
    embassy: "Karachi",
    waitingListJoinedDate: new Date("2026-08-15T00:00:00Z"),
  });
  const fcMs = Math.round(performance.now() - tFc);

  console.log("=== DATASET SUMMARY ===", JSON.stringify(intel.datasetSummary));
  console.log("=== TIMINGS (ms) ===", JSON.stringify({ loadMs, backtestMs, fcMs }));
  console.log("=== ISLAMABAD BACKTEST ===");
  console.table(isbBacktest);
  console.log("=== KARACHI BACKTEST ===");
  console.table(khiBacktest);
  console.log("=== EXAMPLE FORECASTS ===");
  for (const [label, fc] of [
    ["ISB 2026-03-18", exampleIsbNear],
    ["ISB 2026-07-15", exampleIsbMid],
    ["KHI 2026-08-15", exampleKhi],
  ] as const) {
    console.log(label, {
      frontier: fc.currentSubmissionFrontier,
      weeklyVelocity: fc.weeklyVelocityDays,
      confidence: fc.confidence,
      cohortReached: fc.cohortAlreadyReached,
      stages: fc.stages.map((s) => ({
        stage: s.stage,
        status: s.status,
        p25: s.p25Date,
        p50: s.p50Date,
        p75: s.p75Date,
        n: s.sampleSize,
      })),
    });
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Backtest script failed:", err);
  process.exit(1);
});
