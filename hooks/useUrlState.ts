"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filter state kept in the query string, so filtered views can be shared, bookmarked and survive Back.
 * Empty values and defaults are dropped from the URL. Any change other than `page` resets paging.
 * The page using this must sit inside <Suspense> (Next requirement for useSearchParams).
 */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const values = useMemo(() => {
    const out = { ...defaults } as Record<string, string>;
    for (const key of Object.keys(defaults)) out[key] = sp.get(key) ?? defaults[key];
    return out as T;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const set = useCallback(
    (patch: Partial<T>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (!v || v === defaults[k]) next.delete(k);
        else next.set(k, v as string);
      }
      if (!("page" in patch)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sp, pathname, router],
  );

  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [router, pathname]);
  return [values, set, reset] as const;
}
