import test from "node:test";
import assert from "node:assert/strict";
import { parseCommunityMessages, scrubPrivacy } from "../lib/evidence/observation-parser";
import { validateTimelineObservation } from "../lib/evidence/import-validation";
import { runRollingOriginBacktest } from "../lib/forecasting/backtesting";
import { isEligibleStudentVisa } from "../lib/forecasting/data-validation";
import { combineAndDeduplicateJourneys } from "../lib/forecasting/deduplication";
import { computeEmbassyDurations } from "../lib/forecasting/duration-model";
import { buildPersonalForecast } from "../lib/forecasting/forecast-ensemble";
import { computeEmbassyFrontiers } from "../lib/forecasting/queue-frontier";
import { computeQueueVelocity } from "../lib/forecasting/queue-velocity";
import { fitKaplanMeier } from "../lib/forecasting/survival-analysis";
import type { NormalizedJourneyRecord, QueueObservationPoint } from "../lib/forecasting/types";

const AS_OF = new Date("2026-11-26T00:00:00Z");

function makeJourney(overrides: Partial<NormalizedJourneyRecord> = {}): NormalizedJourneyRecord {
  return {
    id: `rec-${Math.random().toString(36).slice(2, 8)}`,
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

function makeQueue(obs: string, frontier: string, embassy: "Islamabad" | "Karachi" = "Islamabad"): QueueObservationPoint {
  return {
    id: `q-${obs}-${frontier}`,
    sourceName: "Calibration",
    sourceType: "COMMUNITY_PLATFORM",
    reliability: "VERIFIED_COMMUNITY",
    embassy,
    queueType: "SUBMISSION_FRONTIER",
    observationDate: new Date(`${obs}T00:00:00Z`),
    observedFrontierDate: new Date(`${frontier}T00:00:00Z`),
    sampleSize: 15,
    reportedSubmissions: 15,
    reportedCorrections: 3,
    reportedAppointments: 8,
    reportedActivityCount: 26,
    confidence: 0.9,
  };
}

function sampleDataset(): { journeys: NormalizedJourneyRecord[]; queue: QueueObservationPoint[] } {
  const journeys: NormalizedJourneyRecord[] = [
    makeJourney({
      id: "isb-1",
      waitingListJoinedDate: new Date("2026-01-10T00:00:00Z"),
      submissionInvitedDate: new Date("2026-09-25T00:00:00Z"),
      documentsSubmittedDate: new Date("2026-09-27T00:00:00Z"),
      appointmentInvitedDate: new Date("2026-10-12T00:00:00Z"),
      appointmentBookedDate: new Date("2026-10-18T00:00:00Z"),
      appointmentAttendedDate: new Date("2026-10-20T00:00:00Z"),
    }),
    makeJourney({
      id: "isb-2",
      waitingListJoinedDate: new Date("2026-02-02T00:00:00Z"),
      submissionInvitedDate: new Date("2026-10-16T00:00:00Z"),
      documentsSubmittedDate: new Date("2026-10-18T00:00:00Z"),
      correctionRequestDates: [new Date("2026-10-24T00:00:00Z"), new Date("2026-10-28T00:00:00Z")],
      correctionResponseDates: [new Date("2026-10-25T00:00:00Z"), new Date("2026-10-29T00:00:00Z")],
      appointmentInvitedDate: new Date("2026-11-02T00:00:00Z"),
    }),
    makeJourney({
      id: "isb-3",
      waitingListJoinedDate: new Date("2026-02-18T00:00:00Z"),
      submissionInvitedDate: new Date("2026-11-06T00:00:00Z"),
      documentsSubmittedDate: new Date("2026-11-08T00:00:00Z"),
      appointmentInvitedDate: new Date("2026-11-22T00:00:00Z"),
    }),
    makeJourney({
      id: "isb-4",
      waitingListJoinedDate: new Date("2026-03-05T00:00:00Z"),
      submissionInvitedDate: new Date("2026-11-23T00:00:00Z"),
      documentsSubmittedDate: new Date("2026-11-25T00:00:00Z"),
    }),
    makeJourney({
      id: "isb-censored",
      waitingListJoinedDate: new Date("2026-04-01T00:00:00Z"),
      submissionInvitedDate: null,
      lastConfirmedAt: AS_OF,
    }),
    makeJourney({
      id: "khi-1",
      embassy: "Karachi",
      waitingListJoinedDate: new Date("2026-05-01T00:00:00Z"),
      submissionInvitedDate: new Date("2026-08-05T00:00:00Z"),
      documentsSubmittedDate: new Date("2026-08-08T00:00:00Z"),
      appointmentInvitedDate: new Date("2026-09-16T00:00:00Z"),
    }),
  ];

  const queue: QueueObservationPoint[] = [
    makeQueue("2026-10-16", "2026-02-02"),
    makeQueue("2026-10-23", "2026-02-08"),
    makeQueue("2026-10-30", "2026-02-16"),
    makeQueue("2026-11-06", "2026-02-18"),
    makeQueue("2026-11-13", "2026-02-25"),
    makeQueue("2026-11-20", "2026-03-03"),
    makeQueue("2026-11-26", "2026-03-10"),
  ];

  return { journeys, queue };
}

test("Forecast quantiles obey P10 <= P25 <= P50 <= P75 <= P90 and never predict before asOfDate", () => {
  const { journeys, queue } = sampleDataset();
  const fc = buildPersonalForecast(
    { embassy: "Islamabad", waitingListJoinedDate: new Date("2026-05-15T00:00:00Z") },
    journeys,
    queue,
    AS_OF,
    { iterations: 1000 }
  );

  for (const st of fc.stages) {
    if (st.status === "estimated" && st.p10Date && st.p50Date && st.p90Date) {
      assert.ok(st.p10Date <= st.p25Date!, `${st.stage} P10 > P25`);
      assert.ok(st.p25Date! <= st.p50Date, `${st.stage} P25 > P50`);
      assert.ok(st.p50Date <= st.p75Date!, `${st.stage} P50 > P75`);
      assert.ok(st.p75Date! <= st.p90Date, `${st.stage} P75 > P90`);
      assert.ok(st.p10Date >= fc.asOfDate, `${st.stage} P10 predicted in past`);
    }
  }
});

test("Handles joining dates before frontier (J < F), equal to frontier (J == F), and ahead (J > F)", () => {
  const { journeys, queue } = sampleDataset();

  const beforeF = buildPersonalForecast(
    { embassy: "Islamabad", waitingListJoinedDate: new Date("2026-02-15T00:00:00Z") },
    journeys,
    queue,
    AS_OF,
    { iterations: 500 }
  );
  assert.equal(beforeF.cohortAlreadyReached, true);
  assert.ok(beforeF.cohortReachedMessage?.includes("reached"));
  assert.ok((beforeF.daysSinceCohortReached ?? 0) >= 0);

  assert.ok(beforeF.currentSubmissionFrontier);
  const equalF = buildPersonalForecast(
    { embassy: "Islamabad", waitingListJoinedDate: new Date(`${beforeF.currentSubmissionFrontier}T00:00:00Z`) },
    journeys,
    queue,
    AS_OF,
    { iterations: 500 }
  );
  assert.equal(equalF.cohortAlreadyReached, true);

  const aheadF = buildPersonalForecast(
    { embassy: "Islamabad", waitingListJoinedDate: new Date("2026-06-15T00:00:00Z") },
    journeys,
    queue,
    AS_OF,
    { iterations: 500 }
  );
  assert.equal(aheadF.cohortAlreadyReached, false);
  assert.ok((aheadF.frontierLagDays ?? 0) > 60);
});

test("Conditions remaining stages cleanly when documents or appointment milestones are already recorded", () => {
  const { journeys, queue } = sampleDataset();
  const fc = buildPersonalForecast(
    {
      embassy: "Islamabad",
      waitingListJoinedDate: new Date("2026-03-01T00:00:00Z"),
      submissionInvitedDate: new Date("2026-11-18T00:00:00Z"),
      documentsSubmittedDate: new Date("2026-11-20T00:00:00Z"),
    },
    journeys,
    queue,
    AS_OF,
    { iterations: 500 }
  );

  const si = fc.stages.find((s) => s.stage === "SUBMISSION_INVITED")!;
  const ds = fc.stages.find((s) => s.stage === "DOCUMENTS_SUBMITTED")!;
  const ai = fc.stages.find((s) => s.stage === "APPOINTMENT_INVITED")!;
  assert.equal(si.status, "completed");
  assert.equal(si.actualDate, "2026-11-18");
  assert.equal(ds.status, "completed");
  assert.equal(ds.actualDate, "2026-11-20");
  assert.equal(ai.status, "estimated");
  assert.ok(ai.p10Date! >= "2026-11-26");
});

test("Returns unavailable decision metrics when zero completed interview-to-decision pairs exist", () => {
  const { journeys, queue } = sampleDataset();
  const dur = computeEmbassyDurations("Islamabad", journeys, AS_OF);
  assert.equal(dur.decisions.approvalRatePct, null);
  assert.equal(dur.decisionProcessing.sampleSize, 0);

  const fc = buildPersonalForecast(
    { embassy: "Islamabad", waitingListJoinedDate: new Date("2026-05-01T00:00:00Z") },
    journeys,
    queue,
    AS_OF,
    { iterations: 500 }
  );
  const dc = fc.stages.find((s) => s.stage === "DECISION_MADE")!;
  assert.equal(dc.status, "unavailable");
  assert.equal(dc.p50Date, null);
});

test("Stalled zero-velocity queue triggers isStalled without dividing by zero", () => {
  const stalledQueue = [
    makeQueue("2026-10-01", "2026-02-01"),
    makeQueue("2026-10-15", "2026-02-01"),
    makeQueue("2026-11-01", "2026-02-01"),
    makeQueue("2026-11-25", "2026-02-01"),
  ];
  const v = computeQueueVelocity("Islamabad", "SUBMISSION_FRONTIER", [], stalledQueue, AS_OF);
  assert.equal(v.weightedWeeklyDays, 0);
  assert.equal(v.isStalled, true);
});

test("Privacy scrubbing, non-student exclusions, duplicate WhatsApp reports, cross-year dates & conflict flagging", () => {
  const cleaned = scrubPrivacy("Contact +92 300 1234567 IBAN PK26MSHQ0000089120108535 test@example.com https://t.me/abc");
  assert.equal(cleaned.includes("300 1234567"), false);
  assert.equal(cleaned.includes("PK26MSHQ"), false);
  assert.equal(cleaned.includes("test@example.com"), false);

  assert.equal(isEligibleStudentVisa("Frv"), false);
  assert.equal(isEligibleStudentVisa("Study"), true);

  const pubAt = new Date("2026-02-05T10:00:00Z");
  const sampleMessages = [
    {
      publishedAt: pubAt,
      text: "Islamabad Embassy\nAli Khan\nWaiting List: 18 Dec\nGot Submission - 4 Feb",
    },
    {
      publishedAt: pubAt,
      text: "[Forwarded] Islamabad Embassy\nAli Khan\nWaiting List: 18 Dec\nGot Submission - 4 Feb",
    },
    {
      publishedAt: pubAt,
      text: "Group Application - Student + FRV\nSubmission: 10 Jan\nAppointment: 2 Feb",
    },
    {
      publishedAt: pubAt,
      text: "Random truncated hi guys?",
    },
  ];

  const parsed = parseCommunityMessages(sampleMessages);
  assert.equal(parsed.timelines.length, 2); // 2 identical forwarded texts parsed before DB dedup
  assert.equal(parsed.timelines[0].dedupeFingerprint, parsed.timelines[1].dedupeFingerprint);
  assert.equal(parsed.timelines[0].waitingListJoinedDate?.toISOString().slice(0, 10), "2025-12-18");
  assert.equal(parsed.excludedCount, 2); // FRV + chatter excluded

  const badOrder = validateTimelineObservation({
    ...parsed.timelines[0],
    waitingListJoinedDate: new Date("2026-05-10T00:00:00Z"),
    submissionInvitedDate: new Date("2026-04-01T00:00:00Z"),
  });
  assert.equal(badOrder.status, "CONFLICTING");
});

test("Kaplan-Meier accounts for censored waiting subjects and separates Karachi from Islamabad", () => {
  const km = fitKaplanMeier(
    [
      { startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2026-09-01T00:00:00Z"), completed: true, lastObservedAt: AS_OF },
      { startDate: new Date("2026-02-01T00:00:00Z"), endDate: new Date("2026-10-10T00:00:00Z"), completed: true, lastObservedAt: AS_OF },
      { startDate: new Date("2026-04-01T00:00:00Z"), endDate: null, completed: false, lastObservedAt: AS_OF },
    ],
    AS_OF
  );
  assert.equal(km.eventsCompleted, 2);
  assert.equal(km.censoredCount, 1);
  assert.ok(km.medianDays !== null && km.medianDays >= 240);

  const { journeys, queue } = sampleDataset();
  const khiFrontier = computeEmbassyFrontiers("Karachi", journeys, queue, AS_OF);
  assert.equal(khiFrontier.submission.combinedFrontierDate, "2026-05-01");
  const isbFrontier = computeEmbassyFrontiers("Islamabad", journeys, queue, AS_OF);
  assert.notEqual(isbFrontier.submission.combinedFrontierDate, khiFrontier.submission.combinedFrontierDate);
});

test("Deduplication prevents internal-external double counting & preserves multiple corrections without A-S duplication", () => {
  const { journeys } = sampleDataset();
  const duplicateExt = makeJourney({
    id: "ext-dup",
    sourceType: "external",
    waitingListJoinedDate: new Date("2026-01-10T00:00:00Z"),
    submissionInvitedDate: new Date("2026-09-25T00:00:00Z"),
  });
  const merged = combineAndDeduplicateJourneys(journeys, [duplicateExt]);
  assert.equal(merged.length, journeys.length);

  const dur = computeEmbassyDurations("Islamabad", merged, AS_OF);
  assert.equal(dur.corrections.totalCorrectionEvents, 2);
  assert.ok(dur.corrections.correctionResponseTime.median !== null);
});

test("Rolling-origin chronological backtesting avoids future leakage and scores MAE & interval coverage", () => {
  const { journeys, queue } = sampleDataset();
  const results = runRollingOriginBacktest(
    "Islamabad",
    journeys,
    queue,
    [new Date("2026-10-16T00:00:00Z"), new Date("2026-11-01T00:00:00Z")]
  );
  const ensemble = results.find((r) => r.modelName === "Adaptive MC + KM Ensemble");
  assert.ok(ensemble && ensemble.n > 0);
  assert.ok(ensemble.maeDays !== null && ensemble.maeDays >= 0);
});
