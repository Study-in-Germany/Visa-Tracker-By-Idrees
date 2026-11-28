"use client";

import { whatsappSupportUrl } from "@/lib/whatsapp";
import WhatsAppBrandIcon from "./WhatsAppBrandIcon";

/**
 * Compact sidebar navigation item opening direct WhatsApp support above Log out.
 * Matches exact dimensions, spacing, typography, and collapsed centering of sidebar nav items.
 */
export default function SidebarSupportLink({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <a
      href={whatsappSupportUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onNavigate}
      title={compact ? "Contact support on WhatsApp" : undefined}
      aria-label={compact ? "Contact support on WhatsApp" : "Contact support"}
      className={`group flex h-10 w-full items-center rounded-lg text-[13px] font-medium text-ink-600 transition-colors duration-150 hover:bg-[rgb(var(--hover))] hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700 ${
        compact ? "justify-center" : ""
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        <WhatsAppBrandIcon size={18} variant="green" />
      </span>
      {!compact && <span className="flex-1 truncate pr-2.5 text-left">Contact support</span>}
    </a>
  );
}
