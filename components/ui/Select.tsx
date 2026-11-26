"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import Popover from "./Popover";

export type Option = { value: string; label: string; hint?: string };

/**
 * Custom single-select with accessible keyboard navigation, bottom sheet on phones,
 * and optional integrated search filtering.
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
  searchable = false,
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
  /** Extra classes for the trigger button itself. */
  buttonClassName?: string;
  /** Enable text filtering within the menu */
  searchable?: boolean;
}) {
  const baseOptions = useMemo(
    () => (value && !given.some((o) => o.value === value) ? [{ value, label: value }, ...given] : given),
    [given, value]
  );

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", t: 0 });
  const uid = useId();

  const isSearchActive = searchable || baseOptions.length > 8;

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return baseOptions;
    const q = searchTerm.toLowerCase();
    return baseOptions.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint && o.hint.toLowerCase().includes(q))
    );
  }, [baseOptions, searchTerm]);

  const selectedIndex = useMemo(
    () => filteredOptions.findIndex((o) => o.value === value),
    [filteredOptions, value]
  );
  const selected = baseOptions.find((o) => o.value === value) || null;

  useEffect(() => {
    if (open) {
      setActive(Math.max(0, selectedIndex));
      setSearchTerm("");
      if (isSearchActive) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
  }, [open, selectedIndex, isSearchActive]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const pick = (i: number) => {
    const o = filteredOptions[i];
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
    if (k === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filteredOptions.length - 1, a + 1));
    } else if (k === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (k === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (k === "End") {
      e.preventDefault();
      setActive(filteredOptions.length - 1);
    } else if (k === "Enter") {
      e.preventDefault();
      pick(active);
    } else if (k === "Tab" || k === "Escape") {
      setOpen(false);
    } else if (!isSearchActive && k.length === 1) {
      const now = Date.now();
      typed.current.text = now - typed.current.t > 600 ? k.toLowerCase() : typed.current.text + k.toLowerCase();
      typed.current.t = now;
      const i = filteredOptions.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
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
          pill ? "min-h-[32px] rounded-lg px-2.5 text-[13px]" : "min-h-[38px] rounded-lg px-3 text-[13px]"
        } ${open ? "border-ink-600 ring-1 ring-ink-600" : "border-line-strong"} ${
          showClear ? "pr-8" : ""
        } ${buttonClassName}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {prefix && <span className="shrink-0 text-mute">{prefix}</span>}
          <span
            className={`truncate ${
              selected ? "text-ink-900" : "text-mute"
            } ${prefix && selected ? "font-medium" : ""}`}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <Icon
          name="chevronDown"
          size={14}
          className={`shrink-0 text-mute transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {showClear && (
        <button
          type="button"
          aria-label={`Clear ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
          className="absolute right-6 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-mute hover:bg-paper-sunk hover:text-ink-900"
        >
          <Icon name="close" size={12} />
        </button>
      )}

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={btnRef as React.RefObject<HTMLElement>}
        title={label}
        minWidth={pill ? 240 : 220}
      >
        <div className="flex flex-col max-h-[340px]">
          {isSearchActive && (
            <div className="p-2 border-b border-line bg-paper-raised sticky top-0 z-10">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={`Search ${label.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onKeyDown}
                  className="w-full bg-paper text-ink-900 text-xs rounded-md pl-7 pr-2.5 py-1.5 border border-line-strong focus:outline-none focus:ring-1 focus:ring-ink-600"
                />
                <div className="absolute left-2 top-2 text-mute">
                  <Icon name="search" size={12} />
                </div>
              </div>
            </div>
          )}

          <ul
            ref={listRef}
            id={`${uid}-list`}
            role="listbox"
            aria-label={label}
            className="p-1 overflow-y-auto flex-1"
          >
            {filteredOptions.length === 0 ? (
              <li className="p-3 text-center text-xs text-mute">No options found</li>
            ) : (
              filteredOptions.map((o, i) => {
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
                    className={`flex min-h-[36px] cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                      i === active ? "bg-paper-sunk" : ""
                    } ${isSel ? "font-semibold text-ink-900" : "text-ink-800"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{o.label}</span>
                      {o.hint && <span className="block truncate text-xs font-normal text-mute">{o.hint}</span>}
                    </span>
                    {isSel && <Icon name="check" size={14} className="shrink-0 text-blue-500" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </Popover>
    </div>
  );
}
