"use client";

import { useSaved } from "@/hooks/useSaved";

/** Heart toggle. `overlay` styles it as a translucent round button on top of a photo; otherwise a plain bordered button. */
export default function SaveButton({ id, overlay = false, link = false }: { id: string; overlay?: boolean; link?: boolean }) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(id);
  const heart = (
    <svg width="17" height="17" viewBox="0 0 24 24" fill={saved ? "rgb(var(--clay-500))" : "none"} stroke={saved ? "rgb(var(--clay-500))" : "currentColor"} strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3 5 6.5 5c2 0 3.5 1.1 5.5 3.2C14 6.1 15.5 5 17.5 5 21 5 22.8 8.6 21.5 11.8 19.5 16.4 12 21 12 21z" />
    </svg>
  );
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved places" : "Save this place"}
      title={saved ? "Saved" : "Save"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(id); }}
      className={overlay ? "grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/30 text-white backdrop-blur-md transition-transform hover:scale-105" : link ? "inline-flex min-h-[40px] items-center gap-2 rounded-lg px-2.5 text-[14px] font-medium underline underline-offset-2 hover:bg-paper-sunk" : "btn-secondary !min-h-[40px] gap-1.5"}
    >
      {heart}
      {!overlay && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
