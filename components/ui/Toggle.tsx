"use client";

/**
 * Compact on/off switch row. Takes far less room than a checkbox with a description, and reads as a setting:
 * label on the left, switch on the right. Put several in a grid (`grid gap-2 sm:grid-cols-3`).
 */
export default function Toggle({ checked, onChange, label, hint, id, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; id?: string; disabled?: boolean }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={hint}
      onClick={() => onChange(!checked)}
      className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-[13px] font-medium transition-colors disabled:opacity-50 ${checked ? "border-ink-800 bg-paper-sunk" : "border-line-strong bg-paper-raised hover:bg-paper-sunk"}`}
    >
      <span className="min-w-0 leading-snug">{label}</span>
      <span aria-hidden="true" className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${checked ? "bg-ink-800" : "bg-line-strong"}`}>
        <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-paper-raised shadow transition-[left] ${checked ? "left-[19px]" : "left-[3px]"}`} />
      </span>
    </button>
  );
}
