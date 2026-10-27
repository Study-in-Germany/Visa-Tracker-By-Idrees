"use client";

import Icon, { type IconName } from "@/components/ui/Icon";

export const CATEGORIES: { value: string; label: string; icon: IconName }[] = [
  { value: "", label: "All", icon: "grid" },
  { value: "ROOM", label: "Rooms", icon: "home" },
  { value: "SHARED_ROOM", label: "Shared rooms", icon: "users" },
  { value: "STUDIO", label: "Studios", icon: "building" },
  { value: "APARTMENT", label: "Apartments", icon: "layers" },
  { value: "WANTED", label: "Requests", icon: "search" },
];

const Heart = ({ filled }: { filled: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3 5 6.5 5c2 0 3.5 1.1 5.5 3.2C14 6.1 15.5 5 17.5 5 21 5 22.8 8.6 21.5 11.8 19.5 16.4 12 21 12 21z" /></svg>
);

/**
 * Marketplace toolbar. Category tabs always get a full-width, sideways-scrolling row of their own.
 * The controls (`actions`: sort, filters, plus Saved) sit to the right of it on wide screens and on a second row on phones,
 * where each one gets a finger-sized share of the width instead of being squeezed beside the tabs.
 */
export default function CategoryBar({ value, onChange, savedCount, savedActive, onSaved, actions }: { value: string; onChange: (v: string) => void; savedCount: number; savedActive: boolean; onSaved: () => void; actions?: React.ReactNode }) {
  const tab = "relative flex min-h-[60px] shrink-0 flex-col items-center justify-center gap-1 px-3 text-[12px] font-medium transition-colors sm:px-3.5";
  const savedLabel = `Saved${savedCount > 0 ? ` (${savedCount})` : ""}`;
  return (
    <div className="mb-4 sm:flex sm:items-stretch sm:border-b sm:border-line">
      <div role="tablist" aria-label="Categories" className="-mx-3 flex min-w-0 flex-1 items-stretch gap-0.5 overflow-x-auto border-b border-line px-3 [scrollbar-width:none] sm:mx-0 sm:border-b-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => {
          const on = !savedActive && value === c.value;
          return (
            <button key={c.value} type="button" role="tab" aria-selected={on} onClick={() => onChange(c.value)} className={`${tab} ${on ? "text-ink-900" : "text-mute hover:text-ink-900"}`}>
              <Icon name={c.icon} size={20} strokeWidth={on ? 2.1 : 1.7} />
              {c.label}
              {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink-900" />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 sm:mt-0 sm:shrink-0 sm:pl-3 [&>button:not([role=tab])]:flex-1 sm:[&>button:not([role=tab])]:flex-none">
        {actions}
        {/* Phones: Saved is a pill beside the other controls */}
        <button type="button" aria-pressed={savedActive} onClick={onSaved} className={`btn-secondary !min-h-[40px] !rounded-full !px-3.5 sm:hidden ${savedActive ? "!border-ink-800 !bg-paper-sunk" : ""}`}>
          <Heart filled={savedActive} /> <span className="text-[13px]">{savedLabel}</span>
        </button>
        {/* Larger screens: Saved is a tab, like the categories */}
        <button type="button" role="tab" aria-selected={savedActive} onClick={onSaved} className={`${tab} hidden min-w-[56px] sm:flex ${savedActive ? "text-ink-900" : "text-mute hover:text-ink-900"}`}>
          <Heart filled={savedActive} />
          {savedLabel}
          {savedActive && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink-900" />}
        </button>
      </div>
    </div>
  );
}
