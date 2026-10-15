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

describe("soft deletion (PostgreSQL)", { skip: !testDatabaseUrl }, () => {
  const schema = `soft_delete_test_${randomUUID().replaceAll("-", "")}`;
  let db: AppPrismaClient;
  // Only test setup and archival assertions bypass soft deletion.
  let raw: PrismaClient;
  let submit: typeof import("../app/api/applicants/route").POST;
  let list: typeof import("../app/api/applicants/route").GET;
  let details: typeof import("../app/api/applicants/[id]/route");
  let login: typeof import("../app/api/applicant/login/route").POST;
  let me: typeof import("../app/api/applicant/me/route");
  let analytics: typeof import("../app/api/analytics/route").GET;
  let announcements: typeof import("../app/api/announcements/route");
  let announcementDetails: typeof import("../app/api/announcements/[id]/route");
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
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], {
      env: process.env,
      stdio: "pipe",
    });
    const database = await import("../lib/db");
    db = database.prisma;
    const { PrismaClient } = await import("@prisma/client");
    raw = new PrismaClient();
    submit = (await import("../app/api/applicants/route")).POST;
    list = (await import("../app/api/applicants/route")).GET;
    details = await import("../app/api/applicants/[id]/route");
    login = (await import("../app/api/applicant/login/route")).POST;
    me = await import("../app/api/applicant/me/route");
    analytics = (await import("../app/api/analytics/route")).GET;
    announcements = await import("../app/api/announcements/route");
    announcementDetails = await import("../app/api/announcements/[id]/route");
    auth = await import("../lib/auth");
    process.env.AUTH_SECRET = "tracking-id-tests-only-secret";
    adminCookie = `${auth.SESSION_COOKIE_NAME}=${await auth.createSessionToken("admin@example.test")}`;
  });

  beforeEach(async () => {
    sequence = 10000;
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

  let sequence = 10000;
  const createApplicant = (data: Omit<import("@prisma/client").Prisma.ApplicantCreateInput, "publicId">) =>
    db.applicant.create({ data: { ...data, publicId: `PK-ISB-${sequence++}` } });

  it("keeps deleted tracking IDs reserved when creating new submissions", async () => {
    const submitEntry = () => submit(request("/api/applicants", "POST", {
      name: "Test applicant", consulate: "Islamabad", isAnonymous: true,
    }));
    for (let i = 0; i < 2; i++) assert.equal((await submitEntry()).status, 201);
    await db.applicant.deleteMany();
    const response = await submitEntry();
    assert.equal(response.status, 201);
    assert.equal((await response.json()).publicId, "PK-ISB-10002");
    assert.equal(await raw.applicant.count(), 3);
    assert.equal(await db.applicant.count(), 1);
  });

  it("retains announcement content while hiding deleted notices", async () => {
    const notice = await db.announcement.create({ data: { title: "Notice", body: "Details" } });
    const params = { params: { id: notice.id } };
    const path = `/api/announcements/${notice.id}`;
    assert.equal((await inRequest("", () => announcementDetails.DELETE(request(path, "DELETE"), params))).status, 401);
    assert.equal((await inRequest(adminCookie, () => announcementDetails.DELETE(request(path, "DELETE"), params))).status, 200);
    const retained = await raw.announcement.findUniqueOrThrow({ where: { id: notice.id } });
    assert.ok(retained.deletedAt);
    assert.equal(retained.body, "Details");
    assert.deepEqual((await (await announcements.GET()).json()).announcements, []);
    assert.equal((await inRequest(adminCookie, () => announcementDetails.PATCH(request(path, "PATCH", { title: "Changed" }), params))).status, 404);
    assert.equal((await inRequest(adminCookie, () => announcementDetails.DELETE(request(path, "DELETE"), params))).status, 404);
    assert.deepEqual((await raw.announcement.findUniqueOrThrow({ where: { id: notice.id } })).deletedAt, retained.deletedAt);
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

  it("preserves transactional rollback for explicit lifecycle updates", async () => {
    const applicant = await createApplicant(applicantData());
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.applicant.updateMany({ where: { id: applicant.id }, data: { deletedAt: new Date() } });
      assert.equal(await tx.applicant.count(), 0);
      throw new Error("Cancel deletion");
    }), /Cancel deletion/);
    assert.equal((await db.applicant.findUniqueOrThrow({ where: { id: applicant.id } })).deletedAt, null);
  });

});
