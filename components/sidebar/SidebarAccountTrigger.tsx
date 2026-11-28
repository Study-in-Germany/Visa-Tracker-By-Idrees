"use client";

import { useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/States";
import type { SessionInfo } from "@/hooks/useSession";
import ApplicantIdentity from "./ApplicantIdentity";
import SidebarAccountPopover from "./SidebarAccountPopover";

/**
 * Compact BuildBetter-inspired account selector placed in the fixed sidebar header.
 * - Expanded: rounded neutral trigger with 28px avatar, truncated applicant name, and ChevronsUpDown.
 * - Collapsed: centered 36px avatar-only button aligned with logo, nav icons, and Log out.
 * - Unauthenticated/admin: renders nothing (never displays placeholder/demo names).
 */
export default function SidebarAccountTrigger({
  session,
  compact = false,
  onNavigate,
}: {
  session: SessionInfo & { loading?: boolean };
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (session.role !== "applicant") return null;

  if (session.loading && !session.name && !session.publicId) {
    return compact ? (
      <div className="flex justify-center" aria-hidden="true">
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    ) : (
      <div
        className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-line bg-paper-sunk/60 px-2"
        aria-hidden="true"
      >
        <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
        <Skeleton className="h-3.5 flex-1" />
      </div>
    );
  }

  const displayName = session.name?.trim() || session.publicId || "Applicant";

  return (
    <>
      {compact ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Account menu for ${displayName}`}
          title={displayName}
          className="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-neutral-900 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700 dark:bg-[#FAFAFA] dark:text-[#0A0A0A]"
        >
          {(displayName[0] || "?").toUpperCase()}
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Account menu for ${displayName}`}
          className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-line bg-paper-sunk/80 px-2 text-left transition-colors hover:bg-[rgb(var(--hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700 dark:bg-[#1C1C1C]"
        >
          <div className="min-w-0 flex-1">
            <ApplicantIdentity name={displayName} size="sm" />
          </div>
          <Icon name="chevronsUpDown" size={14} className="shrink-0 text-mute" />
        </button>
      )}

      <SidebarAccountPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        session={session}
        compact={compact}
        onNavigate={onNavigate}
      />
    </>
  );
}
