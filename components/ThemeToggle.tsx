"use client";

import Icon from "@/components/ui/Icon";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); }} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`} className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-700 transition-colors hover:bg-paper-sunk ${className}`}>
      <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
    </button>
  );
}
