"use client";

import { useEffect, useId, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { formatDisplayDate } from "@/lib/analytics/formatters";
import type { Embassy } from "@/lib/forecasting/types";

export default function QueueConfidenceIndicator({
  embassy,
  label,
  detail,
  tone,
  observedRangeStart,
  observedRangeEnd,
  sampleSize,
}: {
  embassy: Embassy;
  label: string;
  detail: string;
  tone: "amber" | "muted";
  observedRangeStart: string | null;
  observedRangeEnd: string | null;
  sampleSize: number;
}) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open || !isDesktop) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, isDesktop]);

  const toneCls =
    tone === "amber"
      ? "text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
      : "text-mute hover:text-ink-800";

  const body = (
    <div className="space-y-1.5 text-[12px] text-ink-700">
      <p className="leading-snug text-ink-900">{detail}</p>
      {observedRangeStart && observedRangeEnd && (
        <p className="text-[11px] tabular-nums text-mute">
          Observed span: {formatDisplayDate(observedRangeStart)} – {formatDisplayDate(observedRangeEnd)}
        </p>
      )}
      {sampleSize > 0 && (
        <p className="text-[11px] tabular-nums text-mute">
          Based on {sampleSize} recent observation{sampleSize === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );

  return (
    <div ref={wrapRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open && isDesktop ? popoverId : undefined}
        className={`inline-flex min-h-[28px] items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium transition-colors ${toneCls}`}
      >
        <Icon name="info" size={13} className="shrink-0" />
        <span>{label}</span>
      </button>

      {open && isDesktop && (
        <div
          id={popoverId}
          role="region"
          aria-label={`${embassy} confidence explanation`}
          className="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-line bg-paper-raised p-3 shadow-md"
        >
          {body}
        </div>
      )}

      {!isDesktop && (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={`${embassy} · ${label}`}
          size="sm"
        >
          {body}
        </Modal>
      )}
    </div>
  );
}
