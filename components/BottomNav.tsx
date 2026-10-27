"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { IconName } from "@/components/ui/Icon";

const TABS: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: "/", label: "Home", icon: "grid", exact: true },
  { href: "/tracker", label: "Tracker", icon: "search" },
  { href: "/universities", label: "Universities", icon: "school" },
  { href: "/accommodation", label: "Housing", icon: "home" },
];

/** Thumb-reach tab bar for phones and small tablets. The last tab opens the full navigation drawer. */
export default function BottomNav({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const item = "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium";
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`${item} ${active ? "text-clay-600" : "text-mute"}`}>
            <Icon name={t.icon} size={20} strokeWidth={active ? 2.2 : 1.8} />
            {t.label}
          </Link>
        );
      })}
      <button type="button" onClick={onMenu} className={`${item} text-mute`} aria-label="Open full menu">
        <Icon name="menu" size={20} />
        More
      </button>
    </nav>
  );
}
