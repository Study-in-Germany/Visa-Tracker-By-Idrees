"use client";

import { VISA_STATUS_HEX, VISA_STATUS_LABELS, VISA_STATUS_SHORT } from "@/lib/constants";

type StatusTone = {
  idle: string;
  selected: string;
};

const STATUS_CHIP_TONES: Record<string, StatusTone> = {
  WAITING_LIST: {
    idle: "border-slate-300 bg-slate-100/80 text-slate-700 hover:bg-slate-200/70 dark:border-slate-500/35 dark:bg-slate-500/15 dark:text-slate-200 dark:hover:bg-slate-500/25",
    selected:
      "border-slate-500 bg-slate-200 text-slate-950 ring-1 ring-inset ring-slate-500/35 dark:border-slate-300 dark:bg-slate-500/30 dark:text-white dark:ring-slate-300/40",
  },
  WAITING_FOR_SUBMISSION: {
    idle: "border-cyan-300 bg-cyan-50/90 text-cyan-800 hover:bg-cyan-100/80 dark:border-cyan-500/35 dark:bg-cyan-500/15 dark:text-cyan-200 dark:hover:bg-cyan-500/25",
    selected:
      "border-cyan-600 bg-cyan-100 text-cyan-950 ring-1 ring-inset ring-cyan-600/35 dark:border-cyan-300 dark:bg-cyan-500/30 dark:text-cyan-50 dark:ring-cyan-300/40",
  },
  SUBMISSION_RECEIVED: {
    idle: "border-blue-300 bg-blue-50/90 text-blue-800 hover:bg-blue-100/80 dark:border-blue-500/35 dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/25",
    selected:
      "border-blue-600 bg-blue-100 text-blue-950 ring-1 ring-inset ring-blue-600/35 dark:border-blue-300 dark:bg-blue-500/30 dark:text-blue-50 dark:ring-blue-300/40",
  },
  UNDER_CORRECTION: {
    idle: "border-amber-300 bg-amber-50/90 text-amber-800 hover:bg-amber-100/80 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25",
    selected:
      "border-amber-600 bg-amber-100 text-amber-950 ring-1 ring-inset ring-amber-600/35 dark:border-amber-300 dark:bg-amber-500/30 dark:text-amber-50 dark:ring-amber-300/40",
  },
  APPOINTMENT_SCHEDULED: {
    idle: "border-teal-300 bg-teal-50/90 text-teal-800 hover:bg-teal-100/80 dark:border-teal-500/35 dark:bg-teal-500/15 dark:text-teal-200 dark:hover:bg-teal-500/25",
    selected:
      "border-teal-600 bg-teal-100 text-teal-950 ring-1 ring-inset ring-teal-600/35 dark:border-teal-300 dark:bg-teal-500/30 dark:text-teal-50 dark:ring-teal-300/40",
  },
  PROCESSING: {
    idle: "border-violet-300 bg-violet-50/90 text-violet-800 hover:bg-violet-100/80 dark:border-violet-500/35 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/25",
    selected:
      "border-violet-600 bg-violet-100 text-violet-950 ring-1 ring-inset ring-violet-600/35 dark:border-violet-300 dark:bg-violet-500/30 dark:text-violet-50 dark:ring-violet-300/40",
  },
  VISA_ISSUED: {
    idle: "border-green-300 bg-green-50/90 text-green-800 hover:bg-green-100/80 dark:border-green-500/35 dark:bg-green-500/15 dark:text-green-200 dark:hover:bg-green-500/25",
    selected:
      "border-green-600 bg-green-100 text-green-950 ring-1 ring-inset ring-green-600/35 dark:border-green-300 dark:bg-green-500/30 dark:text-green-50 dark:ring-green-300/40",
  },
  VISA_REJECTED: {
    idle: "border-red-300 bg-red-50/90 text-red-800 hover:bg-red-100/80 dark:border-red-500/35 dark:bg-red-500/15 dark:text-red-200 dark:hover:bg-red-500/25",
    selected:
      "border-red-600 bg-red-100 text-red-950 ring-1 ring-inset ring-red-600/35 dark:border-red-300 dark:bg-red-500/30 dark:text-red-50 dark:ring-red-300/40",
  },
  WITHDRAWN: {
    idle: "border-neutral-300 bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80 dark:border-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-700/80",
    selected:
      "border-neutral-600 bg-neutral-200 text-neutral-950 ring-1 ring-inset ring-neutral-600/35 dark:border-neutral-300 dark:bg-neutral-700 dark:text-white dark:ring-neutral-300/40",
  },
  OTHER: {
    idle: "border-neutral-300 bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80 dark:border-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-700/80",
    selected:
      "border-neutral-600 bg-neutral-200 text-neutral-950 ring-1 ring-inset ring-neutral-600/35 dark:border-neutral-300 dark:bg-neutral-700 dark:text-white dark:ring-neutral-300/40",
  },
};

export interface StatusChipProps {
  /** VisaStatus enum key or "ALL" for the neutral monochrome All filter chip. */
  status: string;
  /** Override displayed text (defaults to short or full label). */
  label?: string;
  short?: boolean;
  count?: number;
  selected?: boolean;
  onClick?: () => void;
  title?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Canonical compact rectangular status chip (4-6px corner radius, semantic status dot,
 * subtle semantic border/background, accessible selected state). Shared across status filter
 * bars, table badges, mobile cards, and detail pages.
 */
export default function StatusChip({
  status,
  label,
  short = false,
  count,
  selected = false,
  onClick,
  title,
  size = "sm",
  className = "",
}: StatusChipProps) {
  const isAll = status === "ALL";
  const resolvedLabel =
    label ??
    (isAll ? "All" : (short ? VISA_STATUS_SHORT[status] : VISA_STATUS_LABELS[status]) || status);
  const hex = !isAll ? VISA_STATUS_HEX[status] || VISA_STATUS_HEX.OTHER : null;

  const toneClass = isAll
    ? selected
      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950"
      : "border-line-strong bg-card text-ink-800 hover:bg-[rgb(var(--hover))]"
    : selected
      ? (STATUS_CHIP_TONES[status] ?? STATUS_CHIP_TONES.OTHER).selected
      : (STATUS_CHIP_TONES[status] ?? STATUS_CHIP_TONES.OTHER).idle;

  const sizeClass =
    size === "md"
      ? "h-[30px] rounded-[5px] px-2.5 text-[12px] font-semibold"
      : "h-[24px] rounded-[5px] px-2 text-[11px] font-medium";

  const interactiveClass = onClick
    ? "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-1"
    : "";

  const content = (
    <>
      {hex && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: hex }}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{resolvedLabel}</span>
      {count !== undefined && (
        <span className="tabular-nums opacity-75">{count.toLocaleString("en-US")}</span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        title={title ?? (!isAll ? VISA_STATUS_LABELS[status] : "All statuses")}
        onClick={onClick}
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border ${sizeClass} ${toneClass} ${interactiveClass} ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border ${sizeClass} ${toneClass} ${className}`}
    >
      {content}
    </span>
  );
}
