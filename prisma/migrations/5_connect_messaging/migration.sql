CREATE TYPE "ProfileVisibility" AS ENUM ('NAMED','ANONYMOUS','PRIVATE');
CREATE TYPE "ConversationStatus" AS ENUM ('PENDING','ACCEPTED','DECLINED');

CREATE TABLE "StudentProfile" (
  "id" TEXT PRIMARY KEY,
  "applicantId" TEXT NOT NULL UNIQUE REFERENCES "Applicant"("id") ON DELETE CASCADE,
  "displayName" TEXT NOT NULL,
  "university" TEXT,
  "program" TEXT,
  "degreeLevel" TEXT,
  "intakeSeason" TEXT,
  "intakeYear" INTEGER,
  "originCity" TEXT,
  "destinationCity" TEXT,
  "consulate" TEXT,
  "visaStatus" "VisaStatus",
  "inGermany" BOOLEAN NOT NULL DEFAULT false,
  "bio" VARCHAR(300),
  "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
  "allowMessages" BOOLEAN NOT NULL DEFAULT true,
  "showEmail" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "StudentProfile_visibility_university_idx" ON "StudentProfile"("visibility","university");
CREATE INDEX "StudentProfile_visibility_destinationCity_idx" ON "StudentProfile"("visibility","destinationCity");
CREATE INDEX "StudentProfile_visibility_intakeYear_intakeSeason_idx" ON "StudentProfile"("visibility","intakeYear","intakeSeason");

CREATE TABLE "Conversation" (
  "id" TEXT PRIMARY KEY,
  "pairKey" TEXT NOT NULL UNIQUE,
  "status" "ConversationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ConversationParticipant" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "applicantId" TEXT NOT NULL REFERENCES "Applicant"("id") ON DELETE CASCADE,
  "lastReadAt" TIMESTAMP(3),
  UNIQUE("conversationId","applicantId")
);

CREATE INDEX "ConversationParticipant_applicantId_conversationId_idx" ON "ConversationParticipant"("applicantId","conversationId");

CREATE TABLE "Message" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "senderId" TEXT NOT NULL REFERENCES "Applicant"("id") ON DELETE CASCADE,
  "clientMessageId" TEXT NOT NULL,
  "content" VARCHAR(4000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("senderId","clientMessageId")
);

CREATE INDEX "Message_conversationId_createdAt_id_idx" ON "Message"("conversationId","createdAt","id");

CREATE TABLE "UserBlock" (
  "id" TEXT PRIMARY KEY,
  "blockerId" TEXT NOT NULL REFERENCES "Applicant"("id") ON DELETE CASCADE,
  "blockedId" TEXT NOT NULL REFERENCES "Applicant"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("blockerId","blockedId")
);

CREATE TABLE "UserReport" (
  "id" TEXT PRIMARY KEY,
  "reporterId" TEXT NOT NULL REFERENCES "Applicant"("id") ON DELETE CASCADE,
  "reportedId" TEXT NOT NULL REFERENCES "Applicant"("id") ON DELETE CASCADE,
  "conversationId" TEXT,
  "messageId" TEXT,
  "reason" VARCHAR(1000) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "UserReport_reporterId_idx" ON "UserReport"("reporterId");
CREATE INDEX "UserReport_reportedId_idx" ON "UserReport"("reportedId");
