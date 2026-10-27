"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

/** Search box with a clear button. Calls onChange after the user pauses typing; `value` re-syncs when it changes elsewhere (e.g. URL, Clear all). */
export default function SearchInput({
  value, onChange, placeholder = "Search…", label = "Search", delay = 300, className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  delay?: number;
  className?: string;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => setText(value), [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const push = (v: string, immediate = false) => {
    setText(v);
    clearTimeout(timer.current);
    if (immediate) onChange(v.trim());
    else timer.current = setTimeout(() => onChange(v.trim()), delay);
  };

  return (
    <div className={`relative ${className}`}>
      <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        aria-label={label}
        value={text}
        placeholder={placeholder}
        onChange={(e) => push(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && push(text, true)}
        className="input !min-h-[40px] pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button type="button" aria-label="Clear search" onClick={() => push("", true)} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-mute hover:bg-paper-sunk hover:text-ink-900">
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
