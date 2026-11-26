import { revalidateTag } from "next/cache";
import { clearEstimatorCache } from "@/lib/estimator";

export const CACHE_TAGS = {
  APPLICANTS: "applicants",
  ANNOUNCEMENTS: "announcements",
  UNIVERSITIES: "universities",
  PROGRAMMES: "programmes",
  LISTINGS: "listings",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Invalidate Next.js Data Cache tags (and the estimator's in-memory cache when applicants change).
 * Safe to call inside API routes and server actions; swallows Next context errors when called in CLI scripts/tests.
 */
export function invalidateTags(...tags: CacheTag[]) {
  if (tags.includes(CACHE_TAGS.APPLICANTS)) {
    clearEstimatorCache();
  }
  for (const tag of tags) {
    try {
      revalidateTag(tag);
    } catch {
      // Ignore outside Next.js request context (e.g. unit tests or scripts)
    }
  }
}
