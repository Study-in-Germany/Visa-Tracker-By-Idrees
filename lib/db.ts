import { PrismaClient } from "@prisma/client";
import { createSoftDeleteExtension } from "prisma-extension-soft-delete";

// Register models here after adding their nullable deletedAt field to the schema.
const softDeleteModels = { Applicant: true, Announcement: true };

export function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
    // The library leaves unique updates/upserts unfiltered. Keep their predicates
    // active-only, including when callers pass undefined. Explicit filters are
    // reserved for trusted recovery operations; never forward request filters here.
    .$extends({
      name: "active-record-updates",
      query: {
        $allModels: {
          update({ model, args, query }) {
            if (!Object.hasOwn(softDeleteModels, model)) return query(args);
            if (!("deletedAt" in args.where) || args.where.deletedAt === undefined) {
              args.where = { ...args.where, deletedAt: null };
            }
            return query(args);
          },
          upsert({ model, args, query }) {
            if (!Object.hasOwn(softDeleteModels, model)) return query(args);
            if (!("deletedAt" in args.where) || args.where.deletedAt === undefined) {
              args.where = { ...args.where, deletedAt: null };
            }
            return query(args);
          },
        },
      },
    })
    .$extends(createSoftDeleteExtension({
      models: softDeleteModels,
      defaultConfig: {
        field: "deletedAt",
        createValue: (deleted) => deleted ? new Date() : null,
        allowToOneUpdates: false,
        allowCompoundUniqueIndexWhere: false,
      },
    }));
}

export type AppPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { visaTrackerPrisma?: AppPrismaClient };

export const prisma = globalForPrisma.visaTrackerPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.visaTrackerPrisma = prisma;
