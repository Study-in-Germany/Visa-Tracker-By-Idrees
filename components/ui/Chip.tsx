import Icon from "./Icon";

/** Static label. `tone` picks a semantic colour; pass `className` to override. */
export function Chip({ children, tone = "neutral", className = "" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "accent"; className?: string }) {
  const tones = {
    neutral: "bg-paper-sunk text-ink-700 border-line-strong",
    good: "bg-emerald-50 text-emerald-800 border-emerald-300",
    warn: "bg-ochre-50 text-ochre-700 border-ochre-500/40",
    bad: "bg-red-50 text-red-800 border-red-300",
    accent: "bg-clay-50 text-clay-600 border-clay-400/40",
  };
  return <span className={`badge ${tones[tone]} ${className}`}>{children}</span>;
}

/** Toggle or removable filter chip with a 40px touch target. */
export function FilterChip({
  label,
  active = false,
  onClick,
  onRemove,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}) {
  const base = "inline-flex min-h-[32px] max-w-full items-center gap-1.5 rounded-lg border px-2.5 text-[13px] transition-colors";
  const tone = active ? "border-ink-800 bg-ink-800 text-paper-raised" : "border-line-strong bg-paper-raised text-ink-700 hover:bg-paper-sunk";
  if (onRemove) {
    return (
      <span className={`${base} ${tone}`}>
        <span className="truncate">{label}</span>
        <button type="button" onClick={onRemove} aria-label={`Remove filter ${label}`} className="-mr-1 grid h-6 w-6 place-items-center rounded-full hover:bg-black/10">
          <Icon name="close" size={14} />
        </button>
      </span>
    );
  }
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`${base} ${tone}`}>
      <span className="truncate">{label}</span>
    </button>
  );
}
