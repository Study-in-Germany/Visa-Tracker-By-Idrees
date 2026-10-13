"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";

/** Text input that can reveal its value (used for access codes and passwords). */
export default function PasswordInput({ id, value, onChange, autoComplete, placeholder, required }: { id: string; value: string; onChange: (v: string) => void; autoComplete?: string; placeholder?: string; required?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        className="input !min-h-[40px] pr-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
      />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide" : "Show"} aria-pressed={show} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-mute hover:bg-paper-sunk hover:text-ink-900">
        <Icon name={show ? "eyeOff" : "eye"} size={16} />
      </button>
    </div>
  );
}
