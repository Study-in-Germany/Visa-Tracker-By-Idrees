"use client";

/**
 * Neutral monochrome applicant avatar + name (+ optional subtitle),
 * used inside both the compact sidebar header trigger and the floating account popover.
 */
export default function ApplicantIdentity({
  name,
  subtitle,
  size = "sm",
  showText = true,
}: {
  name: string;
  subtitle?: string;
  size?: "sm" | "md";
  showText?: boolean;
}) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  const boxCls =
    size === "md"
      ? "h-9 w-9 rounded-lg text-[13px]"
      : "h-7 w-7 rounded-md text-xs";

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center bg-neutral-900 font-semibold text-white dark:bg-[#FAFAFA] dark:text-[#0A0A0A] ${boxCls}`}
      >
        {initial}
      </span>
      {showText && (
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[13px] font-medium leading-tight text-ink-900" title={name}>
            {name}
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-[11px] leading-tight text-mute">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}
