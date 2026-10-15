import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";

test("baselines and upgrades a populated legacy database without losing data", {
  skip: !process.env.TEST_DATABASE_URL,
}, async () => {
  const schema = `migration_test_${randomUUID().replaceAll("-", "")}`;
  const url = new URL(process.env.TEST_DATABASE_URL!);
  url.searchParams.set("schema", schema);
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  const cli = (...args: string[]) => execFileSync(process.execPath, ["node_modules/prisma/build/index.js", ...args], {
    env: { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString() },
    stdio: "pipe",
  });

  try {
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    cli("db", "execute", "--file", "prisma/migrations/20261015000000_baseline/migration.sql", "--schema", "prisma/schema.prisma");
    await db.$executeRaw`
      INSERT INTO "Applicant" ("id", "publicId", "accessCodeHash", "name", "updatedAt")
      VALUES ('legacy-applicant', 'PK-ISB-10482', 'legacy-hash', 'Legacy applicant', NOW())
    `;
    await db.$executeRaw`
      INSERT INTO "StatusEvent" ("id", "applicantId", "visaStatus")
      VALUES ('legacy-event', 'legacy-applicant', 'WAITING_LIST')
    `;
    await db.$executeRaw`
      INSERT INTO "Announcement" ("id", "title", "body", "updatedAt")
      VALUES ('legacy-announcement', 'Legacy notice', 'Keep this content', NOW())
    `;

    cli("migrate", "resolve", "--applied", "20261015000000_baseline");
    cli("migrate", "deploy");
    // Repeated deployments are safe and do not reapply either migration.
    cli("migrate", "deploy");

    const applicant = await db.applicant.findUniqueOrThrow({
      where: { id: "legacy-applicant" }, include: { history: true },
    });
    assert.equal(applicant.deletedAt, null);
    assert.equal(applicant.publicId, "PK-ISB-10482");
    assert.equal(applicant.accessCodeHash, "legacy-hash");
    assert.equal(applicant.history[0].id, "legacy-event");
    const announcement = await db.announcement.findUniqueOrThrow({ where: { id: "legacy-announcement" } });
    assert.equal(announcement.deletedAt, null);
    assert.equal(announcement.body, "Keep this content");
    await assert.rejects(db.statusEvent.create({
      data: { applicantId: "missing-applicant", visaStatus: "WAITING_LIST" },
    }), { code: "P2003" });
  } finally {
    await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await db.$disconnect();
  }
});
