const FIGURES = 4;

function PersonGlyph({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 14 22" className={`absolute inset-0 h-full w-full ${className}`} fill="currentColor">
      <circle cx="7" cy="4.5" r="3.5" />
      <path d="M1.5 20v-7a5.5 5.5 0 0 1 11 0v7a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 20Z" />
    </svg>
  );
}

/**
 * Approximate people-ratio graphic derived from the real correction percentage.
 * Four figures represent 25% each; the amber portion is clipped from the left, so 26% fills one
 * figure plus a sliver and 50% fills two. Decorative: the exact figures are given in text.
 */
export default function CorrectionRatio({ percent }: { percent: number | null }) {
  const p = percent === null ? 0 : Math.max(0, Math.min(100, percent));

  return (
    <span aria-hidden="true" data-testid="correction-ratio" className="inline-flex items-end gap-1.5">
      {Array.from({ length: FIGURES }, (_, i) => {
        const fill = Math.max(0, Math.min(1, (p - i * (100 / FIGURES)) / (100 / FIGURES)));
        return (
          <span
            key={i}
            data-testid="correction-person"
            data-fill={fill.toFixed(2)}
            className="relative block h-[22px] w-[14px]"
          >
            <PersonGlyph className="text-neutral-300 dark:text-neutral-600" />
            {fill > 0 && (
              <span className="absolute inset-0 block" style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }}>
                <PersonGlyph className="text-amber-600 dark:text-amber-400" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
