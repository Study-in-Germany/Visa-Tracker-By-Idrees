import type { Prisma } from "@prisma/client";
import { prisma, type AppPrismaClient } from "@/lib/db";
import { buildPublicId, getPublicIdPrefix } from "@/lib/ids";

// Both submissions and CSV imports must allocate IDs through this function.
export async function createApplicantWithTrackingId(
  data: Omit<Prisma.ApplicantCreateInput, "publicId"> & { consulate: string },
  db: AppPrismaClient = prisma,
) {
  const prefix = getPublicIdPrefix(data.consulate);
  const pattern = `^${prefix}([0-9]+)$`;

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`;

    // Include soft-deleted applicants: their Tracking IDs remain reserved.
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
