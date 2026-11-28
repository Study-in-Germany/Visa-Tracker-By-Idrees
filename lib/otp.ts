import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";

export type OtpPurposeValue = "LOGIN" | "RECOVERY" | "EMAIL_VERIFY";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_ACCOUNT_WINDOW_MS = 15 * 60 * 1000;
export const OTP_ACCOUNT_WINDOW_MAX = 3;

function getHmacKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET env var is not set");
  return createHmac("sha256", secret).update("otp-hmac-key:v1").digest();
}

export function normalizeOtpEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateSixDigitOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtpCode(opts: {
  email: string;
  purpose: OtpPurposeValue;
  code: string;
}): string {
  const normalized = normalizeOtpEmail(opts.email);
  return createHmac("sha256", getHmacKey())
    .update(`${opts.purpose}:${normalized}:${opts.code.trim()}`)
    .digest("hex");
}

export function verifyOtpHash(opts: {
  email: string;
  purpose: OtpPurposeValue;
  code: string;
  expectedHash: string;
}): boolean {
  const candidate = hashOtpCode(opts);
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(opts.expectedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function issueOtp(opts: {
  email: string;
  purpose: OtpPurposeValue;
  applicantId?: string | null;
  requestIp?: string | null;
}): Promise<
  | { ok: true; code: string; otpId: string; expiresAt: Date }
  | { ok: false; reason: "COOLDOWN" | "RATE_LIMITED"; retryAfterSeconds: number }
> {
  const email = normalizeOtpEmail(opts.email);
  const now = new Date();
  const cooldownFloor = new Date(now.getTime() - OTP_COOLDOWN_MS);
  const windowFloor = new Date(now.getTime() - OTP_ACCOUNT_WINDOW_MS);

  const [recent, windowCount] = await Promise.all([
    prisma.emailOtp.findFirst({
      where: {
        email,
        purpose: opts.purpose,
        createdAt: { gte: cooldownFloor },
        invalidatedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.emailOtp.count({
      where: {
        email,
        purpose: opts.purpose,
        createdAt: { gte: windowFloor },
      },
    }),
  ]);

  if (recent) {
    const elapsed = now.getTime() - recent.createdAt.getTime();
    const retryAfterSeconds = Math.max(1, Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000));
    return { ok: false, reason: "COOLDOWN", retryAfterSeconds };
  }

  if (windowCount >= OTP_ACCOUNT_WINDOW_MAX) {
    return { ok: false, reason: "RATE_LIMITED", retryAfterSeconds: Math.ceil(OTP_ACCOUNT_WINDOW_MS / 1000) };
  }

  const code = generateSixDigitOtp();
  const codeHash = hashOtpCode({ email, purpose: opts.purpose, code });
  const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

  const record = await prisma.$transaction(async (tx) => {
    // Supersede any previous active OTPs for this email & purpose
    await tx.emailOtp.updateMany({
      where: {
        email,
        purpose: opts.purpose,
        consumedAt: null,
        invalidatedAt: null,
      },
      data: { invalidatedAt: now },
    });

    return tx.emailOtp.create({
      data: {
        purpose: opts.purpose,
        email,
        applicantId: opts.applicantId ?? null,
        codeHash,
        maxAttempts: OTP_MAX_ATTEMPTS,
        expiresAt,
        requestIp: opts.requestIp ? opts.requestIp.slice(0, 128) : null,
      },
    });
  });

  return { ok: true, code, otpId: record.id, expiresAt };
}

export async function invalidateOtpById(otpId: string): Promise<void> {
  await prisma.emailOtp
    .updateMany({
      where: { id: otpId, consumedAt: null, invalidatedAt: null },
      data: { invalidatedAt: new Date() },
    })
    .catch(() => {});
}

export async function verifyOtp(opts: {
  email: string;
  purpose: OtpPurposeValue;
  code: string;
  consume?: boolean;
}): Promise<
  | { ok: true; otpId: string; applicantId: string | null }
  | { ok: false; reason: "INVALID" | "EXPIRED" | "TOO_MANY_ATTEMPTS" }
> {
  const email = normalizeOtpEmail(opts.email);
  const cleanCode = opts.code.trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    return { ok: false, reason: "INVALID" };
  }

  return prisma.$transaction(async (tx) => {
    const record = await tx.emailOtp.findFirst({
      where: {
        email,
        purpose: opts.purpose,
        consumedAt: null,
        invalidatedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return { ok: false, reason: "INVALID" as const };

    const now = new Date();
    if (record.expiresAt <= now) {
      await tx.emailOtp.updateMany({
        where: { id: record.id, invalidatedAt: null },
        data: { invalidatedAt: now },
      });
      return { ok: false, reason: "EXPIRED" as const };
    }

    if (record.attempts >= record.maxAttempts) {
      await tx.emailOtp.updateMany({
        where: { id: record.id, invalidatedAt: null },
        data: { invalidatedAt: now },
      });
      return { ok: false, reason: "TOO_MANY_ATTEMPTS" as const };
    }

    const match = verifyOtpHash({
      email,
      purpose: opts.purpose,
      code: cleanCode,
      expectedHash: record.codeHash,
    });

    if (!match) {
      const bumped = await tx.emailOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true, maxAttempts: true },
      });
      if (bumped.attempts >= bumped.maxAttempts) {
        await tx.emailOtp.updateMany({
          where: { id: record.id, invalidatedAt: null },
          data: { invalidatedAt: now },
        });
        return { ok: false, reason: "TOO_MANY_ATTEMPTS" as const };
      }
      return { ok: false, reason: "INVALID" as const };
    }

    if (opts.consume !== false) {
      const claimed = await tx.emailOtp.updateMany({
        where: {
          id: record.id,
          consumedAt: null,
          invalidatedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: record.maxAttempts },
        },
        data: { consumedAt: now },
      });
      if (claimed.count === 0) {
        return { ok: false, reason: "INVALID" as const };
      }
    }

    return { ok: true, otpId: record.id, applicantId: record.applicantId };
  });
}
