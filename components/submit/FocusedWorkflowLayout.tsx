"use client";

import { useEffect } from "react";
import GermanFlagBar from "@/components/ui/GermanFlagBar";
import Icon from "@/components/ui/Icon";

/**
 * Dedicated full-height focused workflow layout (`min-h-[100dvh]`) with:
 * - Safe-area aware contextual top bar (Back chevron, title, Cancel action)
 * - Compact progress strip
 * - Scrollable content area with generous bottom padding
 * - Sticky safe-area-aware action footer + mobile virtual keyboard input focus safety
 */
export default function FocusedWorkflowLayout({
  title,
  step,
  totalSteps,
  stepLabel,
  onBack,
  onCancel,
  hideCancel = false,
  footer,
  aside,
  children,
}: {
  title: string;
  step?: number;
  totalSteps?: number;
  stepLabel?: string;
  onBack: () => void;
  onCancel?: () => void;
  hideCancel?: boolean;
  footer?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Keep focused text/date inputs scrolled smoothly into view when the virtual keyboard shrinks visualViewport
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;
    const onResize = () => {
      const active = document.activeElement as HTMLElement | null;
      if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) {
        requestAnimationFrame(() => active.scrollIntoView({ block: "nearest", behavior: "smooth" }));
      }
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const hasSteps = typeof step === "number" && typeof totalSteps === "number" && totalSteps > 0;
  const pct = hasSteps ? Math.round(((step! + 1) / totalSteps!) * 100) : 0;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-paper">
      <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-[rgb(var(--chrome))] pt-[env(safe-area-inset-top)]">
        <GermanFlagBar />
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-2.5 sm:px-5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-800 hover:bg-[rgb(var(--hover))]"
          >
            <Icon name="arrowLeft" size={20} />
          </button>

          <h1 className="min-w-0 flex-1 truncate text-center text-[16px] font-bold tracking-tight text-ink-900 sm:text-left sm:text-[17px]">
            {title}
          </h1>

          {!hideCancel && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-mute hover:bg-[rgb(var(--hover))] hover:text-ink-900"
            >
              <Icon name="close" size={16} className="sm:hidden" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
          ) : (
            <span className="w-11 shrink-0" aria-hidden="true" />
          )}
        </div>

        {hasSteps && (
          <div className="mx-auto max-w-5xl border-t border-line/70 px-4 py-2 sm:px-5 lg:hidden">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-ink-900">{stepLabel}</span>
              <span className="tabular-nums text-mute">
                Step {step! + 1} of {totalSteps}
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-sunk"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-valuenow={step! + 1}
            >
              <div
                className="h-full rounded-full bg-blue-600 transition-all dark:bg-[#FAFAFA]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-4 pb-8 sm:px-5 sm:py-5">
        {aside ? (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_248px]">
            <div className="min-w-0">{children}</div>
            <aside className="hidden space-y-3 lg:sticky lg:top-20 lg:block">{aside}</aside>
          </div>
        ) : (
          children
        )}
      </main>

      {footer && (
        <footer className="sticky bottom-0 z-20 shrink-0 border-t border-line bg-[rgb(var(--chrome)/0.96)] px-3 py-2.5 pb-[calc(0.65rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-5xl flex-row-reverse items-center gap-2">{footer}</div>
        </footer>
      )}
    </div>
  );
}
