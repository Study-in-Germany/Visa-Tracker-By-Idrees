import { expect, test } from "@playwright/test";

const ARTIFACT_DIR =
  process.env.VERIFICATION_SCREENSHOT_DIR ||
  "C:/Users/umar/.gemini/antigravity/brain/c6a3e15a-51a5-416a-bf9b-bf717e7ca032";

const EXPECTED_SUPPORT_URL = "https://wa.me/923486587556?text=Hi%2C%20I%20have%20a%20query.";

test.describe("Static Sidebar Cleanup, WhatsApp Resources & Direct Support", () => {
  test("Sidebar removes accordions and vertical lines, shows Contact support above auth action, and preserves main collapse toggle", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/tracker");
    await page.waitForLoadState("networkidle");

    const sidebarCheck = await page.evaluate(() => {
      const aside = document.querySelector("aside[class*='lg:flex']");
      if (!aside) return { ok: false, reason: "missing desktop sidebar" };
      const navButtons = aside.querySelectorAll("nav button");
      if (navButtons.length > 0) {
        return { ok: false, reason: `found ${navButtons.length} accordion buttons in nav` };
      }
      const verticalBorders = aside.querySelectorAll("nav ul.border-l");
      if (verticalBorders.length > 0) {
        return { ok: false, reason: "found vertical border-l lines on nav lists" };
      }
      const hiddenLists = aside.querySelectorAll("nav ul[hidden]");
      if (hiddenLists.length > 0) {
        return { ok: false, reason: "found hidden accordion nav lists" };
      }
      return { ok: true };
    });
    expect(sidebarCheck).toEqual({ ok: true });

    const aside = page.locator("aside[class*='lg:flex']");
    await expect(aside.getByText("Visa tracking")).toBeVisible();
    await expect(aside.getByText("Community")).toBeVisible();

    const supportLink = aside.getByRole("link", { name: /Contact support/i });
    await expect(supportLink).toBeVisible();
    await expect(supportLink).toHaveAttribute("href", EXPECTED_SUPPORT_URL);

    // Contact support appears before Applicant login / Log out in the footer
    const footerOrder = await aside.evaluate((el) => {
      const links = Array.from(el.querySelectorAll("div.border-t a, div.border-t button"));
      const supportIdx = links.findIndex((n) => /contact support/i.test(n.textContent || n.getAttribute("aria-label") || ""));
      const authIdx = links.findIndex((n) => /log out|applicant login/i.test(n.textContent || n.getAttribute("aria-label") || ""));
      return { supportIdx, authIdx };
    });
    expect(footerOrder.supportIdx).toBeGreaterThanOrEqual(0);
    expect(footerOrder.authIdx).toBeGreaterThan(footerOrder.supportIdx);

    // Floating WhatsApp button is visible and does NOT overlap pagination on /tracker
    const fab = page.getByTestId("floating-whatsapp-button");
    await expect(fab).toBeVisible();
    await expect(fab).toHaveAttribute("href", EXPECTED_SUPPORT_URL);

    const pag = page.getByTestId("tracker-table-workspace").getByRole("navigation", { name: "Pagination" });
    await expect(pag).toBeVisible({ timeout: 25_000 });
    const fabBox = await fab.boundingBox();
    const pagBox = await pag.boundingBox();
    expect(fabBox).not.toBeNull();
    expect(pagBox).not.toBeNull();
    expect(fabBox!.y + fabBox!.height).toBeLessThanOrEqual(pagBox!.y + 1);

    // Screenshot: clean sidebar + floating WhatsApp button on /tracker (light)
    await page.screenshot({ path: `${ARTIFACT_DIR}/sidebar-clean-desktop-light.png` });

    // Opening filter drawer automatically hides FloatingWhatsAppButton, closing restores it
    await page.getByRole("banner").getByRole("button", { name: /^Filters/ }).click();
    await expect(page.locator("#tracker-filter-drawer")).toBeVisible();
    await expect(fab).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(fab).toBeVisible();

    // Main sidebar collapse toggle hides Contact support text and centers WhatsApp icon
    await page.getByRole("button", { name: /collapse sidebar/i }).click();
    const collapsedSupport = aside.getByRole("link", { name: /Contact support on WhatsApp/i });
    await expect(collapsedSupport).toBeVisible();
    await expect(collapsedSupport).toHaveAttribute("title", "Contact support on WhatsApp");
    await page.getByRole("button", { name: /expand sidebar/i }).click();

    // Switch to dark mode and capture clean dark screenshot
    await page.getByRole("button", { name: /Switch to dark mode/i }).click();
    await page.screenshot({ path: `${ARTIFACT_DIR}/sidebar-clean-desktop-dark.png` });
    await page.getByRole("button", { name: /Switch to light mode/i }).click();
  });

  test("Resources page organizes all 5 WhatsApp links into Channels & Communities and preserves calculator", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/resources");
    await page.waitForLoadState("networkidle");

    const channels = page.getByRole("region", { name: "WhatsApp channels" });
    await expect(channels).toBeVisible();
    await expect(channels.getByRole("link", { name: /Study In Germany — Updates/i })).toHaveAttribute(
      "href",
      "https://whatsapp.com/channel/0029VbD6YAn4yltJDqNw773k"
    );
    await expect(channels.getByRole("link", { name: /Learn German/i })).toHaveAttribute(
      "href",
      "https://whatsapp.com/channel/0029Vb9BeHeFsn0ielFdth2M"
    );

    const communities = page.getByRole("region", { name: "WhatsApp communities" });
    await expect(communities).toBeVisible();
    await expect(communities.getByRole("link", { name: /Study In Germany Community 1/i })).toHaveAttribute(
      "href",
      "https://chat.whatsapp.com/BZ6f2Yodozr3oNWTtqsR40"
    );
    await expect(communities.getByRole("link", { name: /Study In Germany Community 2/i })).toHaveAttribute(
      "href",
      "https://chat.whatsapp.com/CqZMXiA1EpaBS0NLw2vFJO"
    );
    await expect(communities.getByRole("link", { name: /Deutsch Mit Idrees Community/i })).toHaveAttribute(
      "href",
      "https://chat.whatsapp.com/DcF8N7CNLlgJ5g2Dmsq5qH"
    );

    await expect(page.getByRole("link", { name: /German grade calculator/i })).toBeVisible();
    await expect(page.getByTestId("floating-whatsapp-button")).toBeVisible();

    await page.screenshot({ path: `${ARTIFACT_DIR}/resources-whatsapp-desktop-light.png` });

    await page.getByRole("button", { name: /Switch to dark mode/i }).click();
    await page.screenshot({ path: `${ARTIFACT_DIR}/resources-whatsapp-desktop-dark.png` });
    await page.getByRole("button", { name: /Switch to light mode/i }).click();
  });

  test("Mobile floating WhatsApp button sits cleanly above BottomNav and hides when sheet opens", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tracker");
    await page.waitForLoadState("networkidle");

    const fab = page.getByTestId("floating-whatsapp-button");
    await expect(fab).toBeVisible();

    const bottomNav = page.getByRole("navigation", { name: /Mobile navigation|Primary/i }).last();
    const fabBox = await fab.boundingBox();
    const navBox = await bottomNav.boundingBox();
    expect(fabBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(fabBox!.y + fabBox!.height).toBeLessThanOrEqual(navBox!.y + 1);

    await page.screenshot({ path: `${ARTIFACT_DIR}/floating-whatsapp-mobile-light.png` });

    await page.getByRole("banner").getByRole("button", { name: /Open filters/i }).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    await expect(fab).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(fab).toBeVisible();
  });
});
