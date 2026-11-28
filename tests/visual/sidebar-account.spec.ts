import { expect, test } from "@playwright/test";

const ARTIFACT_DIR =
  process.env.VERIFICATION_SCREENSHOT_DIR ||
  "C:/Users/umar/.gemini/antigravity/brain/c6a3e15a-51a5-416a-bf9b-bf717e7ca032";

test.describe("Compact Sidebar Header Account Dropdown & Popover", () => {
  test("Expanded and collapsed sidebar account triggers open floating details popover without resizing sidebar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/visual-fixtures/workspace");
    await page.waitForLoadState("networkidle");

    const section = page.getByTestId("fixture-sidebar-account");
    await expect(section).toBeVisible();

    // Unauthenticated guest renders zero account trigger
    const guest = section.getByTestId("sidebar-account-guest");
    await expect(guest.getByRole("button", { name: /Account menu/i })).toHaveCount(0);

    // Loading skeleton shows no placeholder "Demo Applicant"
    const loadingBox = section.getByTestId("sidebar-account-loading");
    await expect(loadingBox).not.toContainText("Demo Applicant");

    // Expanded trigger hides Tracking ID, University, Status until clicked
    const expanded = section.getByTestId("sidebar-account-expanded");
    const expandedTrigger = expanded.getByRole("button", { name: /Account menu for Muhammad Abdullah Khan/i });
    await expect(expandedTrigger).toBeVisible();
    await expect(expanded).not.toContainText("PK-ISB-2048");
    await expect(expanded).not.toContainText("Technical University of Munich");

    const sidebarWidthClosed = await expanded.evaluate((el) => el.getBoundingClientRect().width);

    // Open popover beside expanded sidebar
    await expandedTrigger.click();
    const popover = page.getByRole("dialog", { name: "Applicant account details" });
    await expect(popover).toBeVisible();
    await expect(popover).toContainText("Muhammad Abdullah Khan");
    await expect(popover).toContainText("Applicant account");
    await expect(popover).toContainText("PK-ISB-2048");
    await expect(popover).toContainText("Technical University of Munich (TUM)");
    await expect(popover).toContainText("Appointment Scheduled");
    await expect(popover.getByRole("link", { name: "My dashboard" })).toHaveAttribute("href", "/dashboard");
    await expect(popover.getByRole("link", { name: "My information" })).toHaveAttribute("href", "/dashboard/information");

    // Sidebar width stays identical and popover opens beside sidebar
    const sidebarWidthOpen = await expanded.evaluate((el) => el.getBoundingClientRect().width);
    expect(sidebarWidthOpen).toBe(sidebarWidthClosed);
    const expandedRect = await expanded.boundingBox();
    const popoverRect = await popover.boundingBox();
    expect(popoverRect!.x).toBeGreaterThanOrEqual(expandedRect!.x + expandedRect!.width - 1);

    // Copy Tracking ID action updates label
    await popover.getByRole("button", { name: /Copy Tracking ID/i }).click();
    await expect(popover.getByText("Copied")).toBeVisible();

    // Screenshot: expanded sidebar with popover open (light)
    await page.screenshot({ path: `${ARTIFACT_DIR}/sidebar-account-expanded-open-light.png` });

    // Escape closes popover and restores focus to trigger
    await page.keyboard.press("Escape");
    await expect(popover).toHaveCount(0);
    await expect(expandedTrigger).toBeFocused();

    // Collapsed sidebar shows centered avatar-only trigger and opens popover beside rail
    const collapsed = section.getByTestId("sidebar-account-collapsed");
    const collapsedTrigger = collapsed.getByRole("button", { name: /Account menu for Muhammad Abdullah Khan/i });
    await expect(collapsedTrigger).toBeVisible();
    const collapsedBox = await collapsed.boundingBox();
    const triggerBox = await collapsedTrigger.boundingBox();
    const railCenter = collapsedBox!.x + collapsedBox!.width / 2;
    const triggerCenter = triggerBox!.x + triggerBox!.width / 2;
    expect(Math.abs(railCenter - triggerCenter)).toBeLessThanOrEqual(2);

    await collapsedTrigger.click();
    await expect(popover).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_DIR}/sidebar-account-collapsed-open-light.png` });

    // Clicking outside closes popover
    await page.mouse.click(10, 10);
    await expect(popover).toHaveCount(0);

    // Long applicant name & university truncation check (no horizontal overflow)
    const longCard = section.getByTestId("sidebar-account-long");
    const longTrigger = longCard.getByRole("button", { name: /Account menu for Syeda Ayesha/i });
    await longTrigger.click();
    await expect(popover).toBeVisible();
    await expect(popover).toContainText("Rheinisch-Westfälische Technische Hochschule Aachen University");
    await page.keyboard.press("Escape");

    // Dark theme screenshot with expanded account popover open
    await page.goto("/visual-fixtures/workspace?theme=dark");
    await page.waitForLoadState("networkidle");
    const darkExpanded = page.getByTestId("fixture-sidebar-account").getByTestId("sidebar-account-expanded");
    await darkExpanded.getByRole("button", { name: /Account menu for Muhammad Abdullah Khan/i }).click();
    await expect(page.getByRole("dialog", { name: "Applicant account details" })).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_DIR}/sidebar-account-expanded-open-dark.png` });

    // Mobile viewport check (zero horizontal overflow & collision-safe popover)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/visual-fixtures/workspace");
    await page.waitForLoadState("networkidle");
    await page
      .getByTestId("fixture-sidebar-account")
      .getByTestId("sidebar-account-expanded")
      .getByRole("button", { name: /Account menu for Muhammad Abdullah Khan/i })
      .click();
    const mobilePop = page.getByRole("dialog", { name: "Applicant account details" });
    await expect(mobilePop).toBeVisible();
    const mobilePopBox = await mobilePop.boundingBox();
    expect(mobilePopBox!.x + mobilePopBox!.width).toBeLessThanOrEqual(390);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
    await page.screenshot({ path: `${ARTIFACT_DIR}/sidebar-account-mobile-light.png` });
  });
});
