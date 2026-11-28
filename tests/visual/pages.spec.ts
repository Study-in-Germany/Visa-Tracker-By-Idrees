import { expect, test } from "@playwright/test";

const FORBIDDEN_DEFAULT_TERMS = [
  "P10",
  "P25",
  "P50",
  "P75",
  "P90",
  "Monte Carlo",
  "Kaplan",
  "v2.0.0",
  "Velocity sensitivity",
  "Selected scenario",
  "Actual recorded",
];

const MANDATORY_VIEWPORTS = [
  { width: 320, height: 680 },
  { width: 360, height: 740 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 480, height: 854 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

test.describe("Option B Segmented Queue & Transit Journey Layout, Alignment, and Responsiveness", () => {
  test("Public Overview renders monochrome QueueOverview, confidence popover, and Queue details drawer", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("queue-overview")).toHaveCount(1);
    await expect(page.getByTestId("visa-stage-timeline")).toHaveCount(1);
    await expect(page.getByTestId("embassy-queue-islamabad")).toBeVisible();
    await expect(page.getByTestId("embassy-queue-karachi")).toBeVisible();

    const mainText = await page.locator("main").innerText();
    for (const term of FORBIDDEN_DEFAULT_TERMS) {
      expect(mainText).not.toContain(term);
    }

    // Verify "Queue details" drawer opens, closes with Escape, and restores focus
    const detailsBtn = page.getByRole("button", { name: /Queue details/i });
    await detailsBtn.click();
    const dialog = page.getByRole("dialog", { name: /Queue methodology/i });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(detailsBtn).toBeFocused();
  });

  test("SegmentedQueueTimeline marker, connector, and date pill align exactly without edge clipping", async ({
    page,
  }) => {
    await page.goto("/visual-fixtures");
    await page.waitForLoadState("networkidle");

    const checkAlignment = async (containerTestId: string) => {
      return page.getByTestId(containerTestId).evaluate((el) => {
        const cardRect = el.getBoundingClientRect();
        const fill = el.querySelector("[data-segment-fill='active']");
        const circle = el.querySelector("[data-marker-circle='true']");
        const connector = el.querySelector("[data-marker-connector='true']");
        const pill = el.querySelector("[data-testid='queue-date-pill']");
        if (!fill || !circle || !connector || !pill) {
          return { ok: false, reason: "missing marker/fill/pill element" };
        }
        const fRect = fill.getBoundingClientRect();
        const cRect = circle.getBoundingClientRect();
        const kRect = connector.getBoundingClientRect();
        const pRect = pill.getBoundingClientRect();

        const circleCenterX = cRect.left + cRect.width / 2;
        const connCenterX = kRect.left + kRect.width / 2;
        const fillEdgeX = fRect.right;

        if (Math.abs(circleCenterX - fillEdgeX) > 2.5) {
          return { ok: false, reason: `circle(${circleCenterX}) vs fillEdge(${fillEdgeX})` };
        }
        if (Math.abs(circleCenterX - connCenterX) > 2) {
          return { ok: false, reason: `circle(${circleCenterX}) vs connector(${connCenterX})` };
        }
        if (pRect.left < cardRect.left - 1 || pRect.right > cardRect.right + 1) {
          return { ok: false, reason: `pill clipped: pill=[${pRect.left},${pRect.right}] card=[${cardRect.left},${cardRect.right}]` };
        }
        return { ok: true };
      });
    };

    for (const vp of [
      { width: 320, height: 680 },
      { width: 390, height: 844 },
      { width: 1280, height: 900 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(vp);
      expect(await checkAlignment("fixture-queue-overview"), `overview at ${vp.width}`).toEqual({ ok: true });
      expect(await checkAlignment("fixture-queue-edge-start"), `edge-start at ${vp.width}`).toEqual({ ok: true });
      expect(await checkAlignment("fixture-queue-edge-end"), `edge-end at ${vp.width}`).toEqual({ ok: true });
    }

    // Confidence indicator interactive disclosure on desktop & mobile
    await page.setViewportSize({ width: 1280, height: 900 });
    const confBtn = page
      .getByTestId("fixture-queue-overview")
      .getByRole("button", { name: /Limited evidence|Low confidence/i })
      .first();
    await confBtn.click();
    await expect(page.getByRole("region", { name: /confidence explanation/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("region", { name: /confidence explanation/i })).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await confBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("TransitVisaJourney hides statistical jargon by default, opens Forecast details, and aligns connectors", async ({
    page,
  }) => {
    await page.goto("/visual-fixtures");
    await page.waitForLoadState("networkidle");

    const journey = page.getByTestId("fixture-transit-journey-current");
    const defaultText = await journey.innerText();
    for (const term of FORBIDDEN_DEFAULT_TERMS) {
      expect(defaultText).not.toContain(term);
    }

    const desktopRoute = journey.getByTestId("transit-route-desktop");
    const mobileRoute = journey.getByTestId("transit-route-mobile");
    await expect(desktopRoute).toBeVisible();
    await expect(mobileRoute).toBeHidden();

    const desktopAlignment = await desktopRoute.evaluate((el) => {
      const items = Array.from(el.querySelectorAll(":scope > li"));
      if (items.length !== 6) return { ok: false, reason: `expected 6 items, got ${items.length}` };

      for (const li of items) {
        const node = li.querySelector("[data-station-node]");
        const connectors = Array.from(li.querySelectorAll("[data-connector='horizontal']"));
        if (!node) return { ok: false, reason: "missing station node" };
        const nodeRect = node.getBoundingClientRect();
        const nodeCenterY = nodeRect.top + nodeRect.height / 2;
        for (const conn of connectors) {
          const connRect = conn.getBoundingClientRect();
          const connCenterY = connRect.top + connRect.height / 2;
          if (Math.abs(nodeCenterY - connCenterY) > 2) {
            return { ok: false, reason: `Y mismatch: node=${nodeCenterY}, conn=${connCenterY}` };
          }
        }
      }
      return { ok: true };
    });
    expect(desktopAlignment).toEqual({ ok: true });

    const detailsBtn = journey.getByRole("button", { name: /Forecast details/i });
    await detailsBtn.click();
    const dialog = page.getByRole("dialog", { name: /Forecast details/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("P50");
    await expect(dialog).toContainText("Monte Carlo");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(detailsBtn).toBeFocused();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(desktopRoute).toBeHidden();
    await expect(mobileRoute).toBeVisible();
  });

  test("Zero horizontal overflow across all 10 mandatory viewports and desktop sidebar toggle", async ({ page }) => {
    test.setTimeout(120_000);
    for (const vp of MANDATORY_VIEWPORTS) {
      await page.setViewportSize(vp);
      for (const url of ["/", "/visual-fixtures", "/visual-fixtures?theme=dark"]) {
        await page.goto(url);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(overflow, `Horizontal overflow on ${url} at ${vp.width}x${vp.height}`).toBe(false);
      }
    }

    // Verify desktop sidebar collapsed vs expanded preserves zero overflow
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const collapseBtn = page.getByRole("button", { name: /collapse|expand/i }).first();
    if ((await collapseBtn.count()) > 0) {
      await collapseBtn.click();
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow).toBe(false);
    }
  });
});
