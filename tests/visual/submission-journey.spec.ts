import { expect, test } from "@playwright/test";

const ARTIFACT_DIR =
  process.env.VERIFICATION_SCREENSHOT_DIR ||
  "C:/Users/umar/.gemini/antigravity/brain/c6a3e15a-51a5-416a-bf9b-bf717e7ca032";

test.describe("Submission Editable Visual Journey & Review", () => {
  test("Visual fixtures cover all Step 3 and Step 4 journey states in light & dark, desktop & mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/visual-fixtures/workspace");
    await page.waitForLoadState("networkidle");

    // Step 3 states
    await expect(page.getByTestId("fixture-submit-step3-empty")).toBeVisible();
    await expect(page.getByTestId("fixture-submit-step3-one-date")).toBeVisible();
    const multi = page.getByTestId("fixture-submit-step3-multi-scheduled");
    await expect(multi).toBeVisible();
    await expect(multi).toContainText("Scheduled");
    await multi.screenshot({ path: `${ARTIFACT_DIR}/submit-step3-desktop-light.png` });

    // Optional correction & inline invalid date ordering
    await expect(page.getByTestId("fixture-submit-step3-correction")).toContainText("22 Jun 2026");
    const invalid = page.getByTestId("fixture-submit-step3-invalid");
    await expect(invalid).toContainText(/cannot be earlier than submission invitation/i);

    // Step 4 Review (no forecast jargon)
    const review = page.getByTestId("fixture-submit-step4-review");
    await expect(review).toBeVisible();
    await expect(review).toContainText("Your visa journey");
    await expect(review).toContainText("Scheduled");
    await expect(review).toContainText("Not recorded");
    const reviewText = await review.innerText();
    expect(reviewText).not.toContain("Monte Carlo");
    expect(reviewText).not.toContain("P50");
    await review.screenshot({ path: `${ARTIFACT_DIR}/submit-step4-review-desktop-light.png` });

    // Dark theme desktop screenshots
    await page.goto("/visual-fixtures/workspace?theme=dark");
    await page.waitForLoadState("networkidle");
    await page
      .getByTestId("fixture-submit-step3-multi-scheduled")
      .screenshot({ path: `${ARTIFACT_DIR}/submit-step3-desktop-dark.png` });
    await page
      .getByTestId("fixture-submit-step4-review")
      .screenshot({ path: `${ARTIFACT_DIR}/submit-step4-review-desktop-dark.png` });

    // Mobile vertical journey screenshots & zero horizontal overflow
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/visual-fixtures/workspace");
    await page.waitForLoadState("networkidle");
    const mobileMulti = page.getByTestId("fixture-submit-step3-multi-scheduled");
    await expect(mobileMulti.getByTestId("visa-journey-mobile")).toBeVisible();
    await expect(mobileMulti.getByTestId("visa-journey-desktop")).toBeHidden();
    await mobileMulti.screenshot({ path: `${ARTIFACT_DIR}/submit-step3-mobile-light.png` });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);

    await page.goto("/visual-fixtures/workspace?theme=dark");
    await page.waitForLoadState("networkidle");
    const mobileReview = page.getByTestId("fixture-submit-step4-review");
    await expect(mobileReview.getByTestId("visa-journey-mobile")).toBeVisible();
    await mobileReview.screenshot({ path: `${ARTIFACT_DIR}/submit-step4-review-mobile-dark.png` });
  });

  test("Full 4-step /submit flow supports adding/editing/clearing dates, inline validation, Review Edit, Cancel modal, and submission", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // Intercept POST /api/applicants so zero test records are written to the live database
    await page.route("**/api/applicants", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        expect(body.name).toBe("Amina Tariq");
        expect(body.consulate).toBe("Islamabad");
        expect(body.waitingListDate).toBeTruthy();
        expect(body.correctionRequestDate).toBeTruthy();
        expect(body.decisionDate).toBe("");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            publicId: "VT-TEST-9001",
            accessCode: "ABCD-EFGH",
            emailConfirmationSent: false,
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/submit");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => sessionStorage.removeItem("vt.submit.lastResult"));
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.getByLabel(/Full name/i).waitFor({ state: "visible", timeout: 15_000 });

    // Step 1: About you
    await page.getByLabel(/Full name/i).fill("Amina Tariq");
    await page.getByLabel(/^Email/i).fill("amina@example.com");
    await page.getByLabel(/^City/i).fill("Lahore");
    await page.getByRole("button", { name: /Continue/i }).click();

    // Step 2: Program
    await page.getByLabel(/University/i).fill("TU Munich");
    await page.getByLabel(/Degree \/ program/i).fill("MSc Informatics");
    await page.getByRole("button", { name: /Continue/i }).click();

    // Step 3: Visual Editable Visa Journey
    await expect(page.getByRole("heading", { name: "Your visa journey" })).toBeVisible();
    await expect(page.getByTestId("visa-journey-timeline-editable")).toBeVisible();

    // Add waiting-list registration date via Today button in popover
    await page.getByRole("button", { name: "Add Waiting-list registration date" }).click();
    await page.getByRole("dialog", { name: "Waiting-list registration" }).getByRole("button", { name: "Today" }).click();

    // Add and then clear Visa decision date
    await page.getByRole("button", { name: "Add Visa decision date" }).click();
    await page.getByRole("dialog", { name: "Visa decision" }).getByRole("button", { name: "Today" }).click();
    await page.getByRole("button", { name: "Clear Visa decision" }).click();
    await expect(page.getByRole("button", { name: "Add Visa decision date" })).toBeVisible();

    // Expand optional Document correction milestone and set date
    await page.getByRole("button", { name: /Add correction/i }).click();
    await page.getByRole("button", { name: "Add Correction requested date" }).click();
    await page.getByRole("dialog", { name: "Correction requested" }).getByRole("button", { name: "Today" }).click();

    // Continue to Step 4 Review
    await page.getByRole("button", { name: /Continue/i }).click();
    const review = page.getByTestId("visa-journey-review");
    await expect(review).toBeVisible();
    await expect(review).toContainText("Document correction");
    await expect(review).toContainText("Not recorded");

    // Clicking Edit on Review returns to Step 3 with dates preserved
    await review.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByTestId("visa-journey-timeline-editable")).toBeVisible();
    await expect(page.getByTestId("editable-correction-milestone")).toBeVisible();

    // Return to Step 4 and verify Cancel modal works without losing state on "Continue editing"
    await page.getByRole("button", { name: /Continue/i }).click();
    await page.getByRole("button", { name: /Cancel/i }).click();
    await expect(page.getByRole("dialog")).toContainText("Discard your submission?");
    await page.getByRole("button", { name: "Continue editing" }).click();

    // Final submit
    await page.getByRole("button", { name: "Submit entry" }).click();
    await expect(page.getByText("Your entry is saved")).toBeVisible();
    await expect(page.getByText("VT-TEST-9001")).toBeVisible();
    await expect(page.getByText("ABCD-EFGH")).toBeVisible();
  });
});
