"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Immediate top-edge navigation bar: starts animating on internal link clicks
 * so users get instant visual feedback before the destination route finishes loading.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActive(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      try {
        const nextUrl = new URL(anchor.href, window.location.origin);
        if (nextUrl.origin !== window.location.origin) return;
        const current = `${window.location.pathname}${window.location.search}`;
        const target = `${nextUrl.pathname}${nextUrl.search}`;
        if (current === target || nextUrl.pathname === window.location.pathname && nextUrl.hash) return;

        setActive(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setActive(false), 8_000);
      } catch {
        // ignore invalid URLs
      }
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-label="Navigating"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-neutral-200/70 dark:bg-neutral-800"
    >
      <div className="h-full w-1/2 animate-[splash-bar_0.9s_ease-in-out_infinite] bg-blue-600" />
    </div>
  );
}
