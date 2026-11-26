import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildApplicantJourney } from "../lib/journey";
import { isEligiblePublicRecord } from "../lib/analytics-filter";
import { TEAM_PUBLIC_ID } from "../lib/listings";

describe("Applicant dashboard journey & analytics eligibility", () => {
  it("builds a 6-step journey without correction stages for standard applicants", () => {
    const j = buildApplicantJourney({
      visaStatus: "APPOINTMENT_SCHEDULED",
      waitingListDate: "2026-03-02",
      submissionInviteDate: "2026-05-12",
      documentSubmissionDate: "2026-05-26",
      appointmentDate: "2026-06-30",
    });

    assert.equal(j.totalCount, 6);
    assert.equal(j.completedCount, 4);
    assert.equal(j.hasCorrection, false);
    assert.equal(j.canAddCorrection, true);
    assert.equal(j.nextStep?.key, "interviewDate");
    assert.equal(j.nextStep?.label, "Processing / Interview");
  });

  it("inserts correction stages only when correction dates or status exist", () => {
    const j = buildApplicantJourney({
      visaStatus: "UNDER_CORRECTION",
      waitingListDate: "2026-03-02",
      submissionInviteDate: "2026-05-12",
      documentSubmissionDate: "2026-05-26",
      correctionRequestDate: "2026-06-01",
    });

    assert.equal(j.totalCount, 8);
    assert.equal(j.completedCount, 4);
    assert.equal(j.hasCorrection, true);
    assert.equal(j.nextStep?.key, "correctionSubmittedDate");
    assert.equal(j.nextStep?.label, "Correction submitted");
  });

  it("marks terminal applications 100% complete with no pending next step", () => {
    const j = buildApplicantJourney({
      visaStatus: "VISA_ISSUED",
      waitingListDate: "2026-01-10",
      submissionInviteDate: "2026-04-01",
      documentSubmissionDate: "2026-04-05",
      appointmentDate: "2026-05-01",
      decisionDate: "2026-05-10",
    });

    assert.equal(j.totalCount, 6);
    assert.equal(j.completedCount, 6);
    assert.equal(j.percent, 100);
    assert.equal(j.isTerminal, true);
    assert.equal(j.canAddCorrection, false);
    assert.equal(j.nextStep, null);
  });

  it("excludes demo, test, team, and unapproved records from public analytics", () => {
    assert.equal(isEligiblePublicRecord({ publicId: "DEMO-0001", email: "demo@example.com", approval: "APPROVED" }), false);
    assert.equal(isEligiblePublicRecord({ publicId: "TEST-1234", email: "u@gmail.com", approval: "APPROVED" }), false);
    assert.equal(isEligiblePublicRecord({ publicId: TEAM_PUBLIC_ID, email: "team@vt.pk", approval: "APPROVED" }), false);
    assert.equal(isEligiblePublicRecord({ publicId: "PK-ISB-10100", email: "s@example.com", approval: "APPROVED" }), false);
    assert.equal(isEligiblePublicRecord({ publicId: "PK-ISB-10100", email: "s@gmail.com", approval: "PENDING_REVIEW" }), false);
    assert.equal(isEligiblePublicRecord({ publicId: "PK-ISB-10100", email: "s@gmail.com", approval: "APPROVED" }), true);
  });
});
