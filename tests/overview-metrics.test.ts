import test from "node:test";
import assert from "node:assert/strict";
import {
  computeJourneyStepDurations,
  computeQueueRightNow,
  formatApproxDuration,
  type OverviewApplicantRecord,
} from "../lib/overview-metrics";

const NOW = new Date("2026-11-27T12:00:00Z");

function row(overrides: Partial<OverviewApplicantRecord> = {}): OverviewApplicantRecord {
  return {
    consulate: "Islamabad",
    visaStatus: "WAITING_LIST",
    waitingListDate: null,
    submissionInviteDate: null,
    documentSubmissionDate: null,
    correctionRequestDate: null,
    correctionSubmittedDate: null,
    appointmentDate: null,
    decisionDate: null,
    ...overrides,
  };
}

test("computeQueueRightNow handles Islamabad data, outliers, and Karachi empty state independently", () => {
  const rows: OverviewApplicantRecord[] = [
    // Islamabad steady progression (~7 days of waitlist per 7 days elapsed)
    row({ waitingListDate: "2026-02-01", submissionInviteDate: "2026-10-20", documentSubmissionDate: "2026-10-22", appointmentDate: "2026-11-05" }),
    row({ waitingListDate: "2026-02-10", submissionInviteDate: "2026-10-29", documentSubmissionDate: "2026-10-30", appointmentDate: "2026-11-12" }),
    row({ waitingListDate: "2026-02-20", submissionInviteDate: "2026-11-08", documentSubmissionDate: "2026-11-10", appointmentDate: "2026-11-22" }),
    row({ waitingListDate: "2026-03-02", submissionInviteDate: "2026-11-18" }),
    row({ waitingListDate: "2026-03-08", submissionInviteDate: "2026-11-24" }),
    // Waiting applicants later in the year
    row({ waitingListDate: "2026-08-15" }),
    // Outlier / typo dates should be safely ignored
    row({ waitingListDate: "1995-01-01", submissionInviteDate: "2026-11-25" }),
    row({ waitingListDate: "2026-05-01", submissionInviteDate: "2026-04-01" }), // negative gap
    // Karachi has only 1 entry -> insufficient data empty state
    row({ consulate: "Karachi", waitingListDate: "2026-06-01", submissionInviteDate: "2026-11-10" }),
  ];

  const [isb, khi] = computeQueueRightNow(rows, NOW);

  assert.equal(isb.consulate, "Islamabad");
  assert.equal(isb.hasEnoughData, true);
  assert.equal(isb.sampleCount, 5);
  assert.equal(isb.currentInviteJoinDate, "2026-02-20");
  assert.equal(isb.currentAppointmentSubmissionDate, "2026-10-30");
  assert.ok(isb.weeklyProgressionDays !== null && isb.weeklyProgressionDays >= 6 && isb.weeklyProgressionDays <= 8);
  assert.ok(isb.timelineMonths.length >= 6 && isb.timelineMonths.length <= 12);
  // Timeline should not project months past August 2026 (the latest waiting list entry)
  assert.equal(isb.timelineMonths[isb.timelineMonths.length - 1].key, "2026-08");
  assert.ok(isb.markerPercent !== null && isb.markerPercent > 0 && isb.markerPercent < 100);

  assert.equal(khi.consulate, "Karachi");
  assert.equal(khi.hasEnoughData, false);
  assert.equal(khi.sampleCount, 1);
  assert.equal(khi.currentInviteJoinDate, null);
});

test("computeJourneyStepDurations computes real stage medians, IQR, approval rate, and correction stats", () => {
  const rows: OverviewApplicantRecord[] = [
    row({
      visaStatus: "VISA_ISSUED",
      waitingListDate: "2026-01-01",
      submissionInviteDate: "2026-09-01", // 243d
      documentSubmissionDate: "2026-09-02",
      correctionRequestDate: "2026-09-05",
      correctionSubmittedDate: "2026-09-06",
      appointmentDate: "2026-09-10", // 9d from invite, 4d from correction fix
      decisionDate: "2026-09-20", // 10d
    }),
    row({
      visaStatus: "VISA_ISSUED",
      waitingListDate: "2026-01-10",
      submissionInviteDate: "2026-09-15", // 248d
      documentSubmissionDate: "2026-09-16",
      appointmentDate: "2026-10-01", // 16d from invite
      decisionDate: "2026-10-15", // 14d
    }),
    row({
      visaStatus: "VISA_ISSUED",
      waitingListDate: "2026-01-20",
      submissionInviteDate: "2026-10-01", // 255d
      documentSubmissionDate: "2026-10-02",
      correctionRequestDate: "2026-10-04",
      correctionSubmittedDate: "2026-10-05",
      appointmentDate: "2026-10-11", // 10d from invite, 6d from correction fix
      decisionDate: "2026-10-29", // 18d
    }),
    row({
      visaStatus: "VISA_REJECTED",
      waitingListDate: "2026-02-01",
      submissionInviteDate: "2026-10-15", // 256d
      documentSubmissionDate: "2026-10-16",
      appointmentDate: "2026-10-30", // 15d from invite
      decisionDate: "2026-11-11", // 12d
    }),
  ];

  const stats = computeJourneyStepDurations(rows, NOW);
  assert.equal(stats.totalTracked, 4);
  assert.equal(stats.submissionInviteCount, 4);
  assert.equal(stats.appointmentCount, 4);
  assert.equal(stats.decidedCount, 4);
  assert.equal(stats.issuedCount, 3);
  assert.equal(stats.approvalRate, 75);
  assert.equal(stats.waitingToInvite.sampleSize, 4);
  assert.ok(stats.waitingToInvite.medianDays !== null && stats.waitingToInvite.medianDays >= 248 && stats.waitingToInvite.medianDays <= 255);
  assert.equal(stats.inviteToAppointment.sampleSize, 4);
  assert.equal(stats.appointmentToDecision.sampleSize, 4);
  assert.equal(stats.correction.submissionsCount, 4);
  assert.equal(stats.correction.correctionCount, 2);
  assert.equal(stats.correction.percent, 50);
  assert.equal(stats.correction.oneInN, 2);
  assert.equal(stats.correction.postCorrectionSampleSize, 2);
  assert.equal(stats.correction.postCorrectionMedianDays, 5);
});

test("formatApproxDuration formats days, weeks, and months readably", () => {
  assert.equal(formatApproxDuration(1), "1 day");
  assert.equal(formatApproxDuration(3), "3 days");
  assert.equal(formatApproxDuration(14), "2 weeks");
  assert.equal(formatApproxDuration(259), "8.5 months");
});
