"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import Popover from "./Popover";

export type Option = { value: string; label: string; hint?: string };

/**
 * Custom single-select. Keyboard: Arrow keys / Home / End move, Enter or Space picks,
 * Escape closes, typing jumps to a match. Bottom sheet on phones.
 */
export default function Select({
  value,
  onChange,
  options: given,

  placeholder = "Select…",
  label,
  id,
  disabled,
  className = "",
  variant = "field",
  prefix,
  clearable,
  buttonClassName = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  /** Accessible name (also used as the mobile sheet title). */
  label: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** field: form control. pill: compact filter control. */
  variant?: "field" | "pill";
  /** Muted text shown before the value, e.g. "Status". */
  prefix?: string;
  clearable?: boolean;
  /** Extra classes for the trigger button itself (e.g. to match a neighbouring button's height and shape). */
  buttonClassName?: string;
}) {
  // A stored value that is not in the list (older free-text data) stays visible and selectable.
  const options = useMemo(() => (value && !given.some((o) => o.value === value) ? [{ value, label: value }, ...given] : given), [given, value]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", t: 0 });
  const uid = useId();

  const selectedIndex = useMemo(() => options.findIndex((o) => o.value === value), [options, value]);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  useEffect(() => {
    if (open) setActive(Math.max(0, selectedIndex));
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const pick = (i: number) => {
    const o = options[i];
    if (!o) return;
    onChange(o.value);
    setOpen(false);
    btnRef.current?.focus();
  };

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (k === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (k === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (k === "Home") { e.preventDefault(); setActive(0); }
    else if (k === "End") { e.preventDefault(); setActive(options.length - 1); }
    else if (k === "Enter" || k === " ") { e.preventDefault(); pick(active); }
    else if (k === "Tab") setOpen(false);
    else if (k.length === 1) {
      const now = Date.now();
      typed.current.text = now - typed.current.t > 600 ? k.toLowerCase() : typed.current.text + k.toLowerCase();
      typed.current.t = now;
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (i >= 0) setActive(i);
    }
  }

  const pill = variant === "pill";
  const showClear = clearable && !!value && !disabled;

  return (
    <div className={`relative ${pill ? "inline-block" : "block"} ${className}`}>
      <button
        ref={btnRef}
        id={id}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${uid}-list`}
        aria-activedescendant={open ? `${uid}-${active}` : undefined}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-2 border bg-paper-raised text-left transition-colors hover:border-ink-300 disabled:cursor-not-allowed disabled:opacity-50 ${
          pill ? "min-h-[32px] rounded-lg px-2.5 text-[13px]" : "min-h-[36px] rounded-lg px-3 text-[13px]"
        } ${open ? "border-ink-600 ring-1 ring-ink-600" : "border-line-strong"} ${showClear ? "pr-8" : ""} ${buttonClassName}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {prefix && <span className="shrink-0 text-mute">{prefix}</span>}
          <span className={`truncate ${selected ? "text-ink-900" : "text-ink-300"} ${prefix && selected ? "font-medium" : ""}`}>{selected ? selected.label : placeholder}</span>
        </span>
        <Icon name="chevronDown" size={14} className={`shrink-0 text-mute transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {showClear && (
        <button type="button" aria-label={`Clear ${label}`} onClick={() => onChange("")} className="absolute right-6 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-mute hover:bg-paper-sunk hover:text-ink-900">
          <Icon name="close" size={12} />
        </button>
      )}

      <Popover open={open} onClose={() => setOpen(false)} anchorRef={btnRef as React.RefObject<HTMLElement>} title={label} minWidth={pill ? 240 : 0}>
        <ul ref={listRef} id={`${uid}-list`} role="listbox" aria-label={label} className="p-1">
          {options.map((o, i) => {
            const isSel = o.value === value;
            return (
              <li
                key={o.value || "__empty"}
                id={`${uid}-${i}`}
                data-i={i}
                role="option"
                aria-selected={isSel}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(i)}
                className={`flex min-h-[36px] cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-[13px] ${i === active ? "bg-paper-sunk" : ""} ${isSel ? "font-semibold" : ""}`}
              >
                <span className="min-w-0">
                  <span className="block truncate">{o.label}</span>
                  {o.hint && <span className="block truncate text-xs font-normal text-mute">{o.hint}</span>}
                </span>
                {isSel && <Icon name="check" size={14} className="shrink-0 text-clay-500" />}
              </li>
            );
          })}
        </ul>
      </Popover>
    </div>
  );
}
