import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { deriveVisaStatus, isPlausibleDate, VISA_STATUS_STAGE } from "../lib/status";
import { stageProgress } from "../lib/journey";

describe("Single source of truth for applicant status", () => {
  it("defaults to WAITING_LIST when only waitingListDate is present", () => {
    const status = deriveVisaStatus({ waitingListDate: "2026-02-01" });
    assert.equal(status, "WAITING_LIST");
    assert.equal(stageProgress({ visaStatus: status }).done, 1);
  });

  it("derives WAITING_FOR_SUBMISSION from submissionInviteDate", () => {
    const status = deriveVisaStatus({
      waitingListDate: "2026-02-01",
      submissionInviteDate: "2026-08-01",
    });
    assert.equal(status, "WAITING_FOR_SUBMISSION");
    assert.equal(stageProgress({ visaStatus: status }).done, 2);
  });

  it("derives SUBMISSION_RECEIVED from documentSubmissionDate", () => {
    const status = deriveVisaStatus({
      waitingListDate: "2026-02-01",
      submissionInviteDate: "2026-08-01",
      documentSubmissionDate: "2026-08-05",
    });
    assert.equal(status, "SUBMISSION_RECEIVED");
    assert.equal(stageProgress({ visaStatus: status }).done, 2);
  });

  it("derives UNDER_CORRECTION when correction is requested without submission", () => {
    const status = deriveVisaStatus({
      waitingListDate: "2026-02-01",
      documentSubmissionDate: "2026-08-05",
      correctionRequestDate: "2026-08-12",
    });
    assert.equal(status, "UNDER_CORRECTION");
  });

  it("returns to SUBMISSION_RECEIVED when correctionSubmittedDate is recorded", () => {
    const status = deriveVisaStatus({
      waitingListDate: "2026-02-01",
      documentSubmissionDate: "2026-08-05",
      correctionRequestDate: "2026-08-12",
      correctionSubmittedDate: "2026-08-15",
    });
    assert.equal(status, "SUBMISSION_RECEIVED");
  });

  it("derives APPOINTMENT_SCHEDULED from appointmentDate", () => {
    const status = deriveVisaStatus({
      waitingListDate: "2026-02-01",
      submissionInviteDate: "2026-08-01",
      documentSubmissionDate: "2026-08-05",
      appointmentDate: "2026-09-10",
    });
    assert.equal(status, "APPOINTMENT_SCHEDULED");
    assert.equal(stageProgress({ visaStatus: status }).done, 3);
  });

  it("maps interviewDate or decisionDate without explicit terminal outcome to PROCESSING", () => {
    const status = deriveVisaStatus({
      waitingListDate: "2026-01-08",
      submissionInviteDate: "2026-08-14",
      documentSubmissionDate: "2026-08-16",
      appointmentDate: "2026-10-08",
      interviewDate: "2026-10-12",
      decisionDate: "2026-10-17",
    });
    assert.equal(status, "PROCESSING");
    assert.equal(stageProgress({ visaStatus: status }).done, 3);
  });

  it("preserves explicit terminal statuses (VISA_ISSUED, VISA_REJECTED, WITHDRAWN)", () => {
    for (const terminal of ["VISA_ISSUED", "VISA_REJECTED", "WITHDRAWN"] as const) {
      const status = deriveVisaStatus({ waitingListDate: "2026-01-08" }, terminal);
      assert.equal(status, terminal);
      assert.equal(stageProgress({ visaStatus: status }).done, 4);
      assert.equal(stageProgress({ visaStatus: status }).isTerminal, true);
    }
  });

  it("ignores non-chronological typo dates earlier than waitingListDate", () => {
    const status = deriveVisaStatus({
      waitingListDate: "2026-11-23",
      submissionInviteDate: "2026-11-04",
      documentSubmissionDate: "2026-11-03",
      appointmentDate: "2026-11-29",
      interviewDate: "2026-11-19",
      decisionDate: "2026-11-05",
    }, "WAITING_LIST");
    assert.equal(status, "APPOINTMENT_SCHEDULED");
  });

  it("keeps stageProgress aligned with every VisaStatus without contradictions", () => {
    for (const [status, stage] of Object.entries(VISA_STATUS_STAGE)) {
      const progress = stageProgress({ visaStatus: status });
      assert.equal(progress.done, stage.step);
      assert.equal(progress.label, stage.label);
    }
    assert.equal(isPlausibleDate("0002-01-01"), false);
    assert.equal(isPlausibleDate("2026-05-12"), true);
  });
});
