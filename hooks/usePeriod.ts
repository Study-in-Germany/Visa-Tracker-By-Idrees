"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Period } from "@/lib/period";

/** Period state kept in the URL (?from=&to=) so it is shareable and survives reloads. */
export function usePeriod() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const period: Period = useMemo(() => ({ from: sp.get("from") || "", to: sp.get("to") || "" }), [sp]);

  const setPeriod = useCallback(
    (next: Period) => {
      const params = new URLSearchParams(sp.toString());
      next.from ? params.set("from", next.from) : params.delete("from");
      next.to ? params.set("to", next.to) : params.delete("to");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, sp]
  );

  return [period, setPeriod] as const;
}
