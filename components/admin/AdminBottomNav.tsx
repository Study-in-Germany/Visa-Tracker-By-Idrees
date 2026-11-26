"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { IconName } from "@/components/ui/Icon";

const TABS: { href: string; label: string; icon: IconName; exact?: boolean; badge?: "pending" | "moderation" }[] = [
  { href: "/admin", label: "Dashboard", icon: "grid", exact: true },
  { href: "/admin/applicants", label: "Applicants", icon: "users", badge: "pending" },
  { href: "/admin/universities", label: "Unis", icon: "school" },
  { href: "/admin/accommodation", label: "Housing", icon: "home", badge: "moderation" },
];

/** Thumb-reach tab bar for the admin area on phones. */
export default function AdminBottomNav({ onMenu, pending, moderation }: { onMenu: () => void; pending: number; moderation: number }) {
  const pathname = usePathname();
  const item = "relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium";
  return (
    <nav aria-label="Admin quick navigation" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(t.href + "/");
        const n = t.badge === "pending" ? pending : t.badge === "moderation" ? moderation : 0;
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`${item} ${active ? "text-ink-900 font-semibold" : "text-mute"}`}>
            <span className="relative">
              <Icon name={t.icon} size={18} strokeWidth={active ? 2.1 : 1.7} />
              {n > 0 && <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">{n > 99 ? "99+" : n}</span>}
            </span>
            {t.label}
          </Link>
        );
      })}
      <button type="button" onClick={onMenu} className={`${item} text-mute`} aria-label="Open full menu">
        <Icon name="menu" size={18} />
        More
      </button>
    </nav>
  );
}
