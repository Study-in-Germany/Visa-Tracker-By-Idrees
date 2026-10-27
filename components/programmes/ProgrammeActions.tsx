"use client";

import Icon from "@/components/ui/Icon";
import { COMPARE_KEY, COMPARE_MAX, SAVED_PROGRAMMES_KEY, useSaved } from "@/hooks/useSaved";

/** Bookmark toggle (heart). */
export function BookmarkButton({ id, label = false }: { id: string; label?: boolean }) {
  const { isSaved, toggle } = useSaved(SAVED_PROGRAMMES_KEY);
  const on = isSaved(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Remove bookmark" : "Bookmark this programme"}
      title={on ? "Bookmarked" : "Bookmark"}
      onClick={(e) => { e.stopPropagation(); toggle(id); }}
      className={label ? "btn-secondary !min-h-[40px] gap-1.5" : "grid h-9 w-9 place-items-center rounded-full text-ink-700 hover:bg-paper-sunk"}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill={on ? "rgb(var(--clay-500))" : "none"} stroke={on ? "rgb(var(--clay-500))" : "currentColor"} strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3 5 6.5 5c2 0 3.5 1.1 5.5 3.2C14 6.1 15.5 5 17.5 5 21 5 22.8 8.6 21.5 11.8 19.5 16.4 12 21 12 21z" />
      </svg>
      {label && <span>{on ? "Bookmarked" : "Bookmark"}</span>}
    </button>
  );
}

/** Adds or removes a programme from the comparison list (up to three at a time). */
export function CompareToggle({ id, label = false }: { id: string; label?: boolean }) {
  const { isSaved, toggle, ids } = useSaved(COMPARE_KEY, COMPARE_MAX);
  const on = isSaved(id);
  const full = !on && ids.length >= COMPARE_MAX;
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={full}
      aria-label={on ? "Remove from comparison" : full ? `You can compare up to ${COMPARE_MAX} programmes` : "Add to comparison"}
      title={full ? `Up to ${COMPARE_MAX} programmes` : on ? "In comparison" : "Compare"}
      onClick={(e) => { e.stopPropagation(); toggle(id); }}
      className={label
        ? `btn-secondary !min-h-[40px] gap-1.5 ${on ? "!border-ink-800 !bg-paper-sunk" : ""}`
        : `grid h-9 w-9 place-items-center rounded-lg border transition-colors disabled:opacity-40 ${on ? "border-ink-800 bg-ink-800 text-paper-raised" : "border-line-strong text-ink-700 hover:bg-paper-sunk"}`}
    >
      <Icon name={on ? "check" : "layers"} size={15} />
      {label && <span>{on ? "In comparison" : "Compare"}</span>}
    </button>
  );
}
