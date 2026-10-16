import type { Applicant, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildPublicId, getPublicIdPrefix } from "@/lib/ids";

type AllocationTransaction = Pick<Prisma.TransactionClient, "$executeRaw" | "$queryRaw"> & {
  applicant: { create(args: { data: Prisma.ApplicantCreateInput }): Promise<Applicant> };
};

type AllocationClient = {
  $transaction<T>(
    operation: (tx: AllocationTransaction) => Promise<T>,
    options: { isolationLevel: Prisma.TransactionIsolationLevel },
  ): Promise<T>;
};

export async function createApplicantWithTrackingId(
  data: Omit<Prisma.ApplicantCreateInput, "publicId"> & { consulate: string },
  db: AllocationClient = prisma,
) {
  const prefix = getPublicIdPrefix(data.consulate);
  const pattern = `^${prefix}([0-9]+)$`;

  return db.$transaction(async (tx) => {
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
}
