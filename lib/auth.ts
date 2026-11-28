import {
  ADMIN_SESSION_COOKIE_NAME,
  APPLICANT_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  buildExpiredCookieOptions,
  buildSessionCookieOptions,
} from "@/lib/auth/session-policy";
import {
  getAdminSession,
  getApplicantSession,
} from "@/lib/auth/authorization";
import {
  createServerSession,
  isValidOpaqueTokenFormat,
  revokeServerSessionByToken,
  validateServerSession,
} from "@/lib/auth/session-store";

export {
  ADMIN_SESSION_COOKIE_NAME,
  APPLICANT_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  buildExpiredCookieOptions,
  isValidOpaqueTokenFormat,
  revokeServerSessionByToken,
};

// ---------- Admin session ----------

export async function createAdminSession(input: {
  adminUserId: string;
  authMethod: string;
  mfaVerifiedAt: Date;
  amr?: string[];
  ip?: string | null;
  userAgent?: string | null;
}) {
  return createServerSession({
    subjectType: "ADMIN",
    adminUserId: input.adminUserId,
    authMethod: input.authMethod,
    mfaVerifiedAt: input.mfaVerifiedAt,
    amr: input.amr,
    ip: input.ip,
    userAgent: input.userAgent,
  });
}

export async function getSession(opts?: { touch?: boolean; requireFreshMfaMs?: number }) {
  return getAdminSession(opts);
}

export async function verifySessionToken(token: string) {
  return validateServerSession(token, "ADMIN", { touch: false });
}

export function sessionCookieOptions() {
  return buildSessionCookieOptions("admin");
}

// ---------- Applicant session ----------

export async function createApplicantSession(input: {
  applicantId: string;
  authMethod: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  return createServerSession({
    subjectType: "APPLICANT",
    applicantId: input.applicantId,
    authMethod: input.authMethod,
    amr: [input.authMethod],
    ip: input.ip,
    userAgent: input.userAgent,
  });
}

export async function verifyApplicantSessionToken(token: string) {
  return validateServerSession(token, "APPLICANT", { touch: false });
}

export { getApplicantSession };

export function applicantSessionCookieOptions() {
  return buildSessionCookieOptions("applicant");
}
