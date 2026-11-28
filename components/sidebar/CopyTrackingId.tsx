"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";

/**
 * Displays the applicant's Tracking ID with a single-click copy button and visual confirmation.
 */
export default function CopyTrackingId({ publicId }: { publicId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    let copiedOk = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicId);
        copiedOk = true;
      }
    } catch {
      copiedOk = false;
    }

    if (!copiedOk && typeof document !== "undefined") {
      try {
        const el = document.createElement("textarea");
        el.value = publicId;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        copiedOk = document.execCommand("copy");
        document.body.removeChild(el);
      } catch {
        copiedOk = false;
      }
    }

    if (copiedOk) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-paper-sunk px-2.5 py-1.5">
      <span className="truncate font-mono text-[12px] font-semibold text-ink-900" title={publicId}>
        {publicId}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied Tracking ID" : "Copy Tracking ID"}
        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-ink-700 transition-colors hover:bg-[rgb(var(--hover))] hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700"
      >
        <Icon name={copied ? "check" : "copy"} size={12} />
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}
