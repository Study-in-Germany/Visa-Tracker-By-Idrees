"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";

/** Uses the phone's share sheet when available, otherwise copies the link. */
export default function ShareButton({ title, link = false }: { title: string; link?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* share cancelled */ }
  }
  return (
    <button type="button" onClick={share} className={link ? "inline-flex min-h-[40px] items-center gap-2 rounded-lg px-2.5 text-[14px] font-medium underline underline-offset-2 hover:bg-paper-sunk" : "btn-secondary !min-h-[40px] gap-1.5"} aria-live="polite">
      <Icon name={copied ? "check" : "send"} size={14} /> {copied ? "Link copied" : "Share"}
    </button>
  );
}
