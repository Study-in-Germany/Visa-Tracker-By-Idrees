import type { Applicant, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildPublicId, getPublicIdPrefix } from "@/lib/ids";

type AllocationTransaction = Pick<Prisma.TransactionClient, "$executeRaw" | "$queryRaw"> & {
  applicant: { create(args: { data: Prisma.ApplicantCreateInput }): Promise<Applicant> };
};

type AllocationClient = {
  $connect?: () => Promise<void>;
  $transaction<T>(
    operation: (tx: AllocationTransaction) => Promise<T>,
    options: { isolationLevel: Prisma.TransactionIsolationLevel },
  ): Promise<T>;
};

function isTransientTxError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  if (code === "P1017" || code === "P2024" || code === "P1001") return true;
  const message = String((err as { message?: unknown }).message ?? "");
  return /kind:\s*Closed|Server has closed the connection|Connection reset|terminating connection|ECONNRESET|ETIMEDOUT/i.test(message);
}

export async function createApplicantWithTrackingId(
  data: Omit<Prisma.ApplicantCreateInput, "publicId"> & { consulate: string },
  db: AllocationClient = prisma,
) {
  const prefix = getPublicIdPrefix(data.consulate);
  const pattern = `^${prefix}([0-9]+)$`;

  const runAttempt = () =>
    db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`;

      const [row] = await tx.$queryRaw<{ sequence: bigint }[]>`
        SELECT GREATEST(
          COALESCE(MAX(SUBSTRING("publicId" FROM ${pattern})::bigint), 9999),
          9999
        ) + 1 AS sequence
        FROM "Applicant"
      `;

      return tx.applicant.create({
        data: { ...data, publicId: buildPublicId(data.consulate, row.sequence) },
      });
    }, { isolationLevel: "ReadCommitted" });

  try {
    return await runAttempt();
  } catch (err) {
    if (!isTransientTxError(err)) throw err;
    await new Promise((r) => setTimeout(r, 150));
    try {
      await db.$connect?.();
    } catch {
      // ignore reconnect attempt error and let retry decide
    }
    return await runAttempt();
  }
}
