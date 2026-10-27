-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "University" ADD COLUMN     "doctorateRight" BOOLEAN,
ADD COLUMN     "foundedYear" INTEGER,
ADD COLUMN     "hrkNumber" INTEGER,
ADD COLUMN     "institutionType" TEXT,
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "lockedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "shortName" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "sponsorship" TEXT,
ADD COLUMN     "studentCount" INTEGER,
ADD COLUMN     "websiteCheckedAt" TIMESTAMP(3),
ADD COLUMN     "websiteStatus" INTEGER,
ADD COLUMN     "wikidataId" TEXT;

-- AlterTable
ALTER TABLE "Programme" ADD COLUMN     "applicationMethod" TEXT,
ADD COLUMN     "applicationUrl" TEXT,
ADD COLUMN     "lockedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pendingChange" JSONB,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "tuitionNote" TEXT,
ADD COLUMN     "verification" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "total" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "log" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "startedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_kind_status_idx" ON "ImportJob"("kind", "status");

-- CreateIndex
CREATE INDEX "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "University_hrkNumber_key" ON "University"("hrkNumber");

-- CreateIndex
CREATE UNIQUE INDEX "University_wikidataId_key" ON "University"("wikidataId");

-- CreateIndex
CREATE INDEX "Programme_verification_idx" ON "Programme"("verification");

-- CreateIndex
CREATE UNIQUE INDEX "Programme_universityId_name_degreeLevel_key" ON "Programme"("universityId", "name", "degreeLevel");

