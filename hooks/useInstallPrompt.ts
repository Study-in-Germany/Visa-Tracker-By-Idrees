"use client";

import { useCallback, useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/**
 * Handles "install as an app". On Android/desktop Chrome and Edge the browser fires `beforeinstallprompt`, which we keep
 * and trigger from our own button. iOS has no such event, so we report it and the UI shows the Share → Add to Home Screen steps.
 */
export function useInstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    const ua = navigator.userAgent;
    setPlatform(/iPad|iPhone|iPod/.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "other");
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setEvent(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  /** Shows the browser's install dialog. Returns true if the user accepted. */
  const install = useCallback(async () => {
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    setEvent(null);
    return outcome === "accepted";
  }, [event]);

  return { installed, platform, canPrompt: !!event, install };
}
