import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashIp } from "./audit-log";
import {
  getAdminSessionPolicy,
  getApplicantSessionPolicy,
  SESSION_TOUCH_INTERVAL_MS,
} from "./session-policy";

export type AuthSubjectTypeValue = "APPLICANT" | "ADMIN";

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashOpaqueToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function isValidOpaqueTokenFormat(token: string | undefined | null): token is string {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}

export async function createServerSession(input: {
  subjectType: AuthSubjectTypeValue;
  applicantId?: string;
  adminUserId?: string;
  authMethod: string;
  mfaVerifiedAt?: Date | null;
  amr?: string[];
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ rawToken: string; sessionId: string; idleExpiresAt: Date; absoluteExpiresAt: Date }> {
  const rawToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);
  const now = new Date();
  const policy =
    input.subjectType === "ADMIN" ? getAdminSessionPolicy() : getApplicantSessionPolicy();
  const idleExpiresAt = new Date(now.getTime() + policy.idleMs);
  const absoluteExpiresAt = new Date(now.getTime() + policy.absoluteMs);

  const session = await prisma.authSession.create({
    data: {
      tokenHash,
      subjectType: input.subjectType,
      applicantId: input.subjectType === "APPLICANT" ? input.applicantId ?? null : null,
      adminUserId: input.subjectType === "ADMIN" ? input.adminUserId ?? null : null,
      authMethod: input.authMethod,
      mfaVerifiedAt: input.mfaVerifiedAt ?? null,
      amr: input.amr ?? [input.authMethod],
      userAgent: input.userAgent ? input.userAgent.slice(0, 240) : null,
      ipHash: hashIp(input.ip),
      lastActivityAt: now,
      idleExpiresAt,
      absoluteExpiresAt,
    },
    select: { id: true, idleExpiresAt: true, absoluteExpiresAt: true },
  });

  return {
    rawToken,
    sessionId: session.id,
    idleExpiresAt: session.idleExpiresAt,
    absoluteExpiresAt: session.absoluteExpiresAt,
  };
}

export type ValidatedApplicantSession = {
  kind: "applicant";
  sessionId: string;
  applicantId: string;
  publicId: string;
  authMethod: string;
  createdAt: Date;
};

export type ValidatedAdminSession = {
  kind: "admin";
  sessionId: string;
  adminUserId: string;
  email: string;
  role: string;
  authMethod: string;
  mfaVerifiedAt: Date | null;
  createdAt: Date;
};

export async function validateServerSession(
  rawToken: string | undefined | null,
  expectedType: "APPLICANT",
  opts?: { touch?: boolean }
): Promise<ValidatedApplicantSession | null>;
export async function validateServerSession(
  rawToken: string | undefined | null,
  expectedType: "ADMIN",
  opts?: { touch?: boolean; requireFreshMfaMs?: number }
): Promise<ValidatedAdminSession | null>;
export async function validateServerSession(
  rawToken: string | undefined | null,
  expectedType: AuthSubjectTypeValue,
  opts?: { touch?: boolean; requireFreshMfaMs?: number }
): Promise<ValidatedApplicantSession | ValidatedAdminSession | null> {
  if (!isValidOpaqueTokenFormat(rawToken)) return null;

  const tokenHash = hashOpaqueToken(rawToken);
  const record = await prisma.authSession.findUnique({
    where: { tokenHash },
    include: {
      applicant: {
        select: { id: true, publicId: true, disabledAt: true },
      },
      adminUser: {
        select: { id: true, email: true, role: true, disabledAt: true, totpEnabledAt: true },
      },
    },
  });

  if (!record) return null;
  if (record.subjectType !== expectedType) return null;
  if (record.revokedAt) return null;

  const now = new Date();
  if (now > record.absoluteExpiresAt || now > record.idleExpiresAt) {
    await prisma.authSession
      .updateMany({
        where: { id: record.id, revokedAt: null },
        data: {
          revokedAt: now,
          revokedReason: now > record.absoluteExpiresAt ? "ABSOLUTE_EXPIRED" : "IDLE_EXPIRED",
        },
      })
      .catch(() => {});
    return null;
  }

  if (expectedType === "APPLICANT") {
    if (!record.applicant || record.applicant.disabledAt) return null;
    if (opts?.touch !== false && now.getTime() - record.lastActivityAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
      const { idleMs } = getApplicantSessionPolicy();
      const nextIdle = new Date(Math.min(record.absoluteExpiresAt.getTime(), now.getTime() + idleMs));
      await prisma.authSession
        .updateMany({
          where: { id: record.id, revokedAt: null },
          data: { lastActivityAt: now, idleExpiresAt: nextIdle },
        })
        .catch(() => {});
    }
    return {
      kind: "applicant",
      sessionId: record.id,
      applicantId: record.applicant.id,
      publicId: record.applicant.publicId,
      authMethod: record.authMethod,
      createdAt: record.createdAt,
    };
  }

  // ADMIN validation: strict server-side role + MFA enforcement
  if (!record.adminUser || record.adminUser.disabledAt) return null;
  if (!record.adminUser.totpEnabledAt || !record.mfaVerifiedAt) return null;
  if (opts?.requireFreshMfaMs) {
    const ageMs = now.getTime() - record.mfaVerifiedAt.getTime();
    if (ageMs > opts.requireFreshMfaMs) return null;
  }

  if (opts?.touch !== false && now.getTime() - record.lastActivityAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
    const { idleMs } = getAdminSessionPolicy();
    const nextIdle = new Date(Math.min(record.absoluteExpiresAt.getTime(), now.getTime() + idleMs));
    await prisma.authSession
      .updateMany({
        where: { id: record.id, revokedAt: null },
        data: { lastActivityAt: now, idleExpiresAt: nextIdle },
      })
      .catch(() => {});
  }

  return {
    kind: "admin",
    sessionId: record.id,
    adminUserId: record.adminUser.id,
    email: record.adminUser.email,
    role: record.adminUser.role,
    authMethod: record.authMethod,
    mfaVerifiedAt: record.mfaVerifiedAt,
    createdAt: record.createdAt,
  };
}

export async function revokeServerSessionByToken(rawToken: string | undefined | null, reason: string): Promise<boolean> {
  if (!isValidOpaqueTokenFormat(rawToken)) return false;
  const tokenHash = hashOpaqueToken(rawToken);
  const now = new Date();
  const res = await prisma.authSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: now, revokedReason: reason },
  });
  return res.count > 0;
}

export async function revokeSessionById(
  sessionId: string,
  subjectType: AuthSubjectTypeValue,
  subjectId: string,
  reason: string
): Promise<boolean> {
  const now = new Date();
  const where =
    subjectType === "APPLICANT"
      ? { id: sessionId, subjectType, applicantId: subjectId, revokedAt: null }
      : { id: sessionId, subjectType, adminUserId: subjectId, revokedAt: null };
  const res = await prisma.authSession.updateMany({
    where,
    data: { revokedAt: now, revokedReason: reason },
  });
  return res.count > 0;
}

export async function revokeAllSessionsForSubject(
  subjectType: AuthSubjectTypeValue,
  subjectId: string,
  reason: string,
  exceptSessionId?: string
): Promise<number> {
  const now = new Date();
  const where =
    subjectType === "APPLICANT"
      ? {
          subjectType,
          applicantId: subjectId,
          revokedAt: null,
          ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
        }
      : {
          subjectType,
          adminUserId: subjectId,
          revokedAt: null,
          ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
        };
  const res = await prisma.authSession.updateMany({
    where,
    data: { revokedAt: now, revokedReason: reason },
  });
  return res.count;
}

export function summarizeUserAgent(ua: string | null): string {
  if (!ua) return "Browser session";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua) && !/Chromium/.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua) && !/Chrome\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Device";
  return `${browser} on ${os}`;
}

export async function listActiveSessionsForSubject(
  subjectType: AuthSubjectTypeValue,
  subjectId: string,
  currentSessionId?: string
) {
  const now = new Date();
  const where =
    subjectType === "APPLICANT"
      ? { subjectType, applicantId: subjectId, revokedAt: null, idleExpiresAt: { gt: now }, absoluteExpiresAt: { gt: now } }
      : { subjectType, adminUserId: subjectId, revokedAt: null, idleExpiresAt: { gt: now }, absoluteExpiresAt: { gt: now } };

  const rows = await prisma.authSession.findMany({
    where,
    orderBy: { lastActivityAt: "desc" },
    select: {
      id: true,
      authMethod: true,
      userAgent: true,
      createdAt: true,
      lastActivityAt: true,
      idleExpiresAt: true,
      absoluteExpiresAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    deviceLabel: summarizeUserAgent(r.userAgent),
    authMethod: r.authMethod,
    createdAt: r.createdAt.toISOString(),
    lastActivityAt: r.lastActivityAt.toISOString(),
    expiresAt: r.absoluteExpiresAt.toISOString(),
    isCurrent: r.id === currentSessionId,
  }));
}
