import test from "node:test";
import assert from "node:assert/strict";
import {
  adaptDashboardKpis,
  adaptQueueOverview,
  adaptStageDurationTimeline,
  adaptTransitJourney,
  buildMonthlyQueueTimeline,
  type IntelligencePayloadLike,
} from "../lib/analytics/adapters";
import {
  formatCompactQueueDate,
  formatCompactWeeklyPace,
  formatConciseDateRange,
  formatDisplayDate,
} from "../lib/analytics/formatters";
import { buildPersonalForecast } from "../lib/forecasting/forecast-ensemble";
import { computeEmbassyFrontiers } from "../lib/forecasting/queue-frontier";
import type { NormalizedJourneyRecord, QueueObservationPoint } from "../lib/forecasting/types";

const AS_OF = new Date("2026-11-27T00:00:00Z");

function makeJourney(overrides: Partial<NormalizedJourneyRecord> = {}): NormalizedJourneyRecord {
  return {
    id: `j-${Math.random().toString(36).slice(2, 8)}`,
    sourceType: "internal",
    embassy: "Islamabad",
    visaCategory: "Study",
    reliability: "VERIFIED_COMMUNITY",
    confidence: 0.95,
    reportDate: new Date("2026-01-10T00:00:00Z"),
    lastConfirmedAt: AS_OF,
    waitingListJoinedDate: new Date("2026-01-10T00:00:00Z"),
    submissionInvitedDate: null,
    documentsSubmittedDate: null,
    preliminaryReviewDate: null,
    correctionRequestDates: [],
    correctionResponseDates: [],
    correctionAcceptedDate: null,
    appointmentInvitedDate: null,
    appointmentBookedDate: null,
    appointmentAttendedDate: null,
    decisionDate: null,
    decisionOutcome: null,
    passportDispatchedDate: null,
    passportReceivedDate: null,
    fingerprint: `fp-${Math.random().toString(36).slice(2, 10)}`,
    ...overrides,
  };
}

function makeQueue(obs: string, frontier: string): QueueObservationPoint {
  return {
    id: `q-${obs}-${frontier}`,
    sourceName: "Calibration",
    sourceType: "COMMUNITY_PLATFORM",
    reliability: "VERIFIED_COMMUNITY",
    embassy: "Islamabad",
    queueType: "SUBMISSION_FRONTIER",
    observationDate: new Date(`${obs}T00:00:00Z`),
    observedFrontierDate: new Date(`${frontier}T00:00:00Z`),
    sampleSize: 12,
    reportedSubmissions: 12,
    reportedCorrections: 2,
    reportedAppointments: 5,
    reportedActivityCount: 19,
    confidence: 0.9,
  };
}

test("Issue C: expired booked appointment triggers needs_confirmation instead of clamping to today", () => {
  const journeys: NormalizedJourneyRecord[] = [
    makeJourney({
      waitingListJoinedDate: new Date("2026-01-05T00:00:00Z"),
      submissionInvitedDate: new Date("2026-05-15T00:00:00Z"),
      documentsSubmittedDate: new Date("2026-05-18T00:00:00Z"),
      appointmentInvitedDate: new Date("2026-06-05T00:00:00Z"),
      appointmentAttendedDate: new Date("2026-06-15T00:00:00Z"),
    }),
    makeJourney({
      waitingListJoinedDate: new Date("2026-01-15T00:00:00Z"),
      submissionInvitedDate: new Date("2026-05-25T00:00:00Z"),
      documentsSubmittedDate: new Date("2026-05-28T00:00:00Z"),
      appointmentInvitedDate: new Date("2026-06-12T00:00:00Z"),
      appointmentAttendedDate: new Date("2026-06-22T00:00:00Z"),
    }),
  ];
  const queue = [makeQueue("2026-11-10", "2026-03-01"), makeQueue("2026-11-20", "2026-03-08")];

  const fc = buildPersonalForecast(
    {
      embassy: "Islamabad",
      waitingListJoinedDate: new Date("2026-01-01T00:00:00Z"),
      submissionInvitedDate: new Date("2026-05-20T00:00:00Z"),
      documentsSubmittedDate: new Date("2026-05-22T00:00:00Z"),
      appointmentInvitedDate: new Date("2026-06-30T00:00:00Z"),
      appointmentBookedDate: new Date("2026-07-10T00:00:00Z"),
      appointmentAttendedDate: null,
    },
    journeys,
    queue,
    AS_OF,
    { iterations: 300 }
  );

  const apptStage = fc.stages.find((s) => s.stage === "APPOINTMENT_ATTENDED")!;
  assert.equal(apptStage.status, "needs_confirmation");
  assert.equal(apptStage.p50Date, null);

  const journeyView = adaptTransitJourney(fc, {
    visaStatus: "APPOINTMENT_SCHEDULED",
    waitingListDate: "2026-01-01",
    submissionInviteDate: "2026-05-20",
    documentSubmissionDate: "2026-05-22",
    appointmentInviteDate: "2026-06-30",
    appointmentDate: "2026-07-10",
  });
  const viewAppt = journeyView.milestones.find((s) => s.id === "APPOINTMENT_ATTENDED")!;
  assert.equal(viewAppt.state, "action-required");
  assert.equal(viewAppt.statusLabel, "Confirm date");
  assert.equal(journeyView.currentStage.label, "Appointment");
  assert.equal(journeyView.currentStage.statusText, "Confirmation needed");
  assert.equal(journeyView.nextAction?.title, "Confirm your appointment date");
  assert.equal(journeyView.nextAction?.milestoneField, "interviewDate");
});

test("Issue D: decision forecast with < 5 samples returns unavailable and bounds confidence", () => {
  const journeys: NormalizedJourneyRecord[] = Array.from({ length: 3 }, (_, i) =>
    makeJourney({
      id: `dec-${i}`,
      waitingListJoinedDate: new Date(`2026-01-0${i + 1}T00:00:00Z`),
      submissionInvitedDate: new Date("2026-09-01T00:00:00Z"),
      documentsSubmittedDate: new Date("2026-09-03T00:00:00Z"),
      appointmentInvitedDate: new Date("2026-09-20T00:00:00Z"),
      appointmentAttendedDate: new Date("2026-09-28T00:00:00Z"),
      decisionDate: new Date("2026-10-15T00:00:00Z"),
      decisionOutcome: "APPROVED",
    })
  );
  const queue = [makeQueue("2026-11-15", "2026-03-01"), makeQueue("2026-11-25", "2026-03-08")];

  const fc = buildPersonalForecast(
    {
      embassy: "Islamabad",
      waitingListJoinedDate: new Date("2026-01-01T00:00:00Z"),
      submissionInvitedDate: new Date("2026-09-01T00:00:00Z"),
      documentsSubmittedDate: new Date("2026-09-03T00:00:00Z"),
      appointmentInvitedDate: new Date("2026-09-20T00:00:00Z"),
      appointmentAttendedDate: new Date("2026-09-28T00:00:00Z"),
    },
    journeys,
    queue,
    AS_OF,
    { iterations: 300 }
  );

  const decStage = fc.stages.find((s) => s.stage === "DECISION_MADE")!;
  assert.equal(decStage.status, "unavailable");
  assert.equal(decStage.p50Date, null);
  assert.equal(fc.confidence, "insufficient");
});

test("Issue E & F: observed range always bounds combined frontier, and speedSensitivity is suppressed after invite", () => {
  const queue: QueueObservationPoint[] = [
    makeQueue("2026-11-05", "2026-02-10"),
    makeQueue("2026-11-10", "2026-02-15"),
    makeQueue("2026-11-15", "2026-02-20"),
    makeQueue("2026-11-20", "2026-02-25"),
    makeQueue("2026-11-25", "2026-03-09"),
    makeQueue("2026-11-26", "2026-03-10"),
  ];
  const frontiers = computeEmbassyFrontiers("Islamabad", [], queue, AS_OF);
  assert.ok(frontiers.submission.combinedFrontierDate);
  assert.ok(frontiers.submission.observedRangeStart! <= frontiers.submission.combinedFrontierDate!);
  assert.ok(frontiers.submission.combinedFrontierDate! <= frontiers.submission.observedRangeEnd!);

  const fcCompletedInvite = buildPersonalForecast(
    {
      embassy: "Islamabad",
      waitingListJoinedDate: new Date("2026-02-01T00:00:00Z"),
      submissionInvitedDate: new Date("2026-10-01T00:00:00Z"),
    },
    [],
    queue,
    AS_OF,
    { iterations: 200 }
  );
  assert.equal(fcCompletedInvite.speedSensitivity.length, 0);
});

test("buildMonthlyQueueTimeline handles year transitions, leap years, edge boundaries, and exact fillRatio", () => {
  const timeline = buildMonthlyQueueTimeline(
    "2026-01-15",
    { minWlMs: Date.UTC(2025, 9, 1), maxWlMs: Date.UTC(2026, 6, 1) },
    AS_OF
  );
  assert.ok(timeline);
  assert.equal(timeline.frontierIsoDate, "2026-01-15");
  assert.equal(timeline.markerShortDate, "15 Jan");
  assert.ok(timeline.months.some((m) => m.label.includes("'25") || m.label.includes("'26")));
  const janIdx = timeline.months.findIndex((m) => m.key === "2026-01");
  assert.equal(timeline.activeMonthIndex, janIdx);
  const jan = timeline.months[janIdx];
  const expectedRatio = (Date.UTC(2026, 0, 15) - Date.UTC(2026, 0, 1)) / (Date.UTC(2026, 1, 1) - Date.UTC(2026, 0, 1));
  assert.ok(Math.abs(jan.fillRatio - expectedRatio) < 0.0001);
  assert.ok(Math.abs(timeline.activeMonthFillRatio - expectedRatio) < 0.0001);

  // Leap year Feb (29 days in 2024)
  const leapTimeline = buildMonthlyQueueTimeline(
    "2024-02-15",
    { minWlMs: Date.UTC(2024, 0, 1), maxWlMs: Date.UTC(2024, 5, 1) },
    new Date("2024-06-01T00:00:00Z")
  );
  assert.ok(leapTimeline);
  const feb24 = leapTimeline.months.find((m) => m.key === "2024-02")!;
  assert.ok(Math.abs(feb24.fillRatio - 14 / 29) < 0.0001);

  // Frontier earlier than cohortBounds.minWlMs expands start month cleanly and preserves exact fillRatio
  const beforeTimeline = buildMonthlyQueueTimeline(
    "2025-12-10",
    { minWlMs: Date.UTC(2026, 0, 1), maxWlMs: Date.UTC(2026, 6, 1) },
    AS_OF
  );
  assert.ok(beforeTimeline);
  assert.equal(beforeTimeline.frontierIsoDate, "2025-12-10");
  assert.equal(beforeTimeline.months[0].key, "2025-12");
  assert.equal(beforeTimeline.activeMonthIndex, 0);
  assert.ok(Math.abs(beforeTimeline.activeMonthFillRatio - 9 / 31) < 0.0001);

  const missingTimeline = buildMonthlyQueueTimeline(null, {}, AS_OF);
  assert.equal(missingTimeline, null);
});

test("adaptStageDurationTimeline omits post-correction duration when < 5 tracked cases and ignores non-decided decisions", () => {
  const rows = [
    {
      consulate: "Islamabad",
      visaStatus: "APPOINTMENT_SCHEDULED",
      waitingListDate: "2026-01-01",
      submissionInviteDate: "2026-09-01",
      documentSubmissionDate: "2026-09-02",
      correctionRequestDate: "2026-09-05",
      correctionSubmittedDate: "2026-09-06",
      appointmentDate: "2026-09-07",
      decisionDate: "2026-09-10", // not decided status -> ignored
    },
    ...Array.from({ length: 5 }, (_, i) => ({
      consulate: "Islamabad",
      visaStatus: "SUBMISSION_RECEIVED",
      waitingListDate: `2026-02-0${i + 1}`,
      submissionInviteDate: "2026-10-01",
      documentSubmissionDate: "2026-10-03",
      correctionRequestDate: i < 2 ? "2026-10-05" : null,
      correctionSubmittedDate: i < 2 ? "2026-10-06" : null,
      appointmentDate: null,
      decisionDate: null,
    })),
  ];

  const view = adaptStageDurationTimeline(rows, null, AS_OF);
  assert.equal(view.details.internalDecidedCount, 0);
  assert.equal(view.stages[3].subtitle, "No decisions recorded yet");
  assert.equal(view.correction.postCorrectionSampleSize, 1);
  assert.equal(view.correction.postCorrectionApprox, null);
});

test("adaptQueueOverview and formatters produce canonical non-conflicting presentation data", () => {
  assert.equal(formatDisplayDate("2026-03-05"), "5 Mar 2026");
  assert.equal(formatConciseDateRange("2026-12-01", "2026-12-10"), "1–10 Dec 2026");

  const payload: IntelligencePayloadLike = {
    modelVersion: "v2.0.0-mc-km-ensemble",
    generatedAt: "2026-11-27T00:00:00Z",
    datasetSummary: {
      internalApprovedCount: 100,
      externalTimelineCount: 50,
      combinedDeduplicatedCount: 140,
      queueObservationsCount: 20,
    },
    embassies: {
      Islamabad: {
        embassy: "Islamabad",
        frontiers: {
          submission: {
            embassy: "Islamabad",
            queueType: "SUBMISSION_FRONTIER",
            internalLatestCohort: "2026-03-01",
            internalSampleSize: 10,
            combinedFrontierDate: "2026-03-09",
            observedRangeStart: "2026-03-02",
            observedRangeEnd: "2026-03-11",
            sampleSize: 8,
            effectiveSampleSize: 6.5,
            lastUpdatedDate: "2026-11-26",
            hasConflict: false,
            conflictSummary: null,
            sourceClassification: "Combined",
            confidence: "moderate",
          },
          appointmentBySubmission: {
            embassy: "Islamabad",
            queueType: "APPOINTMENT_SUBMISSION_FRONTIER",
            internalLatestCohort: "2026-11-20",
            internalSampleSize: 6,
            combinedFrontierDate: "2026-11-24",
            observedRangeStart: "2026-11-18",
            observedRangeEnd: "2026-11-25",
            sampleSize: 6,
            effectiveSampleSize: 5.1,
            lastUpdatedDate: "2026-11-26",
            hasConflict: false,
            conflictSummary: null,
            sourceClassification: "Combined",
            confidence: "moderate",
          },
          appointmentByWaitingList: {
            embassy: "Islamabad",
            queueType: "APPOINTMENT_WL_COHORT_FRONTIER",
            internalLatestCohort: "2026-02-20",
            internalSampleSize: 6,
            combinedFrontierDate: "2026-02-24",
            observedRangeStart: "2026-02-18",
            observedRangeEnd: "2026-02-25",
            sampleSize: 6,
            effectiveSampleSize: 5.1,
            lastUpdatedDate: "2026-11-26",
            hasConflict: false,
            conflictSummary: null,
            sourceClassification: "Combined",
            confidence: "moderate",
          },
        },
        velocity: {
          weightedWeeklyDays: 7.3,
          rawLatestWeeklyDays: 7.5,
          windows: [],
          isStalled: false,
          weightsUsed: {},
        },
      },
      Karachi: {
        embassy: "Karachi",
        frontiers: {
          submission: {
            embassy: "Karachi",
            queueType: "SUBMISSION_FRONTIER",
            internalLatestCohort: null,
            internalSampleSize: 1,
            combinedFrontierDate: null,
            observedRangeStart: null,
            observedRangeEnd: null,
            sampleSize: 1,
            effectiveSampleSize: 0.8,
            lastUpdatedDate: null,
            hasConflict: false,
            conflictSummary: null,
            sourceClassification: "Insufficient",
            confidence: "insufficient",
          },
          appointmentBySubmission: {
            embassy: "Karachi",
            queueType: "APPOINTMENT_SUBMISSION_FRONTIER",
            internalLatestCohort: null,
            internalSampleSize: 0,
            combinedFrontierDate: null,
            observedRangeStart: null,
            observedRangeEnd: null,
            sampleSize: 0,
            effectiveSampleSize: 0,
            lastUpdatedDate: null,
            hasConflict: false,
            conflictSummary: null,
            sourceClassification: "Insufficient",
            confidence: "insufficient",
          },
          appointmentByWaitingList: {
            embassy: "Karachi",
            queueType: "APPOINTMENT_WL_COHORT_FRONTIER",
            internalLatestCohort: null,
            internalSampleSize: 0,
            combinedFrontierDate: null,
            observedRangeStart: null,
            observedRangeEnd: null,
            sampleSize: 0,
            effectiveSampleSize: 0,
            lastUpdatedDate: null,
            hasConflict: false,
            conflictSummary: null,
            sourceClassification: "Insufficient",
            confidence: "insufficient",
          },
        },
        velocity: {
          weightedWeeklyDays: null,
          rawLatestWeeklyDays: null,
          windows: [],
          isStalled: false,
          weightsUsed: {},
        },
      },
    },
  };

  assert.equal(formatCompactQueueDate("2026-03-09"), "9 Mar");
  assert.equal(formatCompactWeeklyPace(7.3), "7.3d");

  const q = adaptQueueOverview(payload, {}, AS_OF);
  assert.equal(q.embassies[0].submissionFrontier.value, "9 Mar");
  assert.equal(q.embassies[0].appointmentFrontier.value, "24 Nov");
  assert.equal(q.embassies[0].weeklyMovement.value, "7.3d");
  assert.equal(q.embassies[0].timeline?.frontierIsoDate, "2026-03-09");
  assert.equal(q.embassies[0].timeline?.markerShortDate, q.embassies[0].submissionFrontier.value);
  assert.equal(q.embassies[1].hasEnoughData, false);
  assert.equal(q.embassies[1].timeline, null);

  const kpis = adaptDashboardKpis(
    { waitingListDate: "2026-03-02", submissionInviteDate: "2026-10-01", visaStatus: "SUBMISSION_RECEIVED" },
    null,
    [{ date: "2026-11-01", frontierDate: "2026-02-15" }], // < 3 points -> no fabricated sparkline
    { active: true, waitingDays: 270, hasWaitingListDate: true, now: AS_OF }
  );
  assert.equal(kpis.queueFrontier.secondary, "Invite already received");
  assert.equal(kpis.queueFrontier.sparklinePoints.length, 0);
});

test("adaptTransitJourney handles active/multiple corrections, terminal outcomes, and locks completed dates across scenarios", () => {
  const fc = buildPersonalForecast(
    {
      embassy: "Islamabad",
      waitingListJoinedDate: new Date("2026-01-10T00:00:00Z"),
      submissionInvitedDate: new Date("2026-04-01T00:00:00Z"),
      documentsSubmittedDate: new Date("2026-04-05T00:00:00Z"),
    },
    [
      makeJourney({
        waitingListJoinedDate: new Date("2026-01-05T00:00:00Z"),
        submissionInvitedDate: new Date("2026-03-15T00:00:00Z"),
        documentsSubmittedDate: new Date("2026-03-18T00:00:00Z"),
        appointmentInvitedDate: new Date("2026-04-10T00:00:00Z"),
        appointmentAttendedDate: new Date("2026-04-20T00:00:00Z"),
      }),
    ],
    [makeQueue("2026-11-10", "2026-03-01"), makeQueue("2026-11-20", "2026-03-09")],
    AS_OF,
    { iterations: 200 }
  );

  // Active correction adds conditional interruption station and preserves multiple historical corrections
  const withActiveCorrection = adaptTransitJourney(fc, {
    visaStatus: "UNDER_CORRECTION",
    waitingListDate: "2026-01-10",
    submissionInviteDate: "2026-04-01",
    documentSubmissionDate: "2026-04-05",
    correctionRequestDate: "2026-04-18",
    history: [
      { milestone: "correctionRequestDate", eventDate: "2026-04-08", note: "First check" },
      { milestone: "correctionSubmittedDate", eventDate: "2026-04-10", note: "First upload" },
      { milestone: "correctionRequestDate", eventDate: "2026-04-18", note: "Second check" },
    ],
  });
  assert.equal(withActiveCorrection.currentStage.label, "Correction required");
  assert.equal(withActiveCorrection.corrections.isActive, true);
  assert.equal(withActiveCorrection.corrections.events.length, 3);
  assert.ok(withActiveCorrection.milestones.some((m) => m.id === "CORRECTION_CYCLE"));
  assert.equal(withActiveCorrection.nextAction?.milestoneField, "correctionSubmittedDate");

  // Scenario switching keeps completed milestones strictly fixed
  const faster = adaptTransitJourney(fc, { visaStatus: "SUBMISSION_RECEIVED" }, { scenario: "faster" });
  const slower = adaptTransitJourney(fc, { visaStatus: "SUBMISSION_RECEIVED" }, { scenario: "slower" });
  assert.equal(faster.milestones[0].actualDate, "2026-01-10");
  assert.equal(slower.milestones[0].actualDate, "2026-01-10");
  assert.equal(faster.milestones[1].actualDate, "2026-04-01");
  assert.equal(slower.milestones[1].actualDate, "2026-04-01");

  // Terminal VISA_ISSUED suppresses irrelevant future predictions and nextAction
  const issued = adaptTransitJourney(fc, {
    visaStatus: "VISA_ISSUED",
    waitingListDate: "2026-01-10",
    submissionInviteDate: "2026-04-01",
    documentSubmissionDate: "2026-04-05",
    decisionDate: "2026-06-20",
  });
  assert.equal(issued.currentStage.label, "Visa issued");
  assert.equal(issued.nextAction, null);
  const decisionNode = issued.milestones.find((m) => m.id === "DECISION_MADE")!;
  assert.equal(decisionNode.state, "terminal");
  assert.equal(decisionNode.terminalOutcome, "issued");
});
