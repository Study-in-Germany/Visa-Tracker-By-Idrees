"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import TrackerFilterFooter from "@/components/tracker/TrackerFilterFooter";
import Icon from "@/components/ui/Icon";
import { EMPTY_ANALYTICS_FILTERS } from "@/hooks/useAnalyticsFilters";
import type { AnalyticsFilterState } from "@/lib/analytics/dashboard-types";
import AnalyticsFilterForm from "./AnalyticsFilterForm";

/**
 * Mobile & Android PWA modal bottom sheet for /analytics filters.
 * Supports Android Back navigation (popstate), safe areas, and dynamic viewport height.
 */
export default function AnalyticsFilterSheet({
  open,
  onClose,
  triggerRef,
  values,
  universityOptions,
  intakeOptions,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
  values: AnalyticsFilterState;
  universityOptions: { value: string; label: string; count?: number }[];
  intakeOptions: { value: string; label: string; count?: number }[];
  onApply: (next: AnalyticsFilterState) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<AnalyticsFilterState>(values);
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let pushedHistory = false;
    try {
      window.history.pushState({ analyticsFilterSheet: true }, "");
      pushedHistory = true;
    } catch {}

    const onPopState = () => {
      pushedHistory = false;
      onCloseRef.current();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.querySelector("[data-popover-dialog='true']")) return;
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && sheetRef.current) {
        const items = sheetRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("popstate", onPopState);
    document.addEventListener("keydown", onKey);
    sheetRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("keydown", onKey);
      if (pushedHistory && window.history.state?.analyticsFilterSheet) {
        try {
          window.history.back();
        } catch {}
      }
      const restoreTarget = triggerRef?.current ?? prevFocus;
      requestAnimationFrame(() => restoreTarget?.focus?.());
    };
  }, [open, triggerRef]);

  if (!open || !mounted) return null;

  const draftActiveCount = [
    draft.from || draft.to ? "1" : "",
    draft.consulate,
    draft.visaStatus,
    draft.university,
    draft.intake,
  ].filter(Boolean).length;

  return createPortal(
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Analytics filters"
    >
      <div
        data-testid="analytics-filter-backdrop"
        className="fixed inset-0 bg-black/40 backdrop-blur-[5px] dark:bg-black/65"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="relative z-10 flex max-h-[88dvh] w-full flex-col rounded-t-2xl border-t border-line bg-paper-raised shadow-2xl outline-none animate-[sheet-up_180ms_ease-out] motion-reduce:animate-none"
      >
        <div className="flex shrink-0 justify-center pb-1 pt-2.5" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-line-strong" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Icon name="slidersHorizontal" size={16} className="text-mute" />
            <h2 className="text-[15px] font-semibold text-ink-900">Analytics filters</h2>
            {draftActiveCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-line bg-paper-sunk px-1.5 text-[11px] font-semibold tabular-nums text-ink-700">
                {draftActiveCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="grid h-10 w-10 place-items-center rounded-lg text-mute hover:bg-paper-sunk hover:text-ink-900"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <AnalyticsFilterForm
            values={draft}
            onChange={setDraft}
            universityOptions={universityOptions}
            intakeOptions={intakeOptions}
            idPrefix="amf"
          />
        </div>

        <TrackerFilterFooter
          hasAnyDraft={draftActiveCount > 0}
          onReset={() => setDraft(EMPTY_ANALYTICS_FILTERS)}
          onApply={() => {
            onApply(draft);
            onClose();
          }}
          safeAreaBottom
        />
      </div>
    </div>,
    document.body
  );
}
