import { expect, test } from "@playwright/test";

const ARTIFACT_DIR =
  process.env.VERIFICATION_SCREENSHOT_DIR ||
  "C:/Users/umar/.gemini/antigravity/brain/c6a3e15a-51a5-416a-bf9b-bf717e7ca032";

test.describe("Tracker Full-Height Modal Drawer, Header Trigger, Valley Table & Collapsed Sidebar", () => {
  test("Live /tracker places Filters in page header, removes middle chip bar, opens full-height blurred drawer without resizing table, and centers collapsed sidebar icons", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/tracker");
    await page.waitForLoadState("networkidle");

    // Filters button lives inside the top header (banner) beside Search
    const banner = page.getByRole("banner");
    const filtersBtn = banner.getByRole("button", { name: /^Filters/ });
    await expect(filtersBtn).toBeVisible();
    await expect(banner.getByRole("searchbox")).toBeVisible();

    // No horizontal status chip group below KPI cards on the main page
    await expect(page.getByRole("main").getByRole("group", { name: /Filter by/i })).toHaveCount(0);

    // 4 KPI cards remain present
    const summary = page.getByRole("region", { name: "Summary" });
    await expect(summary).toBeVisible();
    await expect(summary.getByText("Applicants")).toBeVisible({ timeout: 25_000 });
    await expect(summary.getByText("In queue")).toBeVisible();
    await expect(summary.getByText("Visas issued")).toBeVisible();
    await expect(summary.getByText("Rejected")).toBeVisible();

    // Edge-to-edge table workspace + pinned bottom pagination + opaque sticky header
    const tableWorkspace = page.getByTestId("tracker-table-workspace");
    await expect(tableWorkspace).toBeVisible({ timeout: 25_000 });
    const pagination = tableWorkspace.getByRole("navigation", { name: "Pagination" });
    await expect(pagination).toBeVisible();
    await expect(pagination).toContainText(/Showing \d+/);

    const theadBg = await tableWorkspace.locator("thead").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(theadBg).not.toBe("rgba(0, 0, 0, 0)");

    // Screenshot: Desktop tracker closed (light)
    await page.screenshot({ path: `${ARTIFACT_DIR}/tracker-desktop-light.png` });

    // Record exact table width before opening full-height drawer
    const tableWidthClosed = await tableWorkspace.evaluate((el) => el.getBoundingClientRect().width);
    const pagBoxClosed = await pagination.boundingBox();

    // Open full-height modal overlay drawer
    await filtersBtn.click();
    const drawer = page.locator("#tracker-filter-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("aria-modal", "true");

    // Verify full viewport height (100dvh) and 360-400px width
    const drawerBox = await drawer.boundingBox();
    expect(drawerBox).not.toBeNull();
    expect(drawerBox!.height).toBeGreaterThanOrEqual(898);
    expect(drawerBox!.width).toBeGreaterThanOrEqual(360);
    expect(drawerBox!.width).toBeLessThanOrEqual(400);

    // Verify backdrop blurs & dims the entire underlying page
    const backdrop = page.getByTestId("tracker-filter-backdrop");
    await expect(backdrop).toBeVisible();
    const backdropFilter = await backdrop.evaluate((el) => {
      const cs = getComputedStyle(el);
      return cs.backdropFilter || (cs as unknown as { webkitBackdropFilter?: string }).webkitBackdropFilter || "";
    });
    expect(backdropFilter).toContain("blur");

    // Verify body scroll is locked
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe("hidden");

    // Verify table width & pagination did NOT shift or compress when drawer opened
    const tableWidthOpen = await tableWorkspace.evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.abs(tableWidthOpen - tableWidthClosed)).toBeLessThanOrEqual(0.5);
    const pagBoxOpen = await pagination.boundingBox();
    expect(Math.abs(pagBoxOpen!.y - pagBoxClosed!.y)).toBeLessThanOrEqual(0.5);

    // Verify rectangular status chips (4-6px corner radius) live inside the drawer
    const statusGroup = drawer.getByRole("group", { name: "Filter by application status" });
    await expect(statusGroup).toBeVisible();
    const allChip = statusGroup.getByRole("button", { name: /^All/ });
    await expect(allChip).toBeVisible();
    const chipRadius = await allChip.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
    expect(chipRadius).toBeGreaterThanOrEqual(4);
    expect(chipRadius).toBeLessThanOrEqual(6);

    // Screenshot: Desktop tracker with full-height blurred drawer open (light)
    await page.screenshot({ path: `${ARTIFACT_DIR}/tracker-desktop-filters-open-light.png` });

    // Draft selections must NOT apply when dismissed with Escape, and focus returns to Filters button
    await statusGroup.getByRole("button", { name: /^Waiting/ }).click();
    await drawer.getByRole("combobox", { name: "Embassy" }).click();
    await page.getByRole("option", { name: "Karachi" }).click();
    await expect(page).not.toHaveURL(/consulate=Karachi/);
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(filtersBtn).toBeFocused();
    await expect(page).not.toHaveURL(/consulate=Karachi/);

    // Reopen, pick Status + Embassy, click Apply filters -> updates URL + header badge
    await filtersBtn.click();
    const reopened = page.locator("#tracker-filter-drawer");
    await reopened.getByRole("group", { name: "Filter by application status" }).getByRole("button", { name: /^Issued/ }).click();
    await reopened.getByRole("combobox", { name: "Embassy" }).click();
    await page.getByRole("option", { name: "Karachi" }).click();
    await reopened.getByRole("button", { name: "Apply filters" }).click();
    await expect(reopened).toHaveCount(0);
    await expect(page).toHaveURL(/visaStatus=VISA_ISSUED/);
    await expect(page).toHaveURL(/consulate=Karachi/);
    await expect(filtersBtn).toContainText("Filters");
    await expect(filtersBtn).toContainText("2");

    // Reset filters resets draft, and Apply filters removes active query params
    await filtersBtn.click();
    await page.locator("#tracker-filter-drawer").getByRole("button", { name: "Reset filters" }).click();
    await page.locator("#tracker-filter-drawer").getByRole("button", { name: "Apply filters" }).click();
    await expect(page).not.toHaveURL(/visaStatus=/);
    await expect(page).not.toHaveURL(/consulate=/);

    // Collapsed sidebar checks: zero group chevrons, icons centered, zero horizontal overflow
    const collapseBtn = page.getByRole("button", { name: /collapse sidebar/i });
    await collapseBtn.click();
    const collapsedState = await page.evaluate(() => {
      const aside = document.querySelector("aside[class*='lg:flex']");
      if (!aside) return { ok: false, reason: "no desktop aside" };
      const chevrons = aside.querySelectorAll("nav button[aria-controls]");
      if (chevrons.length > 0) return { ok: false, reason: "found group accordion buttons in collapsed sidebar" };
      const links = Array.from(aside.querySelectorAll("nav a"));
      const asideRect = aside.getBoundingClientRect();
      const asideCenter = asideRect.left + asideRect.width / 2;
      for (const a of links.slice(0, 6)) {
        const r = a.getBoundingClientRect();
        const linkCenter = r.left + r.width / 2;
        if (Math.abs(linkCenter - asideCenter) > 3) {
          return { ok: false, reason: `icon center ${linkCenter} vs rail center ${asideCenter}` };
        }
      }
      return {
        ok: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        reason: "overflow check",
      };
    });
    expect(collapsedState).toEqual({ ok: true, reason: "overflow check" });
    // Expand back so state isn't left collapsed
    await page.getByRole("button", { name: /expand sidebar/i }).click();
  });

  test("Short laptop (1280x720) keeps bottom pagination visible and drawer overlays cleanly", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/tracker");
    await page.waitForLoadState("networkidle");

    const pagination = page.getByTestId("tracker-table-workspace").getByRole("navigation", { name: "Pagination" });
    await expect(pagination).toBeVisible({ timeout: 25_000 });
    const pagBox = await pagination.boundingBox();
    expect(pagBox).not.toBeNull();
    expect(pagBox!.y + pagBox!.height).toBeLessThanOrEqual(720);

    const filtersBtn = page.getByRole("banner").getByRole("button", { name: /^Filters/ });
    await filtersBtn.click();
    await expect(page.locator("#tracker-filter-drawer")).toBeVisible();
    await page.getByTestId("tracker-filter-backdrop").click({ position: { x: 40, y: 100 } });
    await expect(page.locator("#tracker-filter-drawer")).toHaveCount(0);
  });

  test("Visual fixtures verify sparse/empty bottom pagination, dark full-height drawer, and mobile bottom sheet", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/visual-fixtures/workspace");
    await page.waitForLoadState("networkidle");

    // Sparse (2 rows) and empty (0 rows) keep pagination pinned at bottom
    for (const id of ["fixture-tracker-sparse", "fixture-tracker-empty"]) {
      const box = await page.getByTestId(id).boundingBox();
      const navBox = await page
        .getByTestId(id)
        .getByRole("navigation", { name: "Pagination" })
        .boundingBox();
      expect(box).not.toBeNull();
      expect(navBox).not.toBeNull();
      const bottomGap = box!.y + box!.height - (navBox!.y + navBox!.height);
      expect(bottomGap).toBeLessThan(4);
    }

    // Scroll resets to 0 when switching page
    const interactive = page.getByTestId("fixture-tracker-interactive");
    const scroller = interactive.getByTestId("tracker-table-scroll");
    await scroller.evaluate((el) => {
      el.scrollTop = 120;
    });
    await interactive.getByRole("button", { name: "2", exact: true }).click();
    const scrollAfter = await scroller.evaluate((el) => el.scrollTop);
    expect(scrollAfter).toBe(0);

    // Dark desktop screenshots (drawer closed & full-height drawer open with blurred backdrop)
    await page.goto("/visual-fixtures/workspace?theme=dark");
    await page.waitForLoadState("networkidle");
    await page.getByTestId("fixture-tracker-interactive").screenshot({
      path: `${ARTIFACT_DIR}/tracker-desktop-dark.png`,
    });

    await page
      .getByTestId("fixture-tracker-interactive")
      .getByRole("button", { name: /Filters/i })
      .first()
      .click();
    await expect(page.locator("#tracker-filter-drawer")).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_DIR}/tracker-desktop-filters-open-dark.png` });

    // Mobile light & dark screenshots (closed + modal bottom sheet open)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/visual-fixtures/workspace");
    await page.waitForLoadState("networkidle");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    ).toBe(false);

    await page
      .getByTestId("fixture-tracker-interactive")
      .screenshot({ path: `${ARTIFACT_DIR}/tracker-mobile-light.png` });

    await page
      .getByTestId("fixture-tracker-interactive")
      .getByRole("button", { name: /Filters/i })
      .first()
      .click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("group", { name: "Filter by application status" })).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_DIR}/tracker-mobile-sheet-light.png` });
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);

    await page.goto("/visual-fixtures/workspace?theme=dark");
    await page.waitForLoadState("networkidle");
    await page
      .getByTestId("fixture-tracker-interactive")
      .getByRole("button", { name: /Filters/i })
      .first()
      .click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_DIR}/tracker-mobile-sheet-dark.png` });
  });
});
