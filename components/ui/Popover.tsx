"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

/**
 * Floating panel anchored to an element. Rendered in a portal so table / card
 * overflow never clips it. On narrow screens it becomes a bottom sheet.
 * Closes on Escape and on outside press; flips above the anchor if there is no room below.
 */
export default function Popover({
  open,
  onClose,
  anchorRef,
  children,
  title,
  width = "anchor",
  minWidth = 0,
  align = "left",
  className = "",
  sheet: allowSheet = true,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  /** Accessible name; also the sheet heading on mobile. */
  title: string;
  /** "anchor" matches the trigger width; a number is a fixed px width. */
  width?: "anchor" | number;
  minWidth?: number;
  align?: "left" | "right";
  className?: string;
  /** Turn into a bottom sheet on phones. Disable for anchored suggestion lists (e.g. search). */
  sheet?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  useEffect(() => setMounted(true), []);

  const place = () => {
    const a = anchorRef.current;
    const p = panelRef.current;
    if (!a) return;
    const isSheet = allowSheet && window.innerWidth < 640;
    setSheet(isSheet);
    if (isSheet) return setPos(null);
    const r = a.getBoundingClientRect();
    const w = Math.max(minWidth, width === "anchor" ? r.width : width);
    const h = p?.scrollHeight ?? 0;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const flip = h > below && above > below;
    let left = align === "right" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    setPos({
      left,
      width: w,
      top: flip ? Math.max(8, r.top - 6 - Math.min(h, above)) : r.bottom + 6,
      maxHeight: Math.min(420, Math.max(160, flip ? above : below)),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    // measure again once content has rendered
    const id = requestAnimationFrame(place);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, children]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        anchorRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onMove = () => place();
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    if (allowSheet && window.innerWidth < 640) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <>
      {sheet && <div className="fixed inset-0 z-[70] bg-ink-900/40" aria-hidden="true" />}
      <div
        ref={panelRef}
        role="dialog"
        aria-label={title}
        style={sheet || !pos ? undefined : { position: "fixed", top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
        className={`z-[80] overflow-auto border border-line bg-paper-raised shadow-[0_12px_32px_-8px_rgba(35,47,39,0.25)] ${
          sheet
            ? "fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
            : "rounded-xl"
        } ${!sheet && !pos ? "invisible fixed" : ""} ${className}`}
      >
        {sheet && (
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper-raised px-4 py-2.5">
            <span className="text-sm font-semibold">{title}</span>
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md hover:bg-paper-sunk">
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </>,
    document.body
  );
}
