import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/authorization";
import { isSmtpConfigured, verifySmtpConnection } from "@/lib/email";
import { privateJson } from "@/lib/security/cache-policy";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const [grouped, recent] = await Promise.all([
    prisma.emailJob.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.emailJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        kind: true,
        toEmail: true,
        subject: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        lastError: true,
        sentAt: true,
        createdAt: true,
      },
    }),
  ]);

  const counts = { PENDING: 0, PROCESSING: 0, SENT: 0, FAILED: 0 } as Record<string, number>;
  for (const g of grouped) counts[g.status] = g._count._all;

  const sanitizedRecent = recent.map((row) => ({
    ...row,
    // Never expose historical OTP codes that were stored in email subjects prior to hardening
    subject: row.kind.includes("OTP") ? "[Redacted verification code email]" : row.subject,
  }));

  const smtpConfigured = isSmtpConfigured();
  const smtpHealth = smtpConfigured ? await verifySmtpConnection() : { ok: false, error: "Not configured" };

  return privateJson({
    smtpConfigured,
    smtpOk: smtpHealth.ok,
    smtpError: smtpHealth.error,
    counts,
    recent: sanitizedRecent,
  });
}
