"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { useSession } from "@/hooks/useSession";
import { getMobileBottomNavItems, getRouteMeta } from "@/lib/navigation";

const MORE_MATCH_PREFIXES = ["/queue-progress", "/announcements", "/universities", "/programmes", "/accommodation", "/resources", "/about", "/dashboard/information", "/dashboard/updates", "/dashboard/listings"];

/** Adaptive thumb-reach mobile navigation bar (`< md`). Tablet uses the navigation rail. */
export default function BottomNav() {
  const pathname = usePathname();
  const session = useSession();
  const role = session.role ?? "guest";
  const meta = getRouteMeta(pathname, role);

  if (!meta.showBottomNav) return null;

  const tabs = getMobileBottomNavItems(role);

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-[rgb(var(--chrome)/0.96)] pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {tabs.map((t) => {
        const isMore = t.href === "/more";
        const active = isMore
          ? pathname === "/more" || MORE_MATCH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))
          : t.exact
            ? pathname === t.href
            : pathname === t.href || pathname.startsWith(t.href + "/");

        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] transition-colors ${
              active ? "font-semibold text-ink-900" : "font-medium text-mute hover:text-ink-700"
            }`}
          >
            {active && (
              <span
                className="absolute top-0 h-[2px] w-8 rounded-full bg-slate-900 dark:bg-[#FAFAFA]"
                aria-hidden="true"
              />
            )}
            <Icon name={t.icon} size={22} strokeWidth={active ? 2.1 : 1.75} />
            <span className="truncate">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
