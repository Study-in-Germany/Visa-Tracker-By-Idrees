"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import type { SessionInfo } from "@/hooks/useSession";
import ApplicantIdentity from "./ApplicantIdentity";
import ApplicantStatusChip from "./ApplicantStatusChip";
import CopyTrackingId from "./CopyTrackingId";

/**
 * Floating applicant details popover (BuildBetter-inspired workspace popover):
 * - Opens beside the sidebar on desktop (falling back underneath when space is tight)
 *   and cleanly within viewport bounds on mobile without blurring or shifting layout.
 * - Closes on outside click, Escape (restoring focus to trigger), navigation, or sidebar collapse.
 */
export default function SidebarAccountPopover({
  open,
  onClose,
  anchorRef,
  session,
  compact,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement>;
  session: SessionInfo;
  compact: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  const place = () => {
    const a = anchorRef.current;
    if (!a || typeof window === "undefined") return;
    const r = a.getBoundingClientRect();
    const asideRight = a.closest("aside")?.getBoundingClientRect().right ?? r.right;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(280, vw - 24);
    const estHeight = panelRef.current?.offsetHeight || 290;

    if (vw >= 768 && asideRight + 8 + w <= vw - 12) {
      // Preferred desktop placement: floating cleanly beside the sidebar
      const left = asideRight + 8;
      const top = Math.max(12, Math.min(r.top, vh - estHeight - 12));
      setPos({ top, left, width: w });
    } else {
      // Collision fallback (or narrow mobile drawer): open cleanly underneath the trigger
      const left = Math.max(12, Math.min(r.left, vw - w - 12));
      const fitsBelow = r.bottom + 8 + estHeight <= vh - 12;
      const top = fitsBelow ? r.bottom + 8 : Math.max(12, r.top - estHeight - 8);
      setPos({ top, left, width: w });
    }
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const id = requestAnimationFrame(place);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, compact]);

  // Close when sidebar collapses/expands or route changes
  const prevCompactRef = useRef(compact);
  useEffect(() => {
    if (prevCompactRef.current !== compact) {
      prevCompactRef.current = compact;
      if (open) onCloseRef.current();
    }
  }, [compact, open]);

  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      if (open) onCloseRef.current();
    }
  }, [pathname, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        requestAnimationFrame(() => anchorRef.current?.focus());
      }
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onCloseRef.current();
    };
    const onMove = () => place();

    let pushedHistory = false;
    if (window.innerWidth < 768) {
      try {
        window.history.pushState({ accountPopover: true }, "");
        pushedHistory = true;
      } catch {}
    }
    const onPopState = () => {
      pushedHistory = false;
      onCloseRef.current();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("popstate", onPopState);
      if (pushedHistory && window.history.state?.accountPopover) {
        try {
          window.history.back();
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !mounted) return null;

  const displayName = session.name?.trim() || session.publicId || "Applicant";

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Applicant account details"
      style={pos ? { position: "fixed", top: pos.top, left: pos.left, width: pos.width } : undefined}
      className={`z-[75] overflow-hidden rounded-xl border border-line bg-paper-raised shadow-lg outline-none ${
        !pos ? "invisible fixed" : ""
      }`}
    >
      {/* Applicant identity header */}
      <div className="border-b border-line px-3.5 py-3">
        <ApplicantIdentity name={displayName} subtitle="Applicant account" size="md" />
      </div>

      {/* Application metadata */}
      <div className="space-y-2.5 border-b border-line px-3.5 py-3">
        {session.publicId && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-mute">
              Tracking ID
            </p>
            <CopyTrackingId publicId={session.publicId} />
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-mute">University</p>
          <p className="mt-0.5 break-words text-[12.5px] font-medium leading-snug text-ink-900">
            {session.university || "Not specified"}
          </p>
        </div>

        {session.visaStatus && (
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-mute">
              Current status
            </p>
            <ApplicantStatusChip status={session.visaStatus} />
          </div>
        )}
      </div>

      {/* Account navigation actions */}
      <div className="p-1.5">
        <Link
          href="/dashboard"
          onClick={() => {
            onClose();
            onNavigate?.();
          }}
          className="flex min-h-[36px] w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-800 transition-colors hover:bg-[rgb(var(--hover))] hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700"
        >
          <Icon name="dashboard" size={15} className="shrink-0 text-mute" />
          <span>My dashboard</span>
        </Link>
        <Link
          href="/dashboard/information"
          onClick={() => {
            onClose();
            onNavigate?.();
          }}
          className="flex min-h-[36px] w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-ink-800 transition-colors hover:bg-[rgb(var(--hover))] hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700"
        >
          <Icon name="user" size={15} className="shrink-0 text-mute" />
          <span>My information</span>
        </Link>
      </div>
    </div>,
    document.body
  );
}
