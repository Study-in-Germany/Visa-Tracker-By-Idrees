import test from "node:test";
import assert from "node:assert/strict";
import { isFutureScheduledDate, validateSubmissionJourneyDates } from "../lib/journey-validation";

const TODAY = "2026-11-27";

test("validateSubmissionJourneyDates accepts valid partial and full journeys including future booked appointments", () => {
  assert.deepEqual(validateSubmissionJourneyDates({}, TODAY), {});

  const futureBooking = validateSubmissionJourneyDates(
    {
      waitingListDate: "2026-03-01",
      submissionInviteDate: "2026-08-10",
      documentSubmissionDate: "2026-08-14",
      appointmentDate: "2027-01-15",
      interviewDate: "2027-01-22",
    },
    TODAY
  );
  assert.deepEqual(futureBooking, {});
  assert.equal(isFutureScheduledDate("2027-01-15", TODAY), true);
  assert.equal(isFutureScheduledDate("2026-08-14", TODAY), false);
});

test("validateSubmissionJourneyDates rejects future past-only events and catches chronological errors inline", () => {
  const futurePastOnly = validateSubmissionJourneyDates(
    {
      waitingListDate: "2026-12-01",
      documentSubmissionDate: "2026-12-05",
      decisionDate: "2026-12-10",
    },
    TODAY
  );
  assert.ok(futurePastOnly.waitingListDate?.includes("future"));
  assert.ok(futurePastOnly.documentSubmissionDate?.includes("future"));
  assert.ok(futurePastOnly.decisionDate?.includes("future"));

  const outOfOrder = validateSubmissionJourneyDates(
    {
      waitingListDate: "2026-05-01",
      submissionInviteDate: "2026-06-15",
      documentSubmissionDate: "2026-06-10",
    },
    TODAY
  );
  assert.ok(outOfOrder.documentSubmissionDate?.includes("submission invitation"));
  assert.equal(outOfOrder.waitingListDate, undefined);
  assert.equal(outOfOrder.submissionInviteDate, undefined);

  const badCorrection = validateSubmissionJourneyDates(
    {
      documentSubmissionDate: "2026-06-10",
      correctionRequestDate: "2026-06-15",
      correctionSubmittedDate: "2026-06-12",
    },
    TODAY
  );
  assert.ok(badCorrection.correctionSubmittedDate?.includes("correction requested"));
});

test("validateSubmissionJourneyDates enforces 1-year upper bound on future appointments", () => {
  const tooFar = validateSubmissionJourneyDates({ appointmentDate: "2028-02-01" }, TODAY);
  assert.ok(tooFar.appointmentDate?.includes("1 year"));
});
