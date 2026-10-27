-- CreateEnum
CREATE TYPE "ApplicationRoute" AS ENUM ('DIRECT', 'UNI_ASSIST', 'VPD', 'OTHER');

-- AlterTable
ALTER TABLE "Programme" ADD COLUMN     "admissionRestricted" BOOLEAN,
ADD COLUMN     "applicationRoute" "ApplicationRoute",
ADD COLUMN     "daadId" INTEGER,
ADD COLUMN     "daadUrl" TEXT,
ADD COLUMN     "durationSemesters" INTEGER,
ADD COLUMN     "ectsRequired" INTEGER,
ADD COLUMN     "euSummerDeadline" TIMESTAMP(3),
ADD COLUMN     "euWinterDeadline" TIMESTAMP(3),
ADD COLUMN     "field" TEXT,
ADD COLUMN     "ieltsMinSection" DOUBLE PRECISION,
ADD COLUMN     "ieltsOverall" DOUBLE PRECISION,
ADD COLUMN     "languageCertificates" TEXT,
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "linkStatus" INTEGER,
ADD COLUMN     "minGpaNote" TEXT,
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "requirements" TEXT,
ADD COLUMN     "requiresGre" BOOLEAN,
ADD COLUMN     "semesterContributionEur" INTEGER,
ADD COLUMN     "tuitionFeeEur" INTEGER,
ADD COLUMN     "tuitionFree" BOOLEAN,
ADD COLUMN     "workExperienceNote" TEXT;

-- CreateIndex
CREATE INDEX "Programme_field_idx" ON "Programme"("field");

-- CreateIndex
CREATE INDEX "Programme_applicationRoute_idx" ON "Programme"("applicationRoute");

-- CreateIndex
CREATE INDEX "Programme_daadId_idx" ON "Programme"("daadId");

