BEGIN;

-- Existing rows remain active (NULL); no records or history are removed.
-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StatusEvent" ALTER COLUMN "applicantId" DROP NOT NULL;
ALTER TABLE "StatusEvent" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Applicant_deletedAt_idx" ON "Applicant"("deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Announcement_deletedAt_idx" ON "Announcement"("deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StatusEvent_deletedAt_idx" ON "StatusEvent"("deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminUser_deletedAt_idx" ON "AdminUser"("deletedAt");

COMMIT;
