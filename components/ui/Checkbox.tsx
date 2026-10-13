"use client";

import Icon from "./Icon";

/** Styled checkbox with label and optional description. The real input stays in the DOM for forms and assistive tech. */
export default function Checkbox({ checked, onChange, label, description, id, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; id?: string; disabled?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 py-1 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}>
      <span className="relative mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center">
        <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none rounded-[5px] border border-line-strong bg-paper-raised transition-colors checked:border-ink-800 checked:bg-ink-800 hover:border-ink-300 checked:hover:border-ink-800" />
        <Icon name="check" size={12} strokeWidth={3} className="pointer-events-none relative text-paper-raised opacity-0 peer-checked:opacity-100" />
      </span>
      <span className="min-w-0 text-[13px]">
        <span className="block font-medium text-ink-900">{label}</span>
        {description && <span className="block text-xs text-mute">{description}</span>}
      </span>
    </label>
  );
}
