"use client";

import Link from "next/link";
import type { SessionInfo } from "@/hooks/useSession";
import { VISA_STATUS_HEX, VISA_STATUS_LABELS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/States";

/**
 * Valley-inspired sidebar/mobile profile card displaying authenticated applicant's
 * live identity, Tracking ID, university, and semantic application status.
 */
export default function ApplicantProfileCard({
  session,
  compact = false,
  onNavigate,
  className = "",
}: {
  session: SessionInfo & { loading?: boolean };
  compact?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  if (session.role !== "applicant") return null;

  if (session.loading && !session.name && !session.publicId) {
    return compact ? (
      <div className={`flex justify-center py-0.5 ${className}`} aria-hidden="true">
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    ) : (
      <div className={`rounded-xl border border-line bg-paper-sunk/80 p-2.5 dark:bg-[#1C1C1C] ${className}`} aria-hidden="true">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <div className="mt-2 space-y-1.5 border-t border-line/70 pt-2">
          <Skeleton className="h-2.5 w-32" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      </div>
    );
  }

  const displayName = session.name?.trim() || session.publicId || "Applicant";
  const initial = displayName.charAt(0).toUpperCase();
  const statusLabel = session.visaStatus
    ? VISA_STATUS_LABELS[session.visaStatus] || session.visaStatus
    : null;
  const statusHex = session.visaStatus ? VISA_STATUS_HEX[session.visaStatus] || "#737373" : "#737373";
  const tooltip = [displayName, session.publicId, session.university, statusLabel].filter(Boolean).join(" · ");

  if (compact) {
    return (
      <Link
        href="/dashboard/information"
        onClick={onNavigate}
        title={tooltip}
        aria-label={tooltip}
        className={`mx-auto grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-xs font-bold text-white transition-opacity hover:opacity-90 dark:bg-[#FAFAFA] dark:text-[#0A0A0A] ${className}`}
      >
        {initial}
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard/information"
      onClick={onNavigate}
      className={`block rounded-xl border border-line bg-paper-sunk/80 px-2.5 py-2 transition-colors hover:bg-[rgb(var(--hover))] dark:bg-[#1C1C1C] ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-xs font-bold text-white dark:bg-[#FAFAFA] dark:text-[#0A0A0A]"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-ink-900" title={displayName}>
            {displayName}
          </p>
          {session.publicId && (
            <p className="mt-0.5 truncate font-mono text-[11px] leading-tight text-mute" title={session.publicId}>
              {session.publicId}
            </p>
          )}
        </div>
      </div>

      <div className="mt-1.5 space-y-1 border-t border-line/70 pt-1.5">
        <p
          className="truncate text-[11px] leading-snug text-ink-700"
          title={session.university || undefined}
        >
          {session.university || "University not set"}
        </p>
        {statusLabel && (
          <div className="flex min-w-0 items-center gap-1.5" title={statusLabel}>
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: statusHex }}
            />
            <span className="truncate text-[11px] font-medium leading-tight text-ink-800">
              {statusLabel}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
