"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

/**
 * Accessible dialog. A centred card on desktop, a bottom sheet on phones.
 * `variant="drawer"` instead slides in from the right edge on desktop (full height), and is still a bottom sheet on phones.
 * Escape and backdrop press close it, body scroll is locked, and focus returns to the trigger on close.
 */
export default function Modal({
  open, onClose, title, children, footer, size = "md", variant = "dialog",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "dialog" | "drawer";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onCloseRef.current(); }
      if (e.key !== "Tab" || !panel.current) return;
      // Keep Tab inside the dialog.
      const items = panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  const drawer = variant === "drawer";
  const width = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" }[size];

  return createPortal(
    <div className={`fixed inset-0 z-[90] flex items-end justify-center ${drawer ? "sm:justify-end" : "sm:items-center sm:p-4"}`}>
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex w-full flex-col border border-line bg-paper-raised shadow-xl outline-none ${
          drawer ? "max-h-[90dvh] animate-sheet-up rounded-t-2xl sm:h-full sm:max-h-none sm:max-w-md sm:animate-drawer-in sm:rounded-none sm:border-y-0 sm:border-r-0" : `max-h-[90dvh] animate-sheet-up rounded-t-2xl sm:rounded-2xl ${width}`
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id={titleId} className="text-[15px] font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-paper-sunk">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
