BEGIN;

-- Existing rows remain active (NULL); no records or history are removed.
-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StatusEvent" ALTER COLUMN "applicantId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Applicant_deletedAt_idx" ON "Applicant"("deletedAt");

-- CreateIndex
CREATE INDEX "Announcement_deletedAt_idx" ON "Announcement"("deletedAt");

COMMIT;
