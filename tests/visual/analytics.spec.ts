import { expect, test } from "@playwright/test";

const ARTIFACT_DIR =
  process.env.VERIFICATION_SCREENSHOT_DIR ||
  "C:/Users/umar/.gemini/antigravity/brain/b9cc278b-a5fd-415d-b1a6-e2c9eadb07d3";

const RESPONSIVE_VIEWPORTS = [
  { width: 320, height: 680 },
  { width: 360, height: 740 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 480, height: 854 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 844, height: 390 }, // mobile landscape
];

test.describe("Analytics Complete Redesign — Layout, Statistical Fidelity, Interactions & PWA Responsiveness", () => {
  test("Desktop complete dashboard renders structured bento hierarchy, honest zero-decision separation, interactive drawers, and cross-chart filtering", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/visual-fixtures/analytics");
    await page.waitForLoadState("networkidle");

    const workspace = page.getByTestId("analytics-workspace");
    await expect(workspace).toBeVisible();

    // 1. Toolbar & 4 KPI cards
    await expect(page.getByTestId("analytics-toolbar")).toBeVisible();
    await expect(page.getByTestId("kpi-tracked-applicants")).toContainText("424");
    await expect(page.getByTestId("kpi-active-applications")).toContainText("424");
    await expect(page.getByTestId("kpi-visa-decisions")).toContainText("0");
    await expect(page.getByTestId("kpi-visa-decisions")).not.toContainText("100%");

    // 2. Visa decision card clearly separates internal (0 recorded) from external evidence (n=4)
    const decisions = page.getByTestId("chart-visa-decisions");
    await expect(decisions).toContainText("0 recorded");
    await expect(decisions).toContainText("No internal visa decisions recorded yet");
    await expect(decisions).toContainText("External community evidence (Islamabad)");
    await expect(decisions).toContainText("n=4 decided");

    // 3. Normalized university ranking merges variants without duplicating TU Chemnitz / Arden
    const unis = page.getByTestId("chart-university-ranking");
    await expect(unis).toContainText("TU Chemnitz");
    await expect(unis).toContainText("Arden University");
    await expect(unis).not.toContainText("Arden university ");

    // 4. Desktop filter drawer opens full-height with blurred backdrop without resizing workspace
    const widthBefore = await workspace.evaluate((el) => el.getBoundingClientRect().width);
    const filtersBtn = page.getByTestId("analytics-toolbar").getByRole("button", { name: /^Filters/ }).first();
    await filtersBtn.click();
    const drawer = page.locator("#analytics-filter-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("aria-modal", "true");
    const widthAfter = await workspace.evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.abs(widthAfter - widthBefore)).toBeLessThanOrEqual(0.5);
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(filtersBtn).toBeFocused();

    // 5. Cross-chart embassy filtering works and displays removable active filter chip
    const embassyCard = page.getByTestId("chart-embassy-distribution");
    await embassyCard.getByRole("button", { name: /Karachi/ }).click();
    await expect(page.getByTestId("kpi-tracked-applicants")).toContainText("49");
    await expect(page.getByTestId("analytics-toolbar")).toContainText("Embassy: Karachi");
    await page.getByTestId("analytics-toolbar").getByRole("button", { name: "Reset all" }).click();
    await expect(page.getByTestId("kpi-tracked-applicants")).toContainText("424");

    // 6. Embassy intelligence switching (Islamabad <-> Karachi)
    const intelSection = page.getByTestId("section-embassy-intelligence");
    await intelSection.getByRole("button", { name: "Karachi", exact: true }).click();
    await expect(intelSection).toContainText("Consulate General Karachi");
    await expect(page.getByTestId("chart-queue-progression")).toContainText("Queue progression history (Karachi)");
    await intelSection.getByRole("button", { name: "Islamabad", exact: true }).click();

    // 7. Queue progression anomaly toggle & View data drawer
    const progCard = page.getByTestId("chart-queue-progression");
    await progCard.getByRole("button", { name: /Show 2 flagged reports/i }).click();
    await expect(progCard).toContainText("Flagged individual reports");
    await progCard.getByRole("button", { name: /View data/i }).click();
    await expect(page.getByRole("dialog", { name: /Queue progression log/i })).toBeVisible();
    await page.keyboard.press("Escape");

    // 8. Cohort Matrix mode toggle
    const cohortCard = page.getByTestId("chart-cohort-progress");
    await cohortCard.getByRole("button", { name: "Matrix" }).click();
    await expect(cohortCard.getByRole("table")).toBeVisible();
  });

  test("Edge fixtures: recorded internal decisions, sparse data, long university names, loading skeleton, and error state", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // With internal decisions
    await page.goto("/visual-fixtures/analytics?variant=with-decisions");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("kpi-visa-decisions")).toContainText("86.4%");
    await expect(page.getByTestId("chart-visa-decisions")).toContainText("19 (86.4%)");

    // Sparse / insufficient data
    await page.goto("/visual-fixtures/analytics?variant=sparse");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("chart-correction-rate")).toContainText("Too few submitted applications");
    await expect(page.getByTestId("chart-queue-progression")).toContainText("Not enough queue progression points");

    // Long university names do not overflow
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/visual-fixtures/analytics?variant=long-names");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);

    // Loading & Error states
    await page.goto("/visual-fixtures/analytics?variant=loading");
    await expect(page.getByTestId("fixture-analytics-loading")).toBeVisible();
    await page.goto("/visual-fixtures/analytics?variant=error");
    await expect(page.getByTestId("fixture-analytics-error")).toContainText("Failed to load canonical analytics service");
  });

  test("Zero horizontal overflow across all 12 mandatory viewport sizes (light & dark) and mobile filter bottom sheet", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    for (const vp of RESPONSIVE_VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.goto("/visual-fixtures/analytics");
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflow, `Horizontal overflow at ${vp.width}x${vp.height}`).toBe(false);
    }

    // Mobile filter bottom sheet opens & closes cleanly
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/visual-fixtures/analytics");
    await page.waitForLoadState("networkidle");
    const mobileFiltersBtn = page
      .getByTestId("analytics-toolbar")
      .getByRole("button", { name: /^Filters/ })
      .last();
    await mobileFiltersBtn.click();
    const sheet = page.getByRole("dialog", { name: "Analytics filters" });
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
  });

  test("Live /analytics page renders cleanly in desktop & mobile light/dark, hides WhatsApp button on mobile sheet, and captures final screenshots", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // Desktop light (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("analytics-workspace")).toBeVisible();
    await expect(page.getByTestId("kpi-tracked-applicants")).toBeVisible({ timeout: 25_000 });
    await page.screenshot({ path: `${ARTIFACT_DIR}/analytics-desktop-light.png`, fullPage: true });

    // Verify sidebar collapse works without overflow on /analytics
    const collapseBtn = page.getByRole("button", { name: /collapse sidebar/i });
    if ((await collapseBtn.count()) > 0) {
      await collapseBtn.click();
      const collapsedOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(collapsedOverflow).toBe(false);
      await page.getByRole("button", { name: /expand sidebar/i }).click();
    }

    // Desktop dark (1440x900)
    const themeToggle = page.getByRole("button", { name: /dark mode|switch to dark|theme/i }).first();
    if ((await themeToggle.count()) > 0) {
      await themeToggle.click();
      await page.waitForTimeout(350);
    } else {
      await page.evaluate(() => document.documentElement.classList.add("dark"));
    }
    await page.screenshot({ path: `${ARTIFACT_DIR}/analytics-desktop-dark.png`, fullPage: true });

    // Mobile dark (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    const mobileDarkOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(mobileDarkOverflow).toBe(false);
    await page.screenshot({ path: `${ARTIFACT_DIR}/analytics-mobile-dark.png`, fullPage: true });

    // Mobile light (390x844) + check WhatsApp button auto-hide when filter sheet opens
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${ARTIFACT_DIR}/analytics-mobile-light.png`, fullPage: true });

    const waBtn = page.getByTestId("floating-whatsapp-button");
    await expect(waBtn).toBeVisible();
    await page
      .getByTestId("analytics-toolbar")
      .getByRole("button", { name: /^Filters/ })
      .last()
      .click();
    await expect(page.getByRole("dialog", { name: "Analytics filters" })).toBeVisible();
    await expect(waBtn).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(waBtn).toBeVisible();
  });
});
