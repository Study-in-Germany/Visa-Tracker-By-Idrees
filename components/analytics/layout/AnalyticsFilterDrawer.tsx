"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import TrackerFilterFooter from "@/components/tracker/TrackerFilterFooter";
import Icon from "@/components/ui/Icon";
import { EMPTY_ANALYTICS_FILTERS } from "@/hooks/useAnalyticsFilters";
import type { AnalyticsFilterState } from "@/lib/analytics/dashboard-types";
import AnalyticsFilterForm from "./AnalyticsFilterForm";

/**
 * Full-height right-edge modal overlay filter drawer for desktop /analytics.
 * Mirrors the approved tracker filter drawer architecture without affecting /tracker.
 */
export default function AnalyticsFilterDrawer({
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
  const drawerRef = useRef<HTMLElement>(null);
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

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.querySelector("[data-popover-dialog='true']")) return;
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab" && drawerRef.current) {
        const items = drawerRef.current.querySelectorAll<HTMLElement>(
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

    document.addEventListener("keydown", onKey);
    drawerRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
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
    <div className="fixed inset-0 z-[65] hidden justify-end md:flex">
      <div
        data-testid="analytics-filter-backdrop"
        className="fixed inset-0 bg-black/35 backdrop-blur-[5px] transition-opacity dark:bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="analytics-filter-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Analytics filters"
        tabIndex={-1}
        className="relative z-10 flex h-[100dvh] w-[380px] max-w-full flex-col border-l border-line bg-paper-raised shadow-2xl outline-none animate-[drawer-in_200ms_ease-out] motion-reduce:animate-none"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
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
            className="grid h-8 w-8 place-items-center rounded-lg text-mute transition-colors hover:bg-[rgb(var(--hover))] hover:text-ink-900"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <AnalyticsFilterForm
            values={draft}
            onChange={setDraft}
            universityOptions={universityOptions}
            intakeOptions={intakeOptions}
            idPrefix="adf"
          />
        </div>

        <TrackerFilterFooter
          hasAnyDraft={draftActiveCount > 0}
          onReset={() => setDraft(EMPTY_ANALYTICS_FILTERS)}
          onApply={() => {
            onApply(draft);
            onClose();
          }}
        />
      </aside>
    </div>,
    document.body
  );
}
