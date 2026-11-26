"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timerRef = useRef<number | null>(null);
  const doneTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Route committed — finish progress bar if active
    setState((prev) => {
      if (prev !== "loading") return "idle";
      if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current);
      doneTimerRef.current = window.setTimeout(() => setState("idle"), 220);
      return "done";
    });
  }, [routeKey]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let nextUrl: URL;
      try {
        nextUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (nextUrl.origin !== window.location.origin) return;
      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) return;

      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current);
      setState("loading");
      // Safety timeout in case navigation is aborted
      timerRef.current = window.setTimeout(() => setState("idle"), 8000);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (doneTimerRef.current) window.clearTimeout(doneTimerRef.current);
    };
  }, []);

  if (state === "idle") return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[2px] overflow-hidden bg-transparent"
    >
      <div
        className={`h-full bg-blue-600 transition-all ease-out ${
          state === "done" ? "w-full duration-150 opacity-0" : "w-3/4 duration-500 opacity-100"
        }`}
      />
    </div>
  );
}

export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <ProgressInner />
    </Suspense>
  );
}
