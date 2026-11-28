import { expect, test } from "@playwright/test";

test.describe("Locked Stage Timeline, StatCard & Transit Journey Baselines", () => {
  test("Timeline tools and centered announcements empty state (light/dark responsive)", async ({ page }) => {
    await page.goto("/visual-fixtures");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("timeline-calculator-card")).toHaveScreenshot("timeline-calculator-light.png");
    await expect(page.getByTestId("announcements-empty-state")).toHaveScreenshot("announcements-empty-light.png");

    await page.goto("/visual-fixtures?theme=dark");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("timeline-calculator-card")).toHaveScreenshot("timeline-calculator-dark.png");
    await expect(page.getByTestId("announcements-empty-state")).toHaveScreenshot("announcements-empty-dark.png");

    for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await expect(page.getByTestId("fixture-overview-tools")).toHaveScreenshot(`overview-tools-${viewport.width}.png`);
    }
  });
  test("VisaStageDurationTimeline and CorrectionSummary (light desktop)", async ({ page }) => {
    await page.goto("/visual-fixtures");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("fixture-stage-timeline")).toHaveScreenshot(
      "visa-stage-timeline-desktop-light.png"
    );
    await expect(page.getByTestId("fixture-stage-timeline-insufficient")).toHaveScreenshot(
      "visa-stage-timeline-insufficient-light.png"
    );
    await expect(page.getByTestId("correction-summary").first()).toHaveScreenshot(
      "correction-summary-light.png"
    );
  });

  test("VisaStageDurationTimeline (dark & tablet/mobile)", async ({ page }) => {
    await page.goto("/visual-fixtures?theme=dark");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("fixture-stage-timeline")).toHaveScreenshot(
      "visa-stage-timeline-desktop-dark.png"
    );

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/visual-fixtures");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("fixture-stage-timeline")).toHaveScreenshot(
      "visa-stage-timeline-tablet-light.png"
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/visual-fixtures");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("fixture-stage-timeline")).toHaveScreenshot(
      "visa-stage-timeline-mobile-light.png"
    );
  });

  test("TransitVisaJourney states (light desktop, dark desktop, mobile)", async ({ page }) => {
    await page.goto("/visual-fixtures");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("fixture-transit-journey-current")).toHaveScreenshot(
      "transit-journey-desktop-light.png"
    );
    await expect(page.getByTestId("fixture-transit-journey-action")).toHaveScreenshot(
      "transit-journey-action-light.png"
    );
    await expect(page.getByTestId("fixture-transit-journey-completed")).toHaveScreenshot(
      "transit-journey-completed-light.png"
    );
    await expect(page.getByTestId("fixture-transit-journey-missing")).toHaveScreenshot(
      "transit-journey-missing-light.png"
    );

    await page.goto("/visual-fixtures?theme=dark");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("fixture-transit-journey-current")).toHaveScreenshot(
      "transit-journey-desktop-dark.png"
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/visual-fixtures");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("fixture-transit-journey-current")).toHaveScreenshot(
      "transit-journey-mobile-light.png"
    );

    await page.goto("/visual-fixtures?theme=dark");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("fixture-transit-journey-current")).toHaveScreenshot(
      "transit-journey-mobile-dark.png"
    );
  });
});

test.describe("Option B Segmented QueueOverview Baselines", () => {
  test("QueueOverview, edge boundaries, cross-year, empty & skeletons (light desktop)", async ({ page }) => {
    await page.goto("/visual-fixtures");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("fixture-queue-overview")).toHaveScreenshot(
      "queue-overview-desktop-light.png"
    );
    await expect(page.getByTestId("fixture-queue-edge-start")).toHaveScreenshot(
      "queue-edge-start-light.png"
    );
    await expect(page.getByTestId("fixture-queue-edge-end")).toHaveScreenshot(
      "queue-edge-end-light.png"
    );
    await expect(page.getByTestId("fixture-embassy-partial")).toHaveScreenshot(
      "embassy-partial-desktop-light.png"
    );
    await expect(page.getByTestId("fixture-embassy-empty")).toHaveScreenshot(
      "embassy-empty-desktop-light.png"
    );
    await expect(page.getByTestId("segmented-queue-timeline-islamabad").first()).toHaveScreenshot(
      "segmented-queue-timeline-light.png"
    );
    await expect(page.getByTestId("fixture-skeletons")).toHaveScreenshot(
      "skeletons-desktop-light.png"
    );
  });

  test("QueueOverview dark desktop & responsive tablet/mobile light + dark", async ({ page }) => {
    await page.goto("/visual-fixtures?theme=dark");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("fixture-queue-overview")).toHaveScreenshot(
      "queue-overview-desktop-dark.png"
    );

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/visual-fixtures");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("fixture-queue-overview")).toHaveScreenshot(
      "queue-overview-tablet-light.png"
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/visual-fixtures");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("fixture-queue-overview")).toHaveScreenshot(
      "queue-overview-mobile-light.png"
    );

    await page.goto("/visual-fixtures?theme=dark");
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("fixture-queue-overview")).toHaveScreenshot(
      "queue-overview-mobile-dark.png"
    );
  });
});
