"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** Clamps long content to a fixed height with a "Show more" button (only when it actually overflows). */
export default function ExpandableText({ children, collapsedHeight = 176 }: { children: React.ReactNode; collapsedHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    if (ref.current) setOverflows(ref.current.scrollHeight > collapsedHeight + 24);
  }, [children, collapsedHeight]);

  return (
    <div>
      <div ref={ref} style={!open && overflows ? { maxHeight: collapsedHeight } : undefined} className={`relative ${!open && overflows ? "overflow-hidden" : ""}`}>
        {children}
        {!open && overflows && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-paper to-transparent" aria-hidden="true" />}
      </div>
      {overflows && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-paper-sunk px-5 text-[14px] font-semibold text-ink-900 hover:brightness-95">
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
