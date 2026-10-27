-- CreateEnum
CREATE TYPE "ListingKind" AS ENUM ('OFFERING', 'SEEKING');

-- CreateEnum
CREATE TYPE "GenderPreference" AS ENUM ('ANY', 'FEMALE', 'MALE');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "anmeldung" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "genderPreference" "GenderPreference" NOT NULL DEFAULT 'ANY',
ADD COLUMN     "kind" "ListingKind" NOT NULL DEFAULT 'OFFERING',
ADD COLUMN     "minStayMonths" INTEGER,
ADD COLUMN     "sizeSqm" INTEGER,
ALTER COLUMN "rentEur" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Listing_status_kind_idx" ON "Listing"("status", "kind");

