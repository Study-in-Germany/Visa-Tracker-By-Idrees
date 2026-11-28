import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/db";
import { parseHtmlChannelExport } from "../lib/evidence/html-importer";
import { parseWhatsAppZipExport } from "../lib/evidence/whatsapp-importer";
import { parseStructuredJsonEvidence } from "../lib/evidence/csv-importer";
import { ingestParsedEvidence } from "../lib/evidence/evidence-service";

const ATTACHMENTS = [
  {
    path: "C:\\Users\\umar\\Downloads\\WhatsApp_Channel_Export_Complete (2).html",
    name: "Study In Germany Updates Channel Export (2)",
    sourceType: "CHANNEL_EXPORT" as const,
    sourceRef: "attachment:whatsapp_channel_export_2",
    reliability: "VERIFIED_COMMUNITY" as const,
    kind: "html" as const,
  },
  {
    path: "C:\\Users\\umar\\Downloads\\WhatsApp_Channel_Export_Complete (1).html",
    name: "Study in Germany Channel Export (1)",
    sourceType: "CHANNEL_EXPORT" as const,
    sourceRef: "attachment:whatsapp_channel_export_1",
    reliability: "VERIFIED_COMMUNITY" as const,
    kind: "html" as const,
  },
  {
    path: "C:\\Users\\umar\\Downloads\\WhatsApp_Channel_Export_Complete.html",
    name: "Channel Export Spam/Unrelated Sample",
    sourceType: "CHANNEL_EXPORT" as const,
    sourceRef: "attachment:whatsapp_channel_export_0",
    reliability: "UNVERIFIED" as const,
    kind: "html" as const,
  },
  {
    path: "C:\\Users\\umar\\Downloads\\Study in Germany _ Community 2.zip",
    name: "Study in Germany Community 2 Chat Export",
    sourceType: "WHATSAPP_EXPORT" as const,
    sourceRef: "attachment:community_2_zip",
    reliability: "VERIFIED_COMMUNITY" as const,
    kind: "zip" as const,
  },
  {
    path: "C:\\Users\\umar\\Downloads\\[ISL] Waiting List July & Aug 2026 (1).zip",
    name: "Islamabad Waiting List July & Aug 2026 Chat",
    sourceType: "WHATSAPP_EXPORT" as const,
    sourceRef: "attachment:isl_july_aug_2026_zip",
    reliability: "CROWD_REPORT" as const,
    kind: "zip" as const,
  },
];

// Dated Section 6 historical Islamabad calibration checkpoints (deduplicated against community logs)
const CALIBRATION_ROWS = [
  { obs: "2026-10-16", sub: "2026-02-02", apptWl: "2026-01-18" },
  { obs: "2026-10-23", sub: "2026-02-08", apptWl: "2026-01-28" },
  { obs: "2026-10-30", sub: "2026-02-16", apptWl: "2026-02-10" },
  { obs: "2026-11-06", sub: "2026-02-18", apptWl: "2026-02-14" },
  { obs: "2026-11-13", sub: "2026-02-25", apptWl: "2026-02-18" },
  { obs: "2026-11-16", sub: "2026-02-28", apptWl: "2026-02-19" },
  { obs: "2026-11-19", sub: "2026-03-02", apptWl: "2026-02-25" },
  { obs: "2026-11-20", sub: "2026-03-03", apptWl: "2026-02-28" },
  { obs: "2026-11-23", sub: "2026-03-05", apptWl: "2026-02-28" },
  { obs: "2026-11-24", sub: "2026-03-06", apptWl: "2026-03-02" },
  { obs: "2026-11-25", sub: "2026-03-10", apptWl: "2026-03-05" },
  { obs: "2026-11-26", sub: "2026-03-10", apptWl: "2026-03-06" },
];

async function main() {
  let totalTimelines = 0;
  let totalQueue = 0;
  let totalDuplicates = 0;
  let totalConflicting = 0;
  let totalExcluded = 0;

  for (const item of ATTACHMENTS) {
    if (!fs.existsSync(item.path)) {
      console.warn(`SKIP missing file: ${item.path}`);
      continue;
    }
    const batch =
      item.kind === "html"
        ? parseHtmlChannelExport(fs.readFileSync(item.path, "utf8"))
        : parseWhatsAppZipExport(fs.readFileSync(item.path));

    const summary = await ingestParsedEvidence(
      {
        name: item.name,
        sourceType: item.sourceType,
        sourceRef: item.sourceRef,
        reliability: item.reliability,
        usagePermission: "COMMUNITY_EXPORT_ANALYTICS",
        verificationStatus: "APPROVED",
        notes: `Imported from ${path.basename(item.path)} (anonymized, non-student posts excluded)`,
      },
      batch,
      { approveAllValid: true }
    );

    totalTimelines += summary.insertedTimelines;
    totalQueue += summary.insertedQueue;
    totalDuplicates += summary.duplicatesSkipped;
    totalConflicting += summary.conflictingFlagged;
    totalExcluded += summary.excludedCount;

    console.log(item.name, "->", JSON.stringify(summary));
  }

  // Calibration evidence checkpoints
  const calibrationJson = CALIBRATION_ROWS.flatMap((row) => [
    {
      embassy: "Islamabad",
      queueType: "SUBMISSION_FRONTIER",
      observationDate: row.obs,
      observedFrontierDate: row.sub,
      confidence: 0.92,
      notes: "Historical Islamabad calibration series (submission frontier)",
    },
    {
      embassy: "Islamabad",
      queueType: "APPOINTMENT_WL_COHORT_FRONTIER",
      observationDate: row.obs,
      observedFrontierDate: row.apptWl,
      confidence: 0.88,
      notes: "Historical Islamabad calibration series (appointment WL cohort)",
    },
  ]);

  const calSummary = await ingestParsedEvidence(
    {
      name: "Islamabad Historical Queue Calibration Series (Oct–Nov 2026)",
      sourceType: "COMMUNITY_PLATFORM",
      sourceRef: "calibration:islamabad-oct-nov-2026",
      publishedAt: new Date("2026-11-26T00:00:00Z"),
      reliability: "VERIFIED_COMMUNITY",
      usagePermission: "STATISTICAL_CALIBRATION",
      verificationStatus: "APPROVED",
    },
    parseStructuredJsonEvidence(calibrationJson)
  );
  totalQueue += calSummary.insertedQueue;
  totalDuplicates += calSummary.duplicatesSkipped;
  console.log("Calibration series ->", JSON.stringify(calSummary));

  // Dated Nov 2026 external platform snapshots (stored strictly as dated observations)
  const waleedSnapshot = parseStructuredJsonEvidence([
    {
      embassy: "Islamabad",
      queueType: "SUBMISSION_FRONTIER",
      observationDate: "2026-11-26",
      observedFrontierDate: "2026-03-02",
      confidence: 0.85,
      notes: "Waleed Tracker Nov 2026 snapshot — submission frontier (~5d/wk, median ~8.5mo)",
    },
    {
      embassy: "Islamabad",
      queueType: "APPOINTMENT_SUBMISSION_FRONTIER",
      observationDate: "2026-11-26",
      observedFrontierDate: "2026-11-22",
      confidence: 0.85,
      notes: "Waleed Tracker Nov 2026 snapshot — appointment frontier by document submission",
    },
  ]);
  const waleedSummary = await ingestParsedEvidence(
    {
      name: "Waleed Tracker Public Analytics Snapshot (Nov 2026)",
      sourceType: "COMMUNITY_PLATFORM",
      sourceRef: "snapshot:waleed-2026-11-26",
      publishedAt: new Date("2026-11-26T00:00:00Z"),
      reliability: "COMMUNITY_PLATFORM",
      usagePermission: "DATED_AGGREGATE_SNAPSHOT",
      verificationStatus: "APPROVED",
    },
    waleedSnapshot
  );
  totalQueue += waleedSummary.insertedQueue;
  totalDuplicates += waleedSummary.duplicatesSkipped;

  const riseSnapshot = parseStructuredJsonEvidence([
    {
      embassy: "Islamabad",
      queueType: "SUBMISSION_FRONTIER",
      observationDate: "2026-11-26",
      observedFrontierDate: "2026-03-10",
      confidence: 0.88,
      notes: "RISE Public Statistics Snapshot (Nov 2026) — Islamabad submission frontier",
    },
    {
      embassy: "Islamabad",
      queueType: "APPOINTMENT_SUBMISSION_FRONTIER",
      observationDate: "2026-11-26",
      observedFrontierDate: "2026-11-26",
      confidence: 0.88,
      notes: "RISE Public Statistics Snapshot (Nov 2026) — Islamabad appointment by doc submission",
    },
    {
      embassy: "Karachi",
      queueType: "SUBMISSION_FRONTIER",
      observationDate: "2026-11-26",
      observedFrontierDate: "2026-07-12",
      confidence: 0.85,
      notes: "RISE Public Statistics Snapshot (Nov 2026) — Karachi submission frontier",
    },
    {
      embassy: "Karachi",
      queueType: "APPOINTMENT_SUBMISSION_FRONTIER",
      observationDate: "2026-11-26",
      observedFrontierDate: "2026-10-25",
      confidence: 0.85,
      notes: "RISE Public Statistics Snapshot (Nov 2026) — Karachi appointment by doc submission",
    },
  ]);
  const riseSummary = await ingestParsedEvidence(
    {
      name: "RISE Public Statistics Snapshot (Nov 2026)",
      sourceType: "COMMUNITY_PLATFORM",
      sourceRef: "snapshot:rise-2026-11-26",
      publishedAt: new Date("2026-11-26T00:00:00Z"),
      reliability: "COMMUNITY_PLATFORM",
      usagePermission: "DATED_AGGREGATE_SNAPSHOT",
      verificationStatus: "APPROVED",
    },
    riseSnapshot
  );
  totalQueue += riseSummary.insertedQueue;
  totalDuplicates += riseSummary.duplicatesSkipped;

  console.log("=== IMPORT TOTALS ===", JSON.stringify({
    totalTimelines,
    totalQueue,
    totalDuplicates,
    totalConflicting,
    totalExcluded,
    dbEvidenceSources: await prisma.evidenceSource.count(),
    dbExternalTimelines: await prisma.externalTimelineObservation.count(),
    dbQueueObservations: await prisma.queueObservation.count(),
    dbApplicantsPreserved: await prisma.applicant.count(),
  }));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
