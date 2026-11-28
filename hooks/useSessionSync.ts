"use client";

import { useEffect } from "react";

const CHANNEL_NAME = "vt-auth-sync";
const STORAGE_KEY = "vt.auth.sync";

export type AuthSyncEvent = "LOGOUT" | "LOGIN";

export function broadcastAuthEvent(event: AuthSyncEvent) {
  if (typeof window === "undefined") return;
  const payload = { event, ts: Date.now() };
  try {
    if ("BroadcastChannel" in window) {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage(payload);
      ch.close();
    }
  } catch {}
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

export function useAuthLifecycleSync(onEvent: (reason: "LOGOUT" | "LOGIN" | "RESUME" | "BFCACHE") => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let ch: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        ch = new BroadcastChannel(CHANNEL_NAME);
        ch.onmessage = (e) => {
          if (e?.data?.event === "LOGOUT") onEvent("LOGOUT");
          else if (e?.data?.event === "LOGIN") onEvent("LOGIN");
        };
      }
    } catch {}

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed?.event === "LOGOUT") onEvent("LOGOUT");
        else if (parsed?.event === "LOGIN") onEvent("LOGIN");
      } catch {}
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) onEvent("BFCACHE");
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") onEvent("RESUME");
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      try {
        ch?.close();
      } catch {}
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [onEvent]);
}
