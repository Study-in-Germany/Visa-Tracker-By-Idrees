import "next/dist/server/node-environment";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { after, before, beforeEach, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { requestAsyncStorage } from "next/dist/client/components/request-async-storage.external";
import { RequestAsyncStorageWrapper } from "next/dist/server/async-storage/request-async-storage-wrapper";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe("tracking ID allocation (PostgreSQL)", { skip: !testDatabaseUrl }, () => {
  const schema = `tracking_id_test_${randomUUID().replaceAll("-", "")}`;
  let db: typeof import("../lib/db").prisma;
  let raw: PrismaClient;
  let createApplicant: typeof import("../lib/create-applicant").createApplicantWithTrackingId;
  let submit: typeof import("../app/api/applicants/route").POST;
  let importApplicants: typeof import("../app/api/admin/import-applicants/route").POST;
  let adminCookie: string;

  const inAdminRequest = <T>(callback: () => T) => RequestAsyncStorageWrapper.wrap(requestAsyncStorage, {
    req: new NextRequest("http://localhost", { headers: { cookie: adminCookie } }),
  }, callback);

  before(async () => {
    const url = new URL(testDatabaseUrl!);
    url.searchParams.set("schema", schema);
    process.env.DATABASE_URL = url.toString();
    process.env.DIRECT_URL = url.toString();
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], {
      env: process.env, stdio: "pipe",
    });
    db = (await import("../lib/db")).prisma;
    const { PrismaClient } = await import("@prisma/client");
    raw = new PrismaClient();
    createApplicant = (await import("../lib/create-applicant")).createApplicantWithTrackingId;
    submit = (await import("../app/api/applicants/route")).POST;
    importApplicants = (await import("../app/api/admin/import-applicants/route")).POST;
    process.env.AUTH_SECRET = "tracking-id-tests-only-secret";
    const auth = await import("../lib/auth");
    adminCookie = `${auth.SESSION_COOKIE_NAME}=${await auth.createSessionToken("tracking-id-admin@example.test")}`;
  });
  beforeEach(async () => {
    await raw.applicant.deleteMany();
    await raw.adminUser.deleteMany();
    await raw.adminUser.create({ data: { email: "tracking-id-admin@example.test", passwordHash: "test-hash" } });
  });
  after(async () => {
    if (db) {
      await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      await db.$disconnect();
    }
    await raw?.$disconnect();
  });
  const applicantData = (consulate = "Islamabad") => ({
    name: "Test applicant", accessCodeHash: "test-hash", consulate,
    history: { create: [{ visaStatus: "WAITING_LIST" as const, note: "Test entry" }] },
  });

  it("starts an independent sequence at 10000 for each consulate", async () => {
    assert.equal((await createApplicant(applicantData())).publicId, "PK-ISB-10000");
    assert.equal((await createApplicant(applicantData("Karachi"))).publicId, "PK-KHI-10000");
  });

  it("submits successfully when deletions leave all five old candidates occupied", async () => {
    // With ten rows, the former count-based allocator retried 10010–10014,
    // all of which already exist after the first five entries were deleted.
    await db.applicant.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        name: "Existing applicant",
        accessCodeHash: "test-hash",
        consulate: "Islamabad",
        publicId: `PK-ISB-${10005 + i}`,
      })),
    });
    const response = await submit(new NextRequest("http://localhost/api/applicants", {
      method: "POST",
      body: JSON.stringify({
        name: "Anonymous",
        consulate: "Islamabad",
        university: "RPTU",
        waitingListDate: "2026-05-11",
        isAnonymous: true,
      }),
    }));
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.publicId, "PK-ISB-10015");
    assert.equal(result.applicant.approval, "PENDING_REVIEW");
    assert.equal(result.applicant.isAnonymous, true);
    assert.equal("accessCodeHash" in result.applicant, false);
    const saved = await db.applicant.findUniqueOrThrow({
      where: { publicId: result.publicId },
      include: { history: true },
    });
    assert.ok(await bcrypt.compare(result.accessCode, saved.accessCodeHash));
    assert.equal(saved.history.length, 1);
    assert.equal(saved.history[0].note, "Entry submitted by applicant");
  });

  it("respects existing IDs after a consulate change and ignores demo IDs", async () => {
    await db.applicant.createMany({ data: [
      { name: "Demo", accessCodeHash: "test-hash", publicId: "DEMO-0001" },
      { name: "Moved", accessCodeHash: "test-hash", consulate: "Karachi", publicId: "PK-ISB-10482" },
      { name: "Legacy", accessCodeHash: "test-hash", publicId: "PK-ISB-INVALID" },
    ] });
    assert.equal((await createApplicant(applicantData())).publicId, "PK-ISB-10483");
    assert.equal((await createApplicant(applicantData("Karachi"))).publicId, "PK-KHI-10000");
  });

  it("imports CSV rows above existing IDs instead of retrying occupied IDs", async () => {
    await db.applicant.createMany({ data: Array.from({ length: 10 }, (_, i) => ({
      name: "Existing applicant", accessCodeHash: "test-hash", publicId: `PK-ISB-${10005 + i}`,
    })) });
    const form = new FormData();
    form.set("file", new File(["Name,Consulate,University\nFirst import,Islamabad,RPTU\nSecond import,Islamabad,RPTU"], "applicants.csv", { type: "text/csv" }));
    const response = await inAdminRequest(() => importApplicants(new NextRequest("http://localhost/api/admin/import-applicants", {
      method: "POST", body: form,
    })));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.createdCount, 2);
    assert.equal(result.skippedCount, 0);
    assert.deepEqual(result.results.map((r: { publicId: string }) => r.publicId), ["PK-ISB-10015", "PK-ISB-10016"]);
    const imported = await db.applicant.findMany({
      where: { publicId: { in: ["PK-ISB-10015", "PK-ISB-10016"] } }, include: { history: true },
    });
    assert.ok(imported.every((a) => a.approval === "APPROVED" && a.history.length === 1 && a.history[0].note === "Imported via CSV"));
  });

  it("reserves IDs belonging to retained applicants", async () => {
    const retained = await db.applicant.create({ data: {
      name: "Retained applicant", accessCodeHash: "test-hash", publicId: "PK-ISB-10482", approval: "REJECTED",
    } });
    // Also exercise the soft-delete extension when this fix is combined with PR #1.
    if (Prisma.dmmf.datamodel.models.find((m) => m.name === "Applicant")?.fields.some((f) => f.name === "deletedAt")) {
      await raw.$executeRaw`UPDATE "Applicant" SET "deletedAt" = NOW() WHERE "id" = ${retained.id}`;
      assert.equal(await db.applicant.findUnique({ where: { id: retained.id } }), null);
    }
    assert.equal((await createApplicant(applicantData())).publicId, "PK-ISB-10483");
  });

  it("compares sequence numbers numerically across the five-digit boundary", async () => {
    await db.applicant.createMany({ data: [
      { name: "Existing", accessCodeHash: "test-hash", publicId: "PK-ISB-99999" },
      { name: "Existing", accessCodeHash: "test-hash", publicId: "PK-ISB-100000" },
    ] });
    assert.equal((await createApplicant(applicantData())).publicId, "PK-ISB-100001");
  });

  it("serializes concurrent submissions and imports across database clients", async () => {
    const { PrismaClient } = await import("@prisma/client");
    const otherClient = new PrismaClient();
    try {
      const created = await Promise.all(Array.from({ length: 12 }, (_, i) =>
        createApplicant({
          ...applicantData(),
          approval: i % 2 ? "APPROVED" : "PENDING_REVIEW",
        }, i % 2 ? db : otherClient),
      ));
      assert.deepEqual(created.map((a) => a.publicId).sort(),
        Array.from({ length: 12 }, (_, i) => `PK-ISB-${10000 + i}`));
      assert.equal(await db.statusEvent.count(), 12);
    } finally {
      await otherClient.$disconnect();
    }
  });

  it("rolls back failed creations and releases the allocation lock", async () => {
    await assert.rejects(createApplicant({
      ...applicantData(),
      history: { create: [
        { id: "duplicate-history", visaStatus: "WAITING_LIST" },
        { id: "duplicate-history", visaStatus: "WAITING_LIST" },
      ] },
    }), { code: "P2002" });
    assert.equal(await db.applicant.count(), 0);
    assert.equal((await createApplicant(applicantData())).publicId, "PK-ISB-10000");
  });
});
