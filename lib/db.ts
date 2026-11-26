import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Execute a Prisma operation with automatic retry on transient connection drops or Neon cold-boots.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  retries = 2,
  delayMs = 600
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || "";
      const isConnectionError =
        msg.includes("Can't reach database server") ||
        msg.includes("connection pool") ||
        msg.includes("Connection terminated") ||
        msg.includes("timeout") ||
        err?.code === "P1001" ||
        err?.code === "P1002" ||
        err?.code === "P1008" ||
        err?.code === "P1017";

      if (!isConnectionError || attempt === retries) {
        throw err;
      }
      // Exponential backoff
      await new Promise((res) => setTimeout(res, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}
