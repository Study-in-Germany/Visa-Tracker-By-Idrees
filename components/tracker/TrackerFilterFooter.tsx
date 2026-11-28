"use client";

import Button from "@/components/ui/Button";

/**
 * Balanced two-action fixed footer shared by desktop filter drawer and mobile bottom sheet.
 */
export default function TrackerFilterFooter({
  onReset,
  onApply,
  hasAnyDraft,
  safeAreaBottom = false,
}: {
  onReset: () => void;
  onApply: () => void;
  hasAnyDraft: boolean;
  safeAreaBottom?: boolean;
}) {
  return (
    <div
      className={`grid shrink-0 grid-cols-2 gap-2.5 border-t border-line bg-paper-raised px-5 py-3.5 ${
        safeAreaBottom ? "pb-[calc(0.875rem+env(safe-area-inset-bottom))]" : ""
      }`}
    >
      <Button
        type="button"
        variant="secondary"
        className="!min-h-[40px] w-full !text-xs font-semibold"
        onClick={onReset}
        disabled={!hasAnyDraft}
      >
        Reset filters
      </Button>
      <Button
        type="button"
        variant="primary"
        className="!min-h-[40px] w-full !text-xs font-semibold"
        onClick={onApply}
      >
        Apply filters
      </Button>
    </div>
  );
}
