"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "vt.theme";
const LIGHT_BAR = "#ffffff";
const DARK_BAR = "#111111";

/** Inline script run before first paint (see app/layout.tsx) so theme & status-bar theme-color never flash. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var d=t==="dark";document.documentElement.classList.toggle("dark",d);document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",d?"${DARK_BAR}":"${LIGHT_BAR}");});}catch(e){}`;

function syncThemeColorMeta(theme: Theme) {
  if (typeof document === "undefined") return;
  const color = theme === "dark" ? DARK_BAR : LIGHT_BAR;
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = color;
    document.head.appendChild(meta);
    return;
  }
  metas.forEach((m) => {
    m.removeAttribute("media");
    m.content = color;
  });
}

/**
 * Switches theme + synchronizes `<meta name="theme-color">` for Android Chrome / PWA status bars.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const current: Theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setThemeState(current);
    syncThemeColorMeta(current);
  }, []);

  const setTheme = useCallback((t: Theme, origin?: { x: number; y: number }) => {
    const root = document.documentElement;
    const apply = () => {
      root.classList.toggle("dark", t === "dark");
      try {
        localStorage.setItem(KEY, t);
      } catch {}
      syncThemeColorMeta(t);
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
        .then(() =>
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: 650, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
          )
        )
        .catch(() => {});
      return;
    }
    root.classList.add("theme-transition");
    apply();
    window.setTimeout(() => root.classList.remove("theme-transition"), 400);
  }, []);

  return {
    theme,
    setTheme,
    toggle: (origin?: { x: number; y: number }) => setTheme(theme === "dark" ? "light" : "dark", origin),
  };
}
