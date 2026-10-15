import "next/dist/server/node-environment";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { after, before, beforeEach, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { AppPrismaClient } from "../lib/db";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { requestAsyncStorage } from "next/dist/client/components/request-async-storage.external";
import { RequestAsyncStorageWrapper } from "next/dist/server/async-storage/request-async-storage-wrapper";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe("tracking IDs and applicant soft deletion (PostgreSQL)", { skip: !testDatabaseUrl }, () => {
  const schema = `tracking_id_test_${randomUUID().replaceAll("-", "")}`;
  let db: AppPrismaClient;
  // Only test setup and archival assertions bypass soft deletion.
  let raw: PrismaClient;
  let createClient: typeof import("../lib/db").createPrismaClient;
  let createApplicant: typeof import("../lib/create-applicant").createApplicantWithTrackingId;
  let submit: typeof import("../app/api/applicants/route").POST;
  let list: typeof import("../app/api/applicants/route").GET;
  let details: typeof import("../app/api/applicants/[id]/route");
  let login: typeof import("../app/api/applicant/login/route").POST;
  let me: typeof import("../app/api/applicant/me/route");
  let analytics: typeof import("../app/api/analytics/route").GET;
  let restore: typeof import("../app/api/applicants/[id]/restore/route").POST;
  let announcements: typeof import("../app/api/announcements/route");
  let announcementDetails: typeof import("../app/api/announcements/[id]/route");
  let restoreAnnouncement: typeof import("../app/api/announcements/[id]/restore/route").POST;
  let auth: typeof import("../lib/auth");
  let adminCookie: string;

  const inRequest = <T>(cookie: string, callback: () => T) =>
    RequestAsyncStorageWrapper.wrap(requestAsyncStorage, {
      req: new NextRequest("http://localhost", { headers: { cookie } }),
    }, callback);
  const request = (path: string, method = "GET", body?: object) => new NextRequest(`http://localhost${path}`, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  });

  before(async () => {
    // Every run gets its own schema; existing database records are never touched.
    const url = new URL(testDatabaseUrl!);
    url.searchParams.set("schema", schema);
    process.env.DATABASE_URL = url.toString();
    process.env.DIRECT_URL = url.toString();
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], {
      env: process.env,
      stdio: "pipe",
    });
    const database = await import("../lib/db");
    db = database.prisma;
    createClient = database.createPrismaClient;
    const { PrismaClient } = await import("@prisma/client");
    raw = new PrismaClient();
    createApplicant = (await import("../lib/create-applicant")).createApplicantWithTrackingId;
    submit = (await import("../app/api/applicants/route")).POST;
    list = (await import("../app/api/applicants/route")).GET;
    details = await import("../app/api/applicants/[id]/route");
    login = (await import("../app/api/applicant/login/route")).POST;
    me = await import("../app/api/applicant/me/route");
    analytics = (await import("../app/api/analytics/route")).GET;
    restore = (await import("../app/api/applicants/[id]/restore/route")).POST;
    announcements = await import("../app/api/announcements/route");
    announcementDetails = await import("../app/api/announcements/[id]/route");
    restoreAnnouncement = (await import("../app/api/announcements/[id]/restore/route")).POST;
    auth = await import("../lib/auth");
    process.env.AUTH_SECRET = "tracking-id-tests-only-secret";
    adminCookie = `${auth.SESSION_COOKIE_NAME}=${await auth.createSessionToken("admin@example.test")}`;
  });

  beforeEach(async () => {
    await raw.applicant.deleteMany();
    await raw.announcement.deleteMany();
  });

  after(async () => {
    if (db) {
      // The identifier is generated here from a UUID and contains no user input.
      await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      await db.$disconnect();
    }
    await raw?.$disconnect();
  });

  const applicantData = (consulate = "Islamabad") => ({
    name: "Test applicant",
    accessCodeHash: "test-hash",
    consulate,
    history: { create: [{ visaStatus: "WAITING_LIST" as const, note: "Test entry" }] },
  });

  it("starts an independent sequence at 10000 for each consulate", async () => {
    assert.equal((await createApplicant(applicantData())).publicId, "PK-ISB-10000");
    assert.equal((await createApplicant(applicantData("Karachi"))).publicId, "PK-KHI-10000");
  });

  it("never reuses the highest issued ID after deletion, even with a different client", async () => {
    await createApplicant(applicantData());
    const highest = await createApplicant(applicantData());
    const response = await inRequest(adminCookie, () => details.DELETE(
      request(`/api/applicants/${highest.id}`, "DELETE"), { params: { id: highest.id } },
    ));
    assert.equal(response.status, 200);
    const retained = await raw.applicant.findUniqueOrThrow({
      where: { id: highest.id }, include: { history: true },
    });
    assert.ok(retained.deletedAt instanceof Date);
    assert.equal(retained.history.length, 1);
    const otherClient = createClient();
    try {
      assert.equal((await createApplicant(applicantData(), otherClient)).publicId, "PK-ISB-10002");
    } finally {
      await otherClient.$disconnect();
    }
  });

  it("reserves IDs after every applicant is soft deleted", async () => {
    await createApplicant(applicantData());
    await createApplicant(applicantData());
    const result = await db.applicant.deleteMany();
    assert.equal(result.count, 2);
    assert.equal(await raw.applicant.count(), 2);
    assert.equal(await db.applicant.count(), 0);
    assert.equal((await createApplicant(applicantData())).publicId, "PK-ISB-10002");
    assert.equal((await createApplicant(applicantData("Karachi"))).publicId, "PK-KHI-10000");
  });

  it("reserves a deleted applicant's ID after their consulate changes", async () => {
    await db.applicant.create({ data: {
      name: "Existing applicant", accessCodeHash: "test-hash",
      consulate: "Karachi", publicId: "PK-ISB-10482", deletedAt: new Date(),
    } });
    assert.equal((await createApplicant(applicantData())).publicId, "PK-ISB-10483");
  });

  it("requires an admin to delete and leaves the record unchanged for other users", async () => {
    const applicant = await createApplicant(applicantData());
    const token = await auth.createApplicantSessionToken(applicant.id, applicant.publicId);
    for (const cookie of ["", `${auth.APPLICANT_SESSION_COOKIE_NAME}=${token}`]) {
      const response = await inRequest(cookie, () => details.DELETE(
        request(`/api/applicants/${applicant.id}`, "DELETE"), { params: { id: applicant.id } },
      ));
      assert.equal(response.status, 401);
    }
    assert.equal((await db.applicant.findUniqueOrThrow({ where: { id: applicant.id } })).deletedAt, null);
  });

  it("hides deleted records from public/admin lists, details, and analytics", async () => {
    const active = await createApplicant({ ...applicantData(), approval: "APPROVED", university: "Active University" });
    const deleted = await createApplicant({ ...applicantData(), approval: "APPROVED", university: "Deleted University" });
    const params = { params: { id: deleted.id } };
    assert.equal((await inRequest(adminCookie, () => details.DELETE(
      request(`/api/applicants/${deleted.id}`, "DELETE"), params,
    ))).status, 200);

    for (const cookie of ["", adminCookie]) {
      const response = await inRequest(cookie, () => list(request("/api/applicants")));
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.count, 1);
      assert.deepEqual(result.applicants.map((a: { id: string }) => a.id), [active.id]);
      for (const id of [deleted.id, deleted.publicId]) {
        assert.equal((await inRequest(cookie, () => details.GET(
          request(`/api/applicants/${id}`), { params: { id } },
        ))).status, 404);
      }
    }
    const stats = await (await analytics(request("/api/analytics"))).json();
    assert.equal(stats.total, 1);
    assert.deepEqual(stats.topUniversities, [{ university: "Active University", count: 1 }]);
    assert.equal((await inRequest(adminCookie, () => details.PATCH(
      request(`/api/applicants/${deleted.id}`, "PATCH", { name: "Changed", deletedAt: null }), params,
    ))).status, 404);
    const timestamp = (await raw.applicant.findUniqueOrThrow({ where: { id: deleted.id } })).deletedAt;
    assert.equal((await inRequest(adminCookie, () => details.DELETE(
      request(`/api/applicants/${deleted.id}`, "DELETE"), params,
    ))).status, 404);
    assert.deepEqual((await raw.applicant.findUniqueOrThrow({ where: { id: deleted.id } })).deletedAt, timestamp);
    assert.equal((await inRequest(adminCookie, () => details.DELETE(
      request("/api/applicants/missing", "DELETE"), { params: { id: "missing" } },
    ))).status, 404);
  });

  it("blocks deleted applicants from login and from using an existing session", async () => {
    const accessCode = "ABCD-2345";
    const applicant = await createApplicant({ ...applicantData(), accessCodeHash: await bcrypt.hash(accessCode, 4) });
    const cookie = `${auth.APPLICANT_SESSION_COOKIE_NAME}=${await auth.createApplicantSessionToken(applicant.id, applicant.publicId)}`;
    const loginRequest = () => request("/api/applicant/login", "POST", { publicId: applicant.publicId, accessCode });
    assert.equal((await login(loginRequest())).status, 200);
    assert.equal((await inRequest(cookie, () => me.GET())).status, 200);
    assert.equal((await inRequest(cookie, () => me.PATCH(request("/api/applicant/me", "PATCH", { city: "Lahore" })))).status, 200);
    await inRequest(adminCookie, () => details.DELETE(request(`/api/applicants/${applicant.id}`, "DELETE"), { params: { id: applicant.id } }));
    const response = await login(loginRequest());
    assert.equal(response.status, 401);
    assert.equal(response.headers.has("set-cookie"), false);
    assert.equal((await inRequest(cookie, () => me.GET())).status, 404);
    assert.equal((await inRequest(cookie, () => me.PATCH(request("/api/applicant/me", "PATCH", { city: "Karachi", deletedAt: null })))).status, 404);
    assert.equal((await raw.applicant.findUniqueOrThrow({ where: { id: applicant.id } })).city, "Lahore");
  });

  it("soft deletes through the client and filters unique reads, counts, aggregates, and relations", async () => {
    const active = await createApplicant(applicantData());
    const deleted = await createApplicant({ ...applicantData(), visaStatus: "VISA_ISSUED" });
    await db.applicant.delete({ where: { id: deleted.id } });
    assert.ok((await raw.applicant.findUniqueOrThrow({ where: { id: deleted.id } })).deletedAt);
    assert.equal(await db.applicant.findUnique({ where: { id: deleted.id } }), null);
    await assert.rejects(db.applicant.findUniqueOrThrow({ where: { id: deleted.id } }), { code: "P2025" });
    assert.deepEqual((await db.applicant.findMany()).map((a) => a.id), [active.id]);
    assert.equal(await db.applicant.count(), 1);
    assert.deepEqual(await db.applicant.aggregate({ _count: { _all: true } }), { _count: { _all: 1 } });
    assert.deepEqual(await db.applicant.groupBy({ by: ["visaStatus"], _count: { _all: true } }), [
      { visaStatus: "WAITING_LIST", _count: { _all: 1 } },
    ]);
    const history = await db.statusEvent.findFirstOrThrow({
      where: { applicantId: deleted.id }, include: { applicant: true },
    });
    assert.equal(history.applicant, null);
    assert.equal(await db.statusEvent.count(), 2);
  });

  it("guards updates centrally and permits an explicit restore", async () => {
    const applicant = await createApplicant(applicantData());
    await db.applicant.delete({ where: { id: applicant.id } });
    await assert.rejects(db.applicant.update({ where: { id: applicant.id }, data: { city: "Karachi" } }), { code: "P2025" });
    assert.equal((await db.applicant.updateMany({ data: { city: "Karachi" } })).count, 0);
    assert.equal((await raw.applicant.findUniqueOrThrow({ where: { id: applicant.id } })).city, null);
    const archived = await db.applicant.findMany({ where: { deletedAt: { not: null } } });
    assert.deepEqual(archived.map((a) => a.id), [applicant.id]);
    await db.applicant.update({
      where: { id: applicant.id, deletedAt: { not: null } }, data: { deletedAt: null },
    });
    assert.equal((await db.applicant.findUniqueOrThrow({ where: { id: applicant.id } })).deletedAt, null);
    assert.equal((await createApplicant(applicantData())).publicId, "PK-ISB-10001");
  });

  it("protects unique updates and upserts against silently changing deleted records", async () => {
    const applicant = await createApplicant(applicantData());
    await db.applicant.delete({ where: { id: applicant.id } });
    await assert.rejects(db.applicant.update({
      where: { id: applicant.id, deletedAt: undefined }, data: { city: "Karachi" },
    }), { code: "P2025" });
    await assert.rejects(db.applicant.upsert({
      where: { publicId: applicant.publicId },
      create: { ...applicantData(), publicId: applicant.publicId },
      update: { city: "Karachi", deletedAt: null },
    }), { code: "P2002" });
    const saved = await raw.applicant.findUniqueOrThrow({ where: { id: applicant.id } });
    assert.equal(saved.city, null);
    assert.ok(saved.deletedAt);
  });

  it("makes trash and restore admin-only and restores without changing approval or credentials", async () => {
    const applicant = await createApplicant({ ...applicantData(), approval: "PENDING_REVIEW" });
    const params = { params: { id: applicant.id } };
    const applicantCookie = `${auth.APPLICANT_SESSION_COOKIE_NAME}=${await auth.createApplicantSessionToken(applicant.id, applicant.publicId)}`;
    await inRequest(adminCookie, () => details.DELETE(request(`/api/applicants/${applicant.id}`, "DELETE"), params));
    for (const cookie of ["", applicantCookie]) {
      assert.equal((await inRequest(cookie, () => list(request("/api/applicants?deleted=true")))).status, 401);
      assert.equal((await inRequest(cookie, () => restore(request(`/api/applicants/${applicant.id}/restore`, "POST"), params))).status, 401);
    }
    const trash = await (await inRequest(adminCookie, () => list(request("/api/applicants?deleted=true")))).json();
    assert.deepEqual(trash.applicants.map((a: { id: string }) => a.id), [applicant.id]);
    assert.ok(trash.applicants[0].deletedAt);
    const responses = await Promise.all(Array.from({ length: 2 }, () =>
      inRequest(adminCookie, () => restore(request(`/api/applicants/${applicant.id}/restore`, "POST"), params)),
    ));
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 404]);
    const restored = await db.applicant.findUniqueOrThrow({ where: { id: applicant.id }, include: { history: true } });
    assert.equal(restored.deletedAt, null);
    assert.equal(restored.approval, "PENDING_REVIEW");
    assert.equal(restored.publicId, applicant.publicId);
    assert.equal(restored.accessCodeHash, applicant.accessCodeHash);
    assert.equal(restored.history.length, 1);
    assert.equal((await inRequest("", () => details.GET(request(`/api/applicants/${applicant.id}`), params))).status, 404);
  });

  it("soft deletes announcements, protects their trash, and supports admin recovery", async () => {
    const announcement = await db.announcement.create({ data: { title: "Notice", body: "Details", pinned: true } });
    const params = { params: { id: announcement.id } };
    const path = `/api/announcements/${announcement.id}`;
    assert.equal((await inRequest("", () => announcementDetails.DELETE(request(path, "DELETE"), params))).status, 401);
    assert.equal((await inRequest(adminCookie, () => announcementDetails.DELETE(request(path, "DELETE"), params))).status, 200);
    const archived = await raw.announcement.findUniqueOrThrow({ where: { id: announcement.id } });
    assert.ok(archived.deletedAt);
    assert.equal(archived.body, "Details");
    assert.deepEqual((await (await announcements.GET(request("/api/announcements"))).json()).announcements, []);
    assert.equal((await inRequest("", () => announcements.GET(request("/api/announcements?deleted=true")))).status, 401);
    assert.equal((await inRequest("", () => restoreAnnouncement(request(`${path}/restore`, "POST"), params))).status, 401);
    const trash = await (await inRequest(adminCookie, () => announcements.GET(request("/api/announcements?deleted=true")))).json();
    assert.deepEqual(trash.announcements.map((a: { id: string }) => a.id), [announcement.id]);
    assert.equal((await inRequest(adminCookie, () => announcementDetails.PATCH(request(path, "PATCH", { title: "Changed", deletedAt: null }), params))).status, 404);
    assert.equal((await inRequest(adminCookie, () => announcementDetails.DELETE(request(path, "DELETE"), params))).status, 404);
    assert.equal((await inRequest(adminCookie, () => restoreAnnouncement(request(`${path}/restore`, "POST"), params))).status, 200);
    assert.equal((await inRequest(adminCookie, () => restoreAnnouncement(request(`${path}/restore`, "POST"), params))).status, 404);
    const restored = await db.announcement.findUniqueOrThrow({ where: { id: announcement.id } });
    assert.equal(restored.title, "Notice");
    assert.equal(restored.pinned, true);
  });

  it("preserves transactional rollback for explicit lifecycle updates", async () => {
    const applicant = await createApplicant(applicantData());
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.applicant.updateMany({ where: { id: applicant.id }, data: { deletedAt: new Date() } });
      assert.equal(await tx.applicant.count(), 0);
      throw new Error("Cancel deletion");
    }), /Cancel deletion/);
    assert.equal((await db.applicant.findUniqueOrThrow({ where: { id: applicant.id } })).deletedAt, null);
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

  it("compares sequence numbers numerically across the five-digit boundary", async () => {
    await db.applicant.createMany({ data: [
      { name: "Existing", accessCodeHash: "test-hash", publicId: "PK-ISB-99999" },
      { name: "Existing", accessCodeHash: "test-hash", publicId: "PK-ISB-100000" },
    ] });
    assert.equal((await createApplicant(applicantData())).publicId, "PK-ISB-100001");
  });

  it("serializes concurrent submissions and imports across database clients", async () => {
    const otherClient = createClient();
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
      history: { create: [{ visaStatus: "INVALID" as never }] },
    }));
    assert.equal(await db.applicant.count(), 0);
    assert.equal((await createApplicant(applicantData())).publicId, "PK-ISB-10000");
  });
});
