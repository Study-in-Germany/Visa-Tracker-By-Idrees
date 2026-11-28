import { prisma } from "@/lib/db";
import { generateOpaqueToken, hashOpaqueToken, isValidOpaqueTokenFormat } from "./session-store";

export type AuthGrantPurposeValue =
  | "RECOVERY"
  | "OTP_SELECT"
  | "ADMIN_MFA_CHALLENGE"
  | "ADMIN_MFA_ENROLL";

export async function createAuthGrant(input: {
  purpose: AuthGrantPurposeValue;
  email: string;
  subjectIds: string[];
  adminUserId?: string | null;
  payload?: Record<string, unknown>;
  ttlMs: number;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);
  const expiresAt = new Date(Date.now() + input.ttlMs);

  await prisma.authGrant.create({
    data: {
      tokenHash,
      purpose: input.purpose,
      email: input.email.trim().toLowerCase(),
      subjectIds: input.subjectIds,
      adminUserId: input.adminUserId ?? null,
      payload: (input.payload ?? undefined) as any,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

export async function peekAuthGrant(
  rawToken: string | undefined | null,
  expectedPurpose: AuthGrantPurposeValue
) {
  if (!isValidOpaqueTokenFormat(rawToken)) return null;
  const tokenHash = hashOpaqueToken(rawToken);
  const now = new Date();
  const grant = await prisma.authGrant.findUnique({ where: { tokenHash } });
  if (!grant) return null;
  if (grant.purpose !== expectedPurpose) return null;
  if (grant.consumedAt !== null || grant.expiresAt <= now) return null;
  return grant;
}

export async function updateAuthGrantPayload(
  grantId: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const now = new Date();
  const res = await prisma.authGrant.updateMany({
    where: { id: grantId, consumedAt: null, expiresAt: { gt: now } },
    data: { payload: payload as any },
  });
  return res.count > 0;
}

/**
 * Atomically consumes a single-use grant inside a conditional UPDATE.
 * Concurrent replays will get `null` on the second caller.
 */
export async function consumeAuthGrant(
  rawToken: string | undefined | null,
  expectedPurpose: AuthGrantPurposeValue
) {
  if (!isValidOpaqueTokenFormat(rawToken)) return null;
  const tokenHash = hashOpaqueToken(rawToken);
  const now = new Date();

  const existing = await prisma.authGrant.findUnique({ where: { tokenHash } });
  if (!existing || existing.purpose !== expectedPurpose || existing.consumedAt || existing.expiresAt <= now) {
    return null;
  }

  const claimed = await prisma.authGrant.updateMany({
    where: {
      id: existing.id,
      purpose: expectedPurpose,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    data: { consumedAt: now },
  });

  if (claimed.count === 0) return null;
  return existing;
}
