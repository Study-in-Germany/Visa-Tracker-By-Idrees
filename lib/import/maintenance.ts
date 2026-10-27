import { prisma } from "@/lib/db";
import { registerHandler, type Handler } from "./runner";

/** Deadlines older than this since the last official check are no longer shown as verified. */
export const VERIFICATION_MAX_AGE_DAYS = 150;

/**
 * Recurring upkeep. Deadlines can't be read reliably from arbitrary university pages, so nothing is guessed here:
 * confirmations simply expire, which puts those programmes back in the "unverified, check the official site" state.
 */
const handler: Handler = {
  async prepare() {
    return { total: 1 };
  },
  async step(_job, _i, log) {
    const cutoff = new Date(Date.now() - VERIFICATION_MAX_AGE_DAYS * 86_400_000);
    const res = await prisma.programme.updateMany({ where: { verification: "VERIFIED", deadlinesVerifiedAt: { lt: cutoff } }, data: { verification: "UNVERIFIED" } });
    log(`${res.count} programme confirmations expired (older than ${VERIFICATION_MAX_AGE_DAYS} days)`);
    return res.count ? "updated" : "skipped";
  },
};

registerHandler("maintenance", handler);
