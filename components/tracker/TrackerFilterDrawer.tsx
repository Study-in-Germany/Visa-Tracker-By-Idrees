"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/Icon";
import { EMPTY_TRACKER_FILTERS, type TrackerFilterValues } from "@/hooks/useTrackerFilters";
import TrackerFilterFooter from "./TrackerFilterFooter";
import TrackerFilterForm from "./TrackerFilterForm";

/**
 * Full-height (100dvh) right-edge modal overlay filter drawer for desktop.
 * - Blurs and dims the entire underlying app via a full-viewport backdrop.
 * - Never resizes, compresses, or shifts the table or pagination.
 * - Maintains draft filter state until Apply filters is selected.
 */
export default function TrackerFilterDrawer({
  open,
  onClose,
  triggerRef,
  values,
  intakeOptions,
  universityOptions,
  statusCounts,
  totalCount,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
  values: TrackerFilterValues;
  intakeOptions: { value: string; label: string }[];
  universityOptions: { value: string; label: string }[];
  statusCounts?: Record<string, number>;
  totalCount?: number;
  onApply: (next: TrackerFilterValues) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<TrackerFilterValues>(values);
  const drawerRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  // Body scroll lock, Escape handling (respecting nested popovers), focus trap, and focus restoration
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.querySelector("[data-popover-dialog='true']")) {
          return;
        }
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
    draft.visaStatus,
    draft.consulate,
    draft.intake,
    draft.university,
    draft.period.from || draft.period.to ? "1" : "",
  ].filter(Boolean).length;

  return createPortal(
    <div className="fixed inset-0 z-[65] hidden justify-end md:flex">
      {/* Full-viewport blurred and dimmed backdrop */}
      <div
        data-testid="tracker-filter-backdrop"
        className="fixed inset-0 bg-black/35 backdrop-blur-[5px] transition-opacity dark:bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Full-height edge-to-edge right modal drawer */}
      <aside
        id="tracker-filter-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        tabIndex={-1}
        className="relative z-10 flex h-[100dvh] w-[380px] max-w-full flex-col border-l border-line bg-paper-raised shadow-2xl outline-none animate-[drawer-in_200ms_ease-out] motion-reduce:animate-none"
      >
        {/* Fixed Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Icon name="slidersHorizontal" size={16} className="text-mute" />
            <h2 className="text-[15px] font-semibold text-ink-900">Filters</h2>
            {draftActiveCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded bg-paper-sunk px-1.5 text-[11px] font-semibold tabular-nums text-ink-700 border border-line">
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

        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <TrackerFilterForm
            values={draft}
            onChange={setDraft}
            intakeOptions={intakeOptions}
            universityOptions={universityOptions}
            statusCounts={statusCounts}
            totalCount={totalCount}
            idPrefix="df"
          />
        </div>

        {/* Fixed Footer */}
        <TrackerFilterFooter
          hasAnyDraft={draftActiveCount > 0}
          onReset={() => setDraft(EMPTY_TRACKER_FILTERS)}
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
