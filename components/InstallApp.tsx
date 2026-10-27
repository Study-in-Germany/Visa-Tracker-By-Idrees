"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const DISMISS_KEY = "vt.install-dismissed";

function Steps({ platform }: { platform: "ios" | "android" | "other" }) {
  const steps = platform === "ios"
    ? ["Open this site in Safari.", "Tap the Share button.", "Choose “Add to Home Screen”, then tap Add."]
    : ["Open the browser menu (⋮).", "Tap “Install app” or “Add to Home screen”.", "Confirm. The app appears with your other apps."];
  return (
    <ol className="space-y-3 text-[14px]">
      {steps.map((s, i) => (
        <li key={s} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper-sunk text-xs font-semibold">{i + 1}</span><span className="pt-0.5">{s}</span></li>
      ))}
    </ol>
  );
}

/**
 * "Install app" button. Uses the browser's native install dialog where available (Android Chrome/Edge); otherwise shows
 * short instructions (iOS Safari, or an Android browser that hasn't offered the install yet). Hidden once installed.
 */
export default function InstallApp({ className = "" }: { className?: string }) {
  const { installed, platform, canPrompt, install } = useInstallPrompt();
  const [help, setHelp] = useState(false);
  if (installed || (!canPrompt && platform === "other")) return null;
  return (
    <>
      <button type="button" onClick={() => (canPrompt ? install() : setHelp(true))} className={`flex min-h-[42px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-[14px] font-medium text-ink-700 transition-colors hover:bg-paper lg:min-h-[36px] lg:text-[13px] ${className}`}>
        <Icon name="upload" size={17} className="rotate-180 text-mute" />
        <span className="flex-1 truncate">Install app</span>
      </button>
      <Modal open={help} onClose={() => setHelp(false)} title="Install Visa Tracker" size="sm" footer={<button type="button" className="btn-primary" onClick={() => setHelp(false)}>Got it</button>}>
        <Steps platform={platform} />
      </Modal>
    </>
  );
}

/** A dismissible banner above the bottom navigation, shown once on phones when the app can be installed. */
export function InstallBanner() {
  const { installed, platform, canPrompt, install } = useInstallPrompt();
  const [hidden, setHidden] = useState(true);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    try { setHidden(localStorage.getItem(DISMISS_KEY) === "1"); } catch { setHidden(false); }
  }, []);
  const dismiss = () => { setHidden(true); try { localStorage.setItem(DISMISS_KEY, "1"); } catch {} };

  if (installed || hidden || (!canPrompt && platform !== "ios")) return null;
  return (
    <>
      <div role="region" aria-label="Install the app" className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-2xl border border-line-strong bg-paper-raised p-3 shadow-xl lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">Install Visa Tracker</p>
          <p className="truncate text-xs text-mute">Open it from your home screen, like an app.</p>
        </div>
        <button type="button" onClick={() => (canPrompt ? install().then(dismiss) : setHelp(true))} className="btn-gold !min-h-[40px] shrink-0 !px-4">Install</button>
        <button type="button" onClick={dismiss} aria-label="Not now" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-mute hover:bg-paper-sunk"><Icon name="close" size={16} /></button>
      </div>
      <Modal open={help} onClose={() => setHelp(false)} title="Install Visa Tracker" size="sm" footer={<button type="button" className="btn-primary" onClick={() => { setHelp(false); dismiss(); }}>Got it</button>}>
        <Steps platform={platform} />
      </Modal>
    </>
  );
}
