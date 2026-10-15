-- CreateEnum
CREATE TYPE "ApprovalState" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VisaStatus" AS ENUM ('WAITING_LIST', 'WAITING_FOR_SUBMISSION', 'SUBMISSION_RECEIVED', 'UNDER_CORRECTION', 'APPOINTMENT_SCHEDULED', 'PROCESSING', 'VISA_ISSUED', 'VISA_REJECTED', 'WITHDRAWN', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "accessCodeHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "gender" "Gender",
    "city" TEXT,
    "province" TEXT,
    "university" TEXT,
    "program" TEXT,
    "intake" TEXT,
    "visaType" TEXT,
    "consulate" TEXT NOT NULL DEFAULT 'Islamabad',
    "waitingListCategory" TEXT,
    "sourceOfInformation" TEXT,
    "additionalDocuments" TEXT,
    "notes" TEXT,
    "waitingListDate" TIMESTAMP(3),
    "submissionInviteDate" TIMESTAMP(3),
    "documentSubmissionDate" TIMESTAMP(3),
    "correctionRequestDate" TIMESTAMP(3),
    "correctionSubmittedDate" TIMESTAMP(3),
    "appointmentDate" TIMESTAMP(3),
    "interviewDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "visaStatus" "VisaStatus" NOT NULL DEFAULT 'WAITING_LIST',
    "approval" "ApprovalState" NOT NULL DEFAULT 'PENDING_REVIEW',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusEvent" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "visaStatus" "VisaStatus" NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "consulate" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_publicId_key" ON "Applicant"("publicId");

-- CreateIndex
CREATE INDEX "Applicant_approval_idx" ON "Applicant"("approval");

-- CreateIndex
CREATE INDEX "Applicant_visaStatus_idx" ON "Applicant"("visaStatus");

-- CreateIndex
CREATE INDEX "Applicant_university_idx" ON "Applicant"("university");

-- CreateIndex
CREATE INDEX "Applicant_consulate_idx" ON "Applicant"("consulate");

-- CreateIndex
CREATE INDEX "StatusEvent_applicantId_idx" ON "StatusEvent"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "StatusEvent" ADD CONSTRAINT "StatusEvent_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
