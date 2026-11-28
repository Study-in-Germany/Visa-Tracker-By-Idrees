-- Additive migration: Normalized Applicant milestones + Supplementary Evidence & Forecasting tables
-- Preserves 100% of existing rows, credentials, and relations.

ALTER TABLE "Applicant"
  ADD COLUMN IF NOT EXISTS "preliminaryReviewDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "correctionAcceptedDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "appointmentInviteDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "passportDispatchedDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "passportReceivedDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastConfirmedAt" TIMESTAMP(3);

DO $$ BEGIN CREATE TYPE "EvidenceSourceType" AS ENUM ('WHATSAPP_EXPORT', 'CHANNEL_EXPORT', 'COMMUNITY_PLATFORM', 'CSV_IMPORT', 'JSON_IMPORT', 'MANUAL_ADMIN', 'OFFICIAL_GUIDANCE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EvidenceReliability" AS ENUM ('OFFICIAL', 'VERIFIED_COMMUNITY', 'COMMUNITY_PLATFORM', 'CROWD_REPORT', 'UNVERIFIED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "EvidenceVerificationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'CONFLICTING', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DatePrecision" AS ENUM ('EXACT', 'INFERRED_YEAR', 'MONTH_ONLY', 'APPROXIMATE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "QueueObservationType" AS ENUM ('SUBMISSION_FRONTIER', 'APPOINTMENT_SUBMISSION_FRONTIER', 'APPOINTMENT_WL_COHORT_FRONTIER'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "EvidenceSource" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sourceType" "EvidenceSourceType" NOT NULL,
  "sourceRef" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reliability" "EvidenceReliability" NOT NULL DEFAULT 'CROWD_REPORT',
  "usagePermission" TEXT NOT NULL DEFAULT 'COMMUNITY_EXPORT_ANALYTICS',
  "verificationStatus" "EvidenceVerificationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EvidenceSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EvidenceSource_sourceRef_key" ON "EvidenceSource"("sourceRef");
CREATE INDEX IF NOT EXISTS "EvidenceSource_sourceType_idx" ON "EvidenceSource"("sourceType");
CREATE INDEX IF NOT EXISTS "EvidenceSource_verificationStatus_idx" ON "EvidenceSource"("verificationStatus");

CREATE TABLE IF NOT EXISTS "ExternalTimelineObservation" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "embassy" TEXT NOT NULL,
  "visaCategory" TEXT NOT NULL DEFAULT 'Study',
  "waitingListJoinedDate" TIMESTAMP(3),
  "submissionInvitedDate" TIMESTAMP(3),
  "documentsSubmittedDate" TIMESTAMP(3),
  "preliminaryReviewDate" TIMESTAMP(3),
  "correctionRequestDates" JSONB,
  "correctionResponseDates" JSONB,
  "correctionAcceptedDate" TIMESTAMP(3),
  "appointmentInvitedDate" TIMESTAMP(3),
  "appointmentBookedDate" TIMESTAMP(3),
  "appointmentAttendedDate" TIMESTAMP(3),
  "decisionDate" TIMESTAMP(3),
  "decisionOutcome" TEXT,
  "passportDispatchedDate" TIMESTAMP(3),
  "passportReceivedDate" TIMESTAMP(3),
  "reportPublishedAt" TIMESTAMP(3) NOT NULL,
  "datePrecision" "DatePrecision" NOT NULL DEFAULT 'EXACT',
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
  "verificationStatus" "EvidenceVerificationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "dedupeFingerprint" TEXT NOT NULL,
  "conflictNotes" TEXT,
  "rawExcerpt" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalTimelineObservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExternalTimelineObservation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "EvidenceSource"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExternalTimelineObservation_dedupeFingerprint_key" ON "ExternalTimelineObservation"("dedupeFingerprint");
CREATE INDEX IF NOT EXISTS "ExternalTimelineObservation_embassy_verificationStatus_idx" ON "ExternalTimelineObservation"("embassy", "verificationStatus");
CREATE INDEX IF NOT EXISTS "ExternalTimelineObservation_visaCategory_verificationStatus_idx" ON "ExternalTimelineObservation"("visaCategory", "verificationStatus");
CREATE INDEX IF NOT EXISTS "ExternalTimelineObservation_reportPublishedAt_idx" ON "ExternalTimelineObservation"("reportPublishedAt");
CREATE INDEX IF NOT EXISTS "ExternalTimelineObservation_waitingListJoinedDate_idx" ON "ExternalTimelineObservation"("waitingListJoinedDate");
CREATE INDEX IF NOT EXISTS "ExternalTimelineObservation_sourceId_idx" ON "ExternalTimelineObservation"("sourceId");

CREATE TABLE IF NOT EXISTS "QueueObservation" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "embassy" TEXT NOT NULL,
  "visaCategory" TEXT NOT NULL DEFAULT 'Study',
  "observationDate" TIMESTAMP(3) NOT NULL,
  "queueType" "QueueObservationType" NOT NULL,
  "observedFrontierDate" TIMESTAMP(3) NOT NULL,
  "sampleSize" INTEGER,
  "reportedSubmissions" INTEGER,
  "reportedCorrections" INTEGER,
  "reportedAppointments" INTEGER,
  "reportedActivityCount" INTEGER,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
  "verificationStatus" "EvidenceVerificationStatus" NOT NULL DEFAULT 'APPROVED',
  "dedupeFingerprint" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QueueObservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QueueObservation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "EvidenceSource"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "QueueObservation_dedupeFingerprint_key" ON "QueueObservation"("dedupeFingerprint");
CREATE INDEX IF NOT EXISTS "QueueObservation_embassy_queueType_observationDate_idx" ON "QueueObservation"("embassy", "queueType", "observationDate");
CREATE INDEX IF NOT EXISTS "QueueObservation_verificationStatus_idx" ON "QueueObservation"("verificationStatus");
CREATE INDEX IF NOT EXISTS "QueueObservation_sourceId_idx" ON "QueueObservation"("sourceId");

CREATE TABLE IF NOT EXISTS "ForecastSnapshot" (
  "id" TEXT NOT NULL,
  "applicantId" TEXT,
  "modelVersion" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "embassy" TEXT NOT NULL,
  "visaCategory" TEXT NOT NULL DEFAULT 'Study',
  "inputJoinDate" TIMESTAMP(3) NOT NULL,
  "predictedMilestone" TEXT NOT NULL,
  "p10Date" TIMESTAMP(3),
  "p25Date" TIMESTAMP(3),
  "p50Date" TIMESTAMP(3),
  "p75Date" TIMESTAMP(3),
  "p90Date" TIMESTAMP(3),
  "sourcesSummary" JSONB NOT NULL,
  "sampleSize" INTEGER NOT NULL DEFAULT 0,
  "effectiveSampleSize" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "confidenceLevel" TEXT NOT NULL,
  "actualOutcomeDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ForecastSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ForecastSnapshot_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ForecastSnapshot_applicantId_generatedAt_idx" ON "ForecastSnapshot"("applicantId", "generatedAt");
CREATE INDEX IF NOT EXISTS "ForecastSnapshot_embassy_modelVersion_idx" ON "ForecastSnapshot"("embassy", "modelVersion");
CREATE INDEX IF NOT EXISTS "ForecastSnapshot_generatedAt_idx" ON "ForecastSnapshot"("generatedAt");
