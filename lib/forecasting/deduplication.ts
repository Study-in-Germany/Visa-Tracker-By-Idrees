import { toIsoDay } from "./date-utils";
import type { NormalizedJourneyRecord, QueueObservationPoint } from "./types";

/**
 * Merges internal verified Applicant records with external community timeline observations
 * while suppressing likely overlaps across channels/trackers without discarding distinct peers.
 */
export function combineAndDeduplicateJourneys(
  internal: NormalizedJourneyRecord[],
  external: NormalizedJourneyRecord[]
): NormalizedJourneyRecord[] {
  const seenExact = new Set<string>();
  const combined: NormalizedJourneyRecord[] = [];

  for (const r of internal) {
    seenExact.add(r.fingerprint);
    combined.push(r);
  }

  for (const ext of external) {
    if (seenExact.has(ext.fingerprint)) continue;
    seenExact.add(ext.fingerprint);

    // Avoid counting an external timeline that duplicates an already-recorded internal entry
    // on both joining date AND invite/appointment dates (e.g. student posted in both).
    const matchesInternal = internal.some((intRec) => {
      if (intRec.embassy !== ext.embassy) return false;
      const wlMatch =
        intRec.waitingListJoinedDate &&
        ext.waitingListJoinedDate &&
        toIsoDay(intRec.waitingListJoinedDate) === toIsoDay(ext.waitingListJoinedDate);
      if (!wlMatch) return false;
      const siMatch =
        intRec.submissionInvitedDate &&
        ext.submissionInvitedDate &&
        toIsoDay(intRec.submissionInvitedDate) === toIsoDay(ext.submissionInvitedDate);
      const aiMatch =
        intRec.appointmentInvitedDate &&
        ext.appointmentInvitedDate &&
        toIsoDay(intRec.appointmentInvitedDate) === toIsoDay(ext.appointmentInvitedDate);
      return Boolean(siMatch || aiMatch);
    });

    if (!matchesInternal) {
      combined.push(ext);
    }
  }

  return combined;
}

/** Deduplicates queue observations at the (embassy, queueType, observationDate, observedFrontierDate) level. */
export function deduplicateQueuePoints(points: QueueObservationPoint[]): QueueObservationPoint[] {
  const byKey = new Map<string, QueueObservationPoint>();
  for (const p of points) {
    const key = `${p.embassy}|${p.queueType}|${toIsoDay(p.observationDate)}|${toIsoDay(p.observedFrontierDate)}`;
    const prev = byKey.get(key);
    if (!prev || p.confidence > prev.confidence) {
      byKey.set(key, p);
    }
  }
  return Array.from(byKey.values());
}
