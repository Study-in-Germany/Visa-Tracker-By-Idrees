"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "./Logo";

/** Brand splash shown once per browser session while the app hydrates, then fades out. */
export default function Splash() {
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("vt.splash") === "1";
      sessionStorage.setItem("vt.splash", "1");
    } catch {}
    if (seen) return setPhase("gone");
    const t1 = setTimeout(() => setPhase("fade"), 250);
    const t2 = setTimeout(() => setPhase("gone"), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;
  return (
    <div className={`fixed inset-0 z-[100] grid place-items-center bg-paper transition-opacity duration-300 ${phase === "fade" ? "opacity-0" : "opacity-100"}`} role="status" aria-label="Loading Visa Tracker">
      <div className="flex flex-col items-center gap-4">
        <LogoMark size={56} className="animate-[splash-pop_0.5s_ease-out]" />
        <div className="text-center">
          <p className="text-base font-semibold">Visa Tracker</p>
          <p className="text-xs text-mute">by Idrees</p>
        </div>
        <div className="h-0.5 w-24 overflow-hidden rounded-full bg-line-strong">
          <div className="h-full w-1/2 animate-[splash-bar_0.9s_ease-in-out_infinite] rounded-full bg-clay-500" />
        </div>
      </div>
    </div>
  );
}
