/* eslint-disable @next/next/no-img-element */

/** Brand mark: the Study in Germany seal. Served as a small PNG (96px, 192px for larger sizes). */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={size > 48 ? "/logo-192.png" : "/logo-96.png"}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${className}`}
      draggable={false}
    />
  );
}

export default function Logo({ size = 32, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {showText && (
        <span className="min-w-0 text-left leading-tight">
          <span className="block truncate text-sm font-semibold text-ink-900">Visa Tracker</span>
          <span className="block truncate text-xs text-mute">by Idrees</span>
        </span>
      )}
    </span>
  );
}
