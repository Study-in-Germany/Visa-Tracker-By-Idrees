import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

function ensureEnvLoaded() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!m) continue;
    const key = m[1];
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

test.describe("Authentication, logout revocation & route protection", () => {
  test("Applicant sign-in, role isolation, logout, /dashboard, /tracker, Back button, second tab & CSRF", async ({
    page,
    context,
  }) => {
    ensureEnvLoaded();
    const prisma = new PrismaClient();
    const suffix = randomBytes(4).toString("hex").toUpperCase();
    const publicId = `TEST-E2E-${suffix}`;
    const rawAccessCode = `E2E-${suffix}-9999`;
    const accessCodeHash = await bcrypt.hash(rawAccessCode, 10);

    const applicant = await prisma.applicant.create({
      data: {
        publicId,
        accessCodeHash,
        name: "E2E Security Test",
        consulate: "Islamabad",
        approval: "PENDING_REVIEW",
      },
    });

    try {
      // 1. Direct unauthenticated access to /dashboard redirects to /login
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login/);

      // 2. Direct unauthenticated access to /admin redirects to /admin/login
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/admin\/login/);

      // 3. Sign in via Access code tab using our synthetic test applicant
      await page.goto("/login");
      await page.getByRole("tab", { name: "Access code" }).click();
      await page.getByLabel("Tracking ID").fill(publicId);
      await page.getByLabel("Access code").fill(rawAccessCode);
      const loginRespPromise = page.waitForResponse((r) => r.url().includes("/api/applicant/login"));
      await page.getByRole("button", { name: "Sign in" }).click();
      const loginResp = await loginRespPromise;
      expect(loginResp.status()).toBe(200);

      await expect(page).toHaveURL(/\/dashboard/);

      // 4. Role separation: authenticated applicant must receive 403 on admin endpoints
      const adminOverviewResp = await page.request.get("/api/admin/overview");
      expect(adminOverviewResp.status()).toBe(403);
      const adminTplResp = await page.request.get("/api/admin/imports/template");
      expect(adminTplResp.status()).toBe(403);

      // 5. Open a second tab on /dashboard before logging out
      const secondTab = await context.newPage();
      await secondTab.goto("/dashboard");
      await expect(secondTab).toHaveURL(/\/dashboard/);

      // 6. Log out from the sidebar confirmation modal
      await page.getByRole("button", { name: "Log out" }).first().click();
      await page.getByRole("dialog").getByRole("button", { name: "Log out" }).click();
      await expect(page).toHaveURL(/\/$/);

      // 7. Navigating manually to /dashboard must redirect to /login (no restoration!)
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login/);

      // 8. Navigating to /tracker shows guest state (never authenticated applicant sidebar)
      await page.goto("/tracker");
      await expect(page).toHaveURL(/\/tracker/);
      await expect(page.getByRole("link", { name: "Applicant login" }).first()).toBeVisible();

      // 9. Browser Back must not restore an authenticated dashboard
      await page.goBack();
      await expect(page).not.toHaveURL(/\/dashboard$/);

      // 10. Second tab loses access and redirects to /login on reload
      await secondTab.reload();
      await expect(secondTab).toHaveURL(/\/login/);

      // 11. Protected API returns 401 with private, no-store headers
      const meResp = await page.request.get("/api/applicant/me");
      expect(meResp.status()).toBe(401);
      expect(meResp.headers()["cache-control"]).toContain("no-store");

      // 12. Cross-origin state-changing request is blocked with 403 CSRF
      const csrfResp = await page.request.post("/api/applicant/logout", {
        headers: { Origin: "https://evil.example" },
      });
      expect(csrfResp.status()).toBe(403);

      await secondTab.close();
    } finally {
      await prisma.authSession.deleteMany({ where: { applicantId: applicant.id } }).catch(() => {});
      await prisma.applicant.delete({ where: { id: applicant.id } }).catch(() => {});
      await prisma.$disconnect();
    }
  });
});
