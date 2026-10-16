import { PrismaClient, Prisma } from "@prisma/client";
import { createSoftDeleteExtension } from "prisma-extension-soft-delete";

const softDeleteModels = Object.fromEntries(
  Prisma.dmmf.datamodel.models.map(({ name, fields }) => {
    const deletedAt = fields.find((field) => field.name === "deletedAt");
    if (deletedAt?.type !== "DateTime" || deletedAt.isRequired || deletedAt.isList) {
      throw new Error(`${name} must have a deletedAt DateTime? field for soft deletion.`);
    }
    return [name, true];
  }),
);

export function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
    .$extends({
      name: "active-record-updates",
      query: {
        $allModels: {
          $allOperations({ operation, args, query }) {
            if (
              (operation === "update" || operation === "upsert") &&
              args.where.deletedAt === undefined
            ) {
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
      },
    }));
}

export type AppPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { visaTrackerPrisma?: AppPrismaClient };

export const prisma = globalForPrisma.visaTrackerPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.visaTrackerPrisma = prisma;
