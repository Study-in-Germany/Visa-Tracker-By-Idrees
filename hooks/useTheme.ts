"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "vt.theme";

/** Inline script run before first paint (see app/layout.tsx) so the page never flashes the wrong theme. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}`;

/**
 * Switches theme. Where the browser supports View Transitions, the new theme expands across the whole page as a circle
 * from the toggle button; elsewhere (or with reduced motion) colours cross-fade over about 0.3s.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  useEffect(() => setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light"), []);

  const setTheme = useCallback((t: Theme, origin?: { x: number; y: number }) => {
    const root = document.documentElement;
    const apply = () => {
      root.classList.toggle("dark", t === "dark");
      try { localStorage.setItem(KEY, t); } catch {}
      setThemeState(t);
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = (document as any).startViewTransition?.bind(document);

    if (start && !reduce) {
      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? 0;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const transition = start(apply);
      transition.ready
        .then(() => root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { duration: 650, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }))
        .catch(() => {});
      return;
    }
    root.classList.add("theme-transition");
    apply();
    window.setTimeout(() => root.classList.remove("theme-transition"), 400);
  }, []);

  return { theme, setTheme, toggle: (origin?: { x: number; y: number }) => setTheme(theme === "dark" ? "light" : "dark", origin) };
}
