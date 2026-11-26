import test from "node:test";
import assert from "node:assert/strict";
import { calculateInvitationEstimate, getConsulateModelStats } from "../lib/estimator";
import { broadcastEvent, subscribeApplicant, RealtimeEvent } from "../lib/realtime";
import { rateLimit } from "../lib/rate-limit";

test("Visa Estimator - Statistical prediction engine", async (t) => {
  await t.test("Loads independent statistics for Islamabad and Karachi", async () => {
    const isbStats = await getConsulateModelStats("Islamabad");
    const khiStats = await getConsulateModelStats("Karachi");

    assert.equal(isbStats.consulate, "Islamabad");
    assert.equal(khiStats.consulate, "Karachi");
    assert.ok(isbStats.totalRecords > 0, "Islamabad has records");
    assert.ok(khiStats.totalRecords > 0, "Karachi has records");
    assert.ok(isbStats.observedFrontierDate, "Islamabad has an observed frontier date");
    assert.ok(khiStats.observedFrontierDate, "Karachi has an observed frontier date");
  });

  await t.test("Predicts consistent quantile intervals for Islamabad applicant", async () => {
    // Pick a date in future relative to the observed frontier (e.g. 2026-09-01)
    const result = await calculateInvitationEstimate("Islamabad", "2026-09-01");

    assert.equal(result.consulate, "Islamabad");
    assert.ok(result.bestEstimatedDate, "Has best estimated date");
    assert.ok(result.likelyWindow50.from, "Has likely window start");
    assert.ok(result.likelyWindow50.to, "Has likely window end");
    assert.ok(result.widerWindow80.from, "Has wider window start");
    assert.ok(result.widerWindow80.to, "Has wider window end");

    const tP10 = new Date(result.widerWindow80.from).getTime();
    const tP25 = new Date(result.likelyWindow50.from).getTime();
    const tMed = new Date(result.bestEstimatedDate).getTime();
    const tP75 = new Date(result.likelyWindow50.to).getTime();
    const tP90 = new Date(result.widerWindow80.to).getTime();

    // Mathematically: P10 <= P25 <= Median <= P75 <= P90
    assert.ok(tP10 <= tP25, `P10 (${result.widerWindow80.from}) <= P25 (${result.likelyWindow50.from})`);
    assert.ok(tP25 <= tMed, `P25 (${result.likelyWindow50.from}) <= Median (${result.bestEstimatedDate})`);
    assert.ok(tMed <= tP75, `Median (${result.bestEstimatedDate}) <= P75 (${result.likelyWindow50.to})`);
    assert.ok(tP75 <= tP90, `P75 (${result.likelyWindow50.to}) <= P90 (${result.widerWindow80.to})`);
  });

  await t.test("Detects when user registration date is already at or behind observed frontier", async () => {
    // 2026-01-01 is before Islamabad's frontier (~June 2026)
    const result = await calculateInvitationEstimate("Islamabad", "2026-01-01");
    assert.equal(result.status, "FRONTIER_REACHED");
    assert.equal(result.estimatedRemainingDays, 0);
    assert.ok(result.explanation.includes("observed invitation frontier has already reached"));
  });

  await t.test("Rejects invalid date format", async () => {
    await assert.rejects(
      () => calculateInvitationEstimate("Islamabad", "invalid-date-string"),
      /Invalid waiting list date/
    );
  });

  await t.test("Caches consulate model statistics for fast subsequent lookups", async () => {
    const start = Date.now();
    await getConsulateModelStats("Islamabad");
    const duration = Date.now() - start;
    assert.ok(duration < 50, `Subsequent cached call should be fast: ${duration}ms`);
  });
});

test("Rate Limiter - Abuse Protection", async (t) => {
  await t.test("Enforces sliding window limits", async () => {
    const key = `test_key_${Date.now()}`;
    const max = 3;
    const windowMs = 5000;

    assert.equal(rateLimit(key, max, windowMs), true, "Call 1 allowed");
    assert.equal(rateLimit(key, max, windowMs), true, "Call 2 allowed");
    assert.equal(rateLimit(key, max, windowMs), true, "Call 3 allowed");
    assert.equal(rateLimit(key, max, windowMs), false, "Call 4 blocked by rate limit");
  });
});

test("Realtime Private Messaging - Event Distribution", async (t) => {
  await t.test("Subscribes and delivers real-time events to applicant stream", async () => {
    const testApplicantId = "test_applicant_123";
    let receivedEvent: RealtimeEvent | null = null;

    const unsubscribe = subscribeApplicant(testApplicantId, (event) => {
      receivedEvent = event;
    });

    const testEvent: RealtimeEvent = {
      type: "new_message",
      conversationId: "conv_abc",
      recipientApplicantId: testApplicantId,
      senderApplicantId: "sender_xyz",
      payload: { content: "Hallo! Are you studying at TU Chemnitz?" },
      timestamp: new Date().toISOString(),
    };

    broadcastEvent(testEvent);

    assert.ok(receivedEvent !== null, "Event was received by subscriber");
    const evt = receivedEvent as RealtimeEvent;
    assert.equal(evt.type, "new_message");
    assert.equal(evt.conversationId, "conv_abc");
    assert.equal(evt.payload.content, "Hallo! Are you studying at TU Chemnitz?");

    unsubscribe();
  });
});
