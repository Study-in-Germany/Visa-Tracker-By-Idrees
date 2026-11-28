-- Additive migration: Server-backed sessions, single-use auth grants, admin MFA & recovery codes,
-- persistent rate limiting, and sanitized security audit logs.
-- Preserves 100% of existing rows, Tracking IDs, credentials, and relations.

ALTER TABLE "Applicant"
  ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3);

ALTER TABLE "AdminUser"
  ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "totpSecretEnc" TEXT,
  ADD COLUMN IF NOT EXISTS "totpEnabledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mfaUpdatedAt" TIMESTAMP(3);

DO $$ BEGIN CREATE TYPE "AuthSubjectType" AS ENUM ('APPLICANT', 'ADMIN'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "AuthGrantPurpose" AS ENUM ('RECOVERY', 'OTP_SELECT', 'ADMIN_MFA_CHALLENGE', 'ADMIN_MFA_ENROLL'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "AuthSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "subjectType" "AuthSubjectType" NOT NULL,
  "applicantId" TEXT,
  "adminUserId" TEXT,
  "authMethod" TEXT NOT NULL,
  "mfaVerifiedAt" TIMESTAMP(3),
  "amr" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "userAgent" TEXT,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "idleExpiresAt" TIMESTAMP(3) NOT NULL,
  "absoluteExpiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedReason" TEXT,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthSession_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AuthSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "AuthSession_applicantId_revokedAt_idx" ON "AuthSession"("applicantId", "revokedAt");
CREATE INDEX IF NOT EXISTS "AuthSession_adminUserId_revokedAt_idx" ON "AuthSession"("adminUserId", "revokedAt");
CREATE INDEX IF NOT EXISTS "AuthSession_absoluteExpiresAt_idx" ON "AuthSession"("absoluteExpiresAt");

CREATE TABLE IF NOT EXISTS "AuthGrant" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "purpose" "AuthGrantPurpose" NOT NULL,
  "email" TEXT NOT NULL,
  "subjectIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "adminUserId" TEXT,
  "payload" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthGrant_tokenHash_key" ON "AuthGrant"("tokenHash");
CREATE INDEX IF NOT EXISTS "AuthGrant_expiresAt_idx" ON "AuthGrant"("expiresAt");
CREATE INDEX IF NOT EXISTS "AuthGrant_purpose_email_idx" ON "AuthGrant"("purpose", "email");

CREATE TABLE IF NOT EXISTS "AdminRecoveryCode" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminRecoveryCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminRecoveryCode_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AdminRecoveryCode_adminUserId_usedAt_idx" ON "AdminRecoveryCode"("adminUserId", "usedAt");

CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

CREATE TABLE IF NOT EXISTS "AuthAuditLog" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "targetId" TEXT,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuthAuditLog_eventType_createdAt_idx" ON "AuthAuditLog"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "AuthAuditLog_actorId_createdAt_idx" ON "AuthAuditLog"("actorId", "createdAt");
