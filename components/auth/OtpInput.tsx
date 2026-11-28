"use client";

import { useEffect, useRef } from "react";

type OtpInputProps = {
  value: string[];
  onChange: (digits: string[]) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
  onComplete?: (code: string) => void;
};

/**
 * Accessible 6-digit OTP verification input:
 * - Numeric mobile keyboard (`inputMode="numeric"`)
 * - SMS / OTP autofill (`autoComplete="one-time-code"` on first input)
 * - Automatic focus progression, Backspace navigation, and full 6-digit paste support
 */
export default function OtpInput({
  value,
  onChange,
  disabled = false,
  hasError = false,
  autoFocus = true,
  onComplete,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => refs.current[0]?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  function commitDigits(next: string[], focusIndex?: number) {
    onChange(next);
    if (typeof focusIndex === "number") {
      refs.current[focusIndex]?.focus();
    }
    const joined = next.join("");
    if (joined.length === 6 && /^\d{6}$/.test(joined) && onComplete) {
      onComplete(joined);
    }
  }

  function handleChange(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      const next = [...value];
      next[index] = "";
      commitDigits(next);
      return;
    }

    // Handle multi-digit autofill (e.g. iOS/Android one-time-code)
    if (clean.length > 1) {
      const next = [...value];
      for (let i = 0; i < 6 && index + i < 6; i++) {
        next[index + i] = clean[i] ?? "";
      }
      const nextFocus = Math.min(5, index + clean.length);
      commitDigits(next, nextFocus);
      return;
    }

    const next = [...value];
    next[index] = clean.slice(-1);
    const nextFocus = index < 5 ? index + 1 : 5;
    commitDigits(next, index < 5 ? nextFocus : undefined);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) {
        const next = [...value];
        next[index - 1] = "";
        commitDigits(next, index - 1);
        e.preventDefault();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      refs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    commitDigits(next, Math.min(pasted.length, 5));
  }

  return (
    <div className="grid grid-cols-6 gap-2" role="group" aria-label="6-digit verification code">
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of 6`}
          maxLength={index === 0 ? 6 : 1}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`h-12 w-full rounded-xl border-2 text-center font-mono text-lg font-bold transition-colors focus:outline-none sm:h-13 ${
            hasError
              ? "border-red-400 bg-red-50 text-red-700 focus:border-red-500 dark:bg-red-950/30 dark:text-red-300"
              : digit
                ? "border-blue-600 bg-paper-raised text-ink-900 focus:border-blue-600"
                : "border-line-strong bg-paper-sunk text-ink-900 focus:border-blue-600 focus:bg-paper-raised"
          }`}
        />
      ))}
    </div>
  );
}
