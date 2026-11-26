import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache";
import { ACTIVE_STATUSES } from "@/lib/constants";
import { ELIGIBLE_PUBLIC_APPLICANT_WHERE } from "@/lib/analytics-filter";

async function computeActiveQueueRanks(): Promise<Record<string, number>> {
  const rows = await prisma.applicant.findMany({
    where: {
      ...ELIGIBLE_PUBLIC_APPLICANT_WHERE,
      visaStatus: { in: ACTIVE_STATUSES as any },
      waitingListDate: { gte: new Date("2000-01-01T00:00:00Z") },
    },
    orderBy: [{ waitingListDate: "asc" }, { createdAt: "asc" }],
    select: { id: true, consulate: true },
  });

  const counters: Record<string, number> = {};
  const ranks: Record<string, number> = {};
  for (const r of rows) {
    const next = (counters[r.consulate] ?? 0) + 1;
    counters[r.consulate] = next;
    ranks[r.id] = next;
  }
  return ranks;
}

export const getActiveQueueRanks = unstable_cache(
  computeActiveQueueRanks,
  ["active-queue-ranks-v1"],
  { revalidate: 60, tags: [CACHE_TAGS.APPLICANTS] },
);
