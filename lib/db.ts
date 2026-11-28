import { PrismaClient } from "@prisma/client";

export function normalizeDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    if (!url.protocol.startsWith("postgres")) return raw;
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "15");
    if (!url.searchParams.has("socket_timeout")) url.searchParams.set("socket_timeout", "15");
    const isPooler = url.hostname.includes("-pooler.");
    const isNeon = url.hostname.includes(".neon.tech");
    if (isPooler || isNeon) {
      if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
    }
    if (isPooler) {
      if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
      if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "5");
      if (!url.searchParams.has("statement_cache_size")) url.searchParams.set("statement_cache_size", "0");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export function isTransientConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  if (code === "P1001" || code === "P1002" || code === "P1008" || code === "P1017" || code === "P2024") return true;
  const message = String((err as { message?: unknown }).message ?? "");
  return /kind:\s*Closed|ConnectionReset|Connection\s+reset|10054|forcibly closed|Server has closed the connection|terminating connection|BrokenPipe|UnexpectedEof|ECONNRESET|ETIMEDOUT|EPIPE|socket hang up/i.test(
    message
  );
}

function createPrismaClient() {
  const url = normalizeDatabaseUrl(process.env.DATABASE_URL);
  const base = new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: [
      { level: "error", emit: "event" },
      ...(process.env.NODE_ENV === "development" ? [{ level: "warn" as const, emit: "stdout" as const }] : []),
    ],
  });

  base.$on("error", (e) => {
    if (isTransientConnectionError({ message: e.message })) {
      console.warn("[prisma] transient connection reset — reconnecting");
    } else {
      console.error("[prisma:error]", e.message);
    }
  });

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const delays = [200, 600];
          let attempt = 0;
          while (true) {
            try {
              return await query(args);
            } catch (err) {
              if (!isTransientConnectionError(err) || attempt >= delays.length) throw err;
              const delay = delays[attempt];
              attempt += 1;
              await new Promise((r) => setTimeout(r, delay));
              if (attempt === delays.length) {
                await base.$disconnect().catch(() => {});
              }
              await base.$connect().catch(() => {});
            }
          }
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

function hasCurrentModels(client: ExtendedPrismaClient | undefined): client is ExtendedPrismaClient {
  if (!client) return false;
  const c = client as unknown as Record<string, unknown>;
  return Boolean(
    c.applicant &&
      c.externalTimelineObservation &&
      c.queueObservation &&
      c.evidenceSource &&
      c.forecastSnapshot &&
      c.authSession &&
      c.authGrant
  );
}

const PRISMA_CLIENT_VERSION = 4;

const globalForPrisma = globalThis as unknown as {
  prisma?: ExtendedPrismaClient;
  prismaVersion?: number;
};

if (
  globalForPrisma.prisma &&
  (globalForPrisma.prismaVersion !== PRISMA_CLIENT_VERSION || !hasCurrentModels(globalForPrisma.prisma))
) {
  (globalForPrisma.prisma as { $disconnect?: () => Promise<void> }).$disconnect?.().catch(() => {});
  globalForPrisma.prisma = undefined;
}

export const prisma: ExtendedPrismaClient = globalForPrisma.prisma ?? createPrismaClient();

export const hasForecastDelegates: boolean = hasCurrentModels(prisma);

globalForPrisma.prisma = prisma;
globalForPrisma.prismaVersion = PRISMA_CLIENT_VERSION;
