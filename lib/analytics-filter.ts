import type { Prisma } from "@prisma/client";
import { TEAM_PUBLIC_ID } from "@/lib/listings";

/**
 * Canonical filter for real, community-approved applicant records used across
 * public overview, analytics, queue intelligence, estimator, and queue ranking.
 * Excludes unapproved submissions, internal team placeholders, and demo/test entries.
 */
export const ELIGIBLE_PUBLIC_APPLICANT_WHERE: Prisma.ApplicantWhereInput = {
  approval: "APPROVED",
  NOT: [
    { publicId: TEAM_PUBLIC_ID },
    { publicId: { startsWith: "DEMO-", mode: "insensitive" } },
    { publicId: { startsWith: "TEST-", mode: "insensitive" } },
    { email: { endsWith: "@example.com", mode: "insensitive" } },
  ],
};

export function isEligiblePublicRecord(record: {
  publicId?: string | null;
  email?: string | null;
  approval?: string | null;
}): boolean {
  if (record.approval !== "APPROVED") return false;
  const pid = (record.publicId || "").trim().toUpperCase();
  if (!pid || pid === TEAM_PUBLIC_ID || pid.startsWith("DEMO-") || pid.startsWith("TEST-")) {
    return false;
  }
  const email = (record.email || "").trim().toLowerCase();
  if (email.endsWith("@example.com")) {
    return false;
  }
  return true;
}
