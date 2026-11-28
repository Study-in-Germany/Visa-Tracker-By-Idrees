import test from "node:test";
import assert from "node:assert/strict";
import { deriveInitialVisaStatus, generateAccessCode } from "../lib/ids";
import { submitApplicantSchema } from "../lib/validations";

test("generateAccessCode produces XXXX-XXXX-XXXX codes from the unambiguous alphabet", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const code = generateAccessCode();
    assert.match(code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    seen.add(code);
  }
  assert.ok(seen.size >= 38, "expected CSPRNG access codes to have high uniqueness");
});

test("deriveInitialVisaStatus derives the expected VisaStatus across milestone combinations", () => {
  assert.equal(deriveInitialVisaStatus({}), "WAITING_LIST");
  assert.equal(deriveInitialVisaStatus({ waitingListDate: "2026-01-10" }), "WAITING_LIST");
  assert.equal(deriveInitialVisaStatus({ submissionInviteDate: "2026-02-01" }), "WAITING_FOR_SUBMISSION");
  assert.equal(deriveInitialVisaStatus({ documentSubmissionDate: "2026-02-10" }), "SUBMISSION_RECEIVED");
  assert.equal(
    deriveInitialVisaStatus({ documentSubmissionDate: "2026-02-10", correctionRequestDate: "2026-02-15" }),
    "UNDER_CORRECTION"
  );
  assert.equal(
    deriveInitialVisaStatus({
      documentSubmissionDate: "2026-02-10",
      correctionRequestDate: "2026-02-15",
      correctionSubmittedDate: "2026-02-18",
    }),
    "SUBMISSION_RECEIVED"
  );
  assert.equal(deriveInitialVisaStatus({ appointmentDate: "2026-03-01" }), "APPOINTMENT_SCHEDULED");
  assert.equal(deriveInitialVisaStatus({ interviewDate: "2026-03-10" }), "PROCESSING");
  assert.equal(deriveInitialVisaStatus({ decisionDate: "2026-03-20" }), "PROCESSING");
});

test("submitApplicantSchema validates required fields, emails, dates, and optional fields", () => {
  const minimal = submitApplicantSchema.safeParse({
    name: "  Amina Tariq  ",
    consulate: "Islamabad",
    email: "",
  });
  assert.equal(minimal.success, true);
  if (minimal.success) {
    assert.equal(minimal.data.name, "Amina Tariq");
  }

  const withDates = submitApplicantSchema.safeParse({
    name: "Bilal Ahmed",
    consulate: "Karachi",
    email: "bilal@example.com",
    waitingListDate: "2026-01-05",
    correctionRequestDate: "2026-02-01",
    correctionSubmittedDate: "2026-02-04",
    isAnonymous: true,
  });
  assert.equal(withDates.success, true);
  if (withDates.success) {
    assert.equal(withDates.data.correctionSubmittedDate, "2026-02-04");
    assert.equal(withDates.data.isAnonymous, true);
  }

  // Reject missing name
  const missingName = submitApplicantSchema.safeParse({ name: "   ", consulate: "Islamabad" });
  assert.equal(missingName.success, false);

  // Reject invalid email
  const badEmail = submitApplicantSchema.safeParse({ name: "Test", consulate: "Islamabad", email: "not-an-email" });
  assert.equal(badEmail.success, false);

  // Reject pre-2018 date
  const tooOld = submitApplicantSchema.safeParse({
    name: "Test",
    consulate: "Islamabad",
    waitingListDate: "2015-05-01",
  });
  assert.equal(tooOld.success, false);

  // Reject far-future date (> 1 year ahead)
  const farFuture = new Date();
  farFuture.setUTCFullYear(farFuture.getUTCFullYear() + 3);
  const tooFuture = submitApplicantSchema.safeParse({
    name: "Test",
    consulate: "Islamabad",
    appointmentDate: farFuture.toISOString().slice(0, 10),
  });
  assert.equal(tooFuture.success, false);
});
