"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";

let pluginsRegistered = false;

export function ensureGsapPlugins() {
  if (typeof window === "undefined") return;
  if (!pluginsRegistered) {
    gsap.registerPlugin(ScrollTrigger, Flip);
    pluginsRegistered = true;
  }
}

export function refreshScrollTriggersWhenReady(): () => void {
  if (typeof window === "undefined") return () => {};
  ensureGsapPlugins();

  let cancelled = false;
  const doRefresh = () => {
    if (!cancelled) {
      ScrollTrigger.refresh();
    }
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(doRefresh).catch(() => {});
  }

  const onLoad = () => doRefresh();
  if (document.readyState === "complete") {
    requestAnimationFrame(doRefresh);
  } else {
    window.addEventListener("load", onLoad, { once: true });
  }

  return () => {
    cancelled = true;
    window.removeEventListener("load", onLoad);
  };
}

export { gsap, ScrollTrigger, Flip };
