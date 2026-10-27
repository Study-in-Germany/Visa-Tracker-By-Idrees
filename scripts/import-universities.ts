// Usage: npm run import:universities -- <hrk-export.tsv> [--wikidata] [--linkcheck]
// Runs the HRK import (resumable: re-running continues/updates, never duplicates), then optional enrichment.
import { readFileSync } from "node:fs";
import { createJob, parseHrkTsv, runToEnd } from "../lib/import";
import { prisma } from "../lib/db";

async function run(kind: string, payload?: any, total?: number) {
  const job = await createJob(kind, { payload, total, startedBy: "cli" });
  const done = await runToEnd(job.id, (j) => process.stdout.write(`\r${kind}: ${j.processed}/${j.total}   `));
  console.log(`\n${kind}: ${done.status} created=${done.created} updated=${done.updated} skipped=${done.skipped} failed=${done.failed}${done.error ? " error=" + done.error : ""}`);
  for (const l of (done.log as string[]).filter((x) => /FAILED|CONFLICT/.test(x)).slice(0, 10)) console.log("  ", l);
}

(async () => {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) throw new Error("Pass the path to the HRK export (tab-separated).");
  const rows = parseHrkTsv(readFileSync(file, "utf8"));
  console.log(`Parsed ${rows.length} institutions`);
  await run("hrk", { rows }, rows.length);
  if (flags.includes("--wikidata")) await run("wikidata");
  if (flags.includes("--linkcheck")) await run("linkcheck");
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
