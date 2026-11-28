import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

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

test("Presentational component directories never import database or server-only forecasting services", () => {
  const dirs = ["components/visa", "components/timeline", "components/data-display", "components/ui"];
  const forbidden = [
    "@/lib/db",
    "@prisma/client",
    "@/lib/forecasting/forecast-service",
    "@/lib/analytics/service",
  ];

  for (const d of dirs) {
    for (const file of walkTsFiles(path.join(ROOT, d))) {
      const src = fs.readFileSync(file, "utf8");
      for (const imp of forbidden) {
        assert.equal(
          src.includes(imp),
          false,
          `${path.relative(ROOT, file)} must not import ${imp}`
        );
      }
    }
  }
});

test("Overview renders exactly one QueueOverview and zero legacy QueueFrontier/QueueProgress imports", () => {
  const home = fs.readFileSync(path.join(ROOT, "app/page.tsx"), "utf8");
  assert.equal(home.includes("QueueOverview"), true);
  assert.equal(home.includes("VisaStageDurationTimeline"), true);
  assert.equal(/\bQueueFrontier\b/.test(home), false);
  assert.equal(/\bQueueProgress\b/.test(home), false);
});

test("Applicant dashboard renders TransitVisaJourney and zero legacy PersonalVisaJourney imports", () => {
  const dashboard = fs.readFileSync(path.join(ROOT, "app/dashboard/page.tsx"), "utf8");
  assert.equal(dashboard.includes("TransitVisaJourney"), true);
  assert.equal(dashboard.includes("PersonalVisaJourney"), false);
});
