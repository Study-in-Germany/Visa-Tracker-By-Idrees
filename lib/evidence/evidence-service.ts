import type {
  EvidenceReliability,
  EvidenceSourceType,
  EvidenceVerificationStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ParseBatchResult } from "./observation-parser";
import { validateQueueObservation, validateTimelineObservation } from "./import-validation";

export interface IngestSourceInput {
  name: string;
  sourceType: EvidenceSourceType;
  sourceRef: string;
  publishedAt?: Date | null;
  reliability: EvidenceReliability;
  usagePermission: string;
  verificationStatus?: EvidenceVerificationStatus;
  notes?: string;
}

export interface IngestSummary {
  sourceId: string;
  totalParsedTimelines: number;
  totalParsedQueue: number;
  insertedTimelines: number;
  insertedQueue: number;
  duplicatesSkipped: number;
  conflictingFlagged: number;
  excludedCount: number;
}

/**
 * Idempotently persists extracted timelines and queue observations under an `EvidenceSource`
 * using batched `createMany({ skipDuplicates: true })` so large exports finish in milliseconds
 * and never create fake `Applicant` rows.
 */
export async function ingestParsedEvidence(
  sourceMeta: IngestSourceInput,
  batch: ParseBatchResult,
  options: { approveAllValid?: boolean } = {}
): Promise<IngestSummary> {
  const source = await prisma.evidenceSource.upsert({
    where: { sourceRef: sourceMeta.sourceRef },
    create: {
      name: sourceMeta.name,
      sourceType: sourceMeta.sourceType,
      sourceRef: sourceMeta.sourceRef,
      publishedAt: sourceMeta.publishedAt ?? null,
      reliability: sourceMeta.reliability,
      usagePermission: sourceMeta.usagePermission,
      verificationStatus: sourceMeta.verificationStatus ?? "APPROVED",
      notes: sourceMeta.notes ?? null,
    },
    update: {
      lastUpdatedAt: new Date(),
      ...(sourceMeta.publishedAt ? { publishedAt: sourceMeta.publishedAt } : {}),
      ...(sourceMeta.notes ? { notes: sourceMeta.notes } : {}),
    },
  });

  const timelineFps = Array.from(new Set(batch.timelines.map((t) => t.dedupeFingerprint)));
  const existingTimelines = timelineFps.length
    ? await prisma.externalTimelineObservation.findMany({
        where: { dedupeFingerprint: { in: timelineFps } },
        select: { dedupeFingerprint: true },
      })
    : [];
  const seenTimelineFps = new Set(existingTimelines.map((r) => r.dedupeFingerprint));

  let duplicatesSkipped = 0;
  let conflictingFlagged = 0;
  const timelineCreates: Prisma.ExternalTimelineObservationCreateManyInput[] = [];

  for (const obs of batch.timelines) {
    if (seenTimelineFps.has(obs.dedupeFingerprint)) {
      duplicatesSkipped++;
      continue;
    }
    seenTimelineFps.add(obs.dedupeFingerprint);

    const validation = validateTimelineObservation(obs);
    if (validation.status === "CONFLICTING") conflictingFlagged++;

    const verificationStatus: EvidenceVerificationStatus =
      validation.status === "CONFLICTING"
        ? "CONFLICTING"
        : options.approveAllValid
          ? "APPROVED"
          : validation.status;

    timelineCreates.push({
      sourceId: source.id,
      embassy: obs.embassy,
      visaCategory: obs.visaCategory,
      waitingListJoinedDate: obs.waitingListJoinedDate,
      submissionInvitedDate: obs.submissionInvitedDate,
      documentsSubmittedDate: obs.documentsSubmittedDate,
      preliminaryReviewDate: obs.preliminaryReviewDate,
      correctionRequestDates: obs.correctionRequestDates,
      correctionResponseDates: obs.correctionResponseDates,
      correctionAcceptedDate: obs.correctionAcceptedDate,
      appointmentInvitedDate: obs.appointmentInvitedDate,
      appointmentBookedDate: obs.appointmentBookedDate,
      appointmentAttendedDate: obs.appointmentAttendedDate,
      decisionDate: obs.decisionDate,
      decisionOutcome: obs.decisionOutcome,
      passportDispatchedDate: obs.passportDispatchedDate,
      passportReceivedDate: obs.passportReceivedDate,
      reportPublishedAt: obs.reportPublishedAt,
      datePrecision: obs.datePrecision,
      confidence: obs.confidence,
      verificationStatus,
      dedupeFingerprint: obs.dedupeFingerprint,
      conflictNotes: validation.conflictNotes,
      rawExcerpt: obs.rawExcerpt,
    });
  }

  let insertedTimelines = 0;
  if (timelineCreates.length > 0) {
    const res = await prisma.externalTimelineObservation.createMany({
      data: timelineCreates,
      skipDuplicates: true,
    });
    insertedTimelines = res.count;
  }

  const queueFps = Array.from(new Set(batch.queueObservations.map((q) => q.dedupeFingerprint)));
  const existingQueue = queueFps.length
    ? await prisma.queueObservation.findMany({
        where: { dedupeFingerprint: { in: queueFps } },
        select: { dedupeFingerprint: true },
      })
    : [];
  const seenQueueFps = new Set(existingQueue.map((r) => r.dedupeFingerprint));

  const queueCreates: Prisma.QueueObservationCreateManyInput[] = [];
  for (const q of batch.queueObservations) {
    if (seenQueueFps.has(q.dedupeFingerprint)) {
      duplicatesSkipped++;
      continue;
    }
    seenQueueFps.add(q.dedupeFingerprint);

    const validation = validateQueueObservation(q);
    if (validation.status === "CONFLICTING") conflictingFlagged++;

    queueCreates.push({
      sourceId: source.id,
      embassy: q.embassy,
      visaCategory: q.visaCategory,
      observationDate: q.observationDate,
      queueType: q.queueType,
      observedFrontierDate: q.observedFrontierDate,
      sampleSize: q.sampleSize,
      reportedSubmissions: q.reportedSubmissions,
      reportedCorrections: q.reportedCorrections,
      reportedAppointments: q.reportedAppointments,
      reportedActivityCount: q.reportedActivityCount,
      confidence: q.confidence,
      verificationStatus: validation.status,
      dedupeFingerprint: q.dedupeFingerprint,
      notes: validation.conflictNotes ? `${q.notes} [Conflict: ${validation.conflictNotes}]` : q.notes,
    });
  }

  let insertedQueue = 0;
  if (queueCreates.length > 0) {
    const res = await prisma.queueObservation.createMany({
      data: queueCreates,
      skipDuplicates: true,
    });
    insertedQueue = res.count;
  }

  return {
    sourceId: source.id,
    totalParsedTimelines: batch.timelines.length,
    totalParsedQueue: batch.queueObservations.length,
    insertedTimelines,
    insertedQueue,
    duplicatesSkipped,
    conflictingFlagged,
    excludedCount: batch.excludedCount,
  };
}
