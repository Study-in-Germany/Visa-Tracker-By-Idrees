"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon, { IconName } from "@/components/ui/Icon";
import { useApi } from "@/hooks/useApi";
import { SITE_NAME } from "@/lib/constants";
import Logo from "@/components/Logo";
import HeaderSearch from "@/components/HeaderSearch";
import { chromeFor } from "@/lib/chrome";
import ThemeToggle from "@/components/ThemeToggle";
import InstallApp, { InstallBanner } from "@/components/InstallApp";
import { PageTitleContext, type PageTitleState } from "@/components/PageTitle";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import BottomNav from "@/components/BottomNav";

type Item = { href: string; label: string; icon: IconName; exact?: boolean; badge?: "pending" | "moderation" };
type Section = { title: string; items: Item[] };

const PUBLIC_NAV: Section[] = [
  {
    title: "Main",
    items: [
      { href: "/", label: "Overview", icon: "grid", exact: true },
      { href: "/tracker", label: "Tracker", icon: "search" },
      { href: "/analytics", label: "Analytics", icon: "chart" },
      { href: "/queue-progress", label: "Queue progress", icon: "queue" },
      { href: "/announcements", label: "Announcements", icon: "bell" },
      { href: "/submit", label: "Submit your entry", icon: "plus" },
    ],
  },
  {
    title: "Community",
    items: [
      { href: "/universities", label: "Universities", icon: "school" },
      { href: "/programmes", label: "Programmes", icon: "book" },
      { href: "/accommodation", label: "Accommodation", icon: "home" },
      { href: "/resources", label: "Resources", icon: "book" },
      { href: "/about", label: "About", icon: "info" },
    ],
  },
];

const PUBLIC_SITE: Section = {
  title: "Public site",
  items: [
    { href: "/", label: "Overview", icon: "grid", exact: true },
    { href: "/tracker", label: "Tracker", icon: "search" },
    { href: "/analytics", label: "Analytics", icon: "chart" },
  ],
};

const ADMIN_NAV: Section[] = [
  {
    title: "Manage",
    items: [
      { href: "/admin", label: "Dashboard", icon: "grid", exact: true },
      { href: "/admin/applicants", label: "Applicants", icon: "users", badge: "pending" },
      { href: "/admin/universities", label: "Universities", icon: "school" },
      { href: "/admin/accommodation", label: "Accommodation", icon: "home", badge: "moderation" },
      { href: "/admin/imports", label: "Data imports", icon: "layers" },
      { href: "/admin/import", label: "Import", icon: "upload" },
      { href: "/admin/announcements", label: "Announcements", icon: "bell" },
      { href: "/admin/settings", label: "Settings", icon: "settings" },
    ],
  },
  PUBLIC_SITE,
];

const APPLICANT_NAV: Section[] = [
  {
    title: "My entry",
    items: [
      { href: "/dashboard", label: "My journey", icon: "queue", exact: true },
      { href: "/dashboard/information", label: "My information", icon: "user" },
      { href: "/dashboard/updates", label: "My updates", icon: "bell" },
      { href: "/dashboard/listings", label: "My listings", icon: "key" },
    ],
  },
  ...PUBLIC_NAV,
];

const COLLAPSE_KEY = "vt.sidebar.collapsed";

function Brand({ compact }: { compact: boolean }) {
  return (
    <Link href="/" title={SITE_NAME} className="block">
      <Logo showText={!compact} />
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const inAdmin = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const action = inAdmin ? undefined : chromeFor(pathname).action;
  const [pageTitle, setTitle] = useState<PageTitleState>(null);
  const wideHeader = useMediaQuery("(min-width: 640px)");
  const inDashboard = pathname.startsWith("/dashboard");
  const sections = inAdmin ? ADMIN_NAV : inDashboard ? APPLICANT_NAV : PUBLIC_NAV;
  const pending = useApi<{ count: number }>(inAdmin ? "/api/applicants?approval=PENDING_REVIEW&page=1&pageSize=1" : null);
  const pendingCount = pending.data?.count ?? 0;
  const moderation = useApi<{ count: number }>(inAdmin ? "/api/listings?scope=admin&status=PENDING_REVIEW&pageSize=1" : null);
  const moderationCount = moderation.data?.count ?? 0;

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });

  async function logout() {
    await fetch(inAdmin ? "/api/admin/logout" : "/api/applicant/logout", { method: "POST" });
    router.push(inAdmin ? "/admin/login" : "/");
    router.refresh();
  }

  const fallbackTitle = sections.flatMap((sec) => sec.items).filter((i) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"))).sort((x, y) => y.href.length - x.href.length)[0]?.label ?? "";
  const isActive = (i: Item) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"));
  // Roomier on touch screens; the focus ring sits inside the row so the scrolling list can't clip it.
  const row = (compact: boolean) => `relative flex min-h-[42px] w-full items-center gap-2.5 rounded-lg px-3 text-[14px] font-medium transition-colors focus-visible:ring-inset focus-visible:ring-offset-0 lg:min-h-[36px] lg:text-[13px] ${compact ? "justify-center" : ""}`;

  const renderNav = (compact: boolean) => (
    <nav aria-label="Main" className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 py-3">
      {sections.map((s) => (
        <div key={s.title}>
          {!compact && <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute">{s.title}</p>}
          <ul className="space-y-0.5">
            {s.items.map((i) => {
              const active = isActive(i);
              return (
                <li key={s.title + i.href}>
                  <Link
                    href={i.href}
                    title={compact ? i.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`${row(compact)} ${active ? "bg-paper-sunk text-ink-900" : "text-ink-700 hover:bg-paper"}`}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-clay-500" aria-hidden="true" />}
                    <Icon name={i.icon} size={17} className={active ? "text-ink-900" : "text-mute"} />
                    <span className={compact ? "sr-only" : "flex-1 truncate"}>{i.label}</span>
                    {!compact && (i.badge === "pending" ? pendingCount : i.badge === "moderation" ? moderationCount : 0) > 0 && (
                      <span className="grid h-5 min-w-[20px] place-items-center rounded-md bg-clay-100 px-1 text-[11px] font-semibold text-clay-600">{i.badge === "pending" ? pendingCount : moderationCount}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const renderFooter = (compact: boolean) => {
    const txt = (t: string) => <span className={compact ? "sr-only" : "flex-1 truncate text-left"}>{t}</span>;
    const cls = `${row(compact)} text-ink-700 hover:bg-paper`;
    return (
      <div className="space-y-0.5 border-t border-line pt-3">
        {!inAdmin && <InstallApp />}
        {inAdmin || inDashboard ? (
          <button type="button" onClick={logout} title="Log out" className={cls}>
            <Icon name="logout" size={17} className="text-mute" />
            {txt("Log out")}
          </button>
        ) : (
          <>
            <Link href="/login" title="Applicant login" className={cls}>
              <Icon name="user" size={17} className="text-mute" />
              {txt("Applicant login")}
            </Link>
            <Link href="/admin" title="Admin" className={cls}>
              <Icon name="shield" size={17} className="text-mute" />
              {txt("Admin")}
            </Link>
          </>
        )}
      </div>
    );
  };

  // Sign-in screens render full-bleed, without the sidebar and header.
  if (pathname === "/login" || pathname === "/admin/login") return <>{children}</>;

  return (
    <PageTitleContext.Provider value={setTitle}>
    <div className="min-h-screen bg-paper lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-paper-raised focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className={`hidden shrink-0 flex-col border-r border-line bg-paper-raised px-3 pt-3.5 transition-[width] duration-150 lg:sticky lg:top-0 lg:flex lg:h-screen ${collapsed ? "w-16" : "w-[232px]"}`}>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex items-center rounded-lg p-1 transition-colors hover:bg-paper ${collapsed ? "justify-center" : ""}`}
        >
          <Logo showText={!collapsed} />
        </button>
        {renderNav(collapsed)}
        {renderFooter(collapsed)}
        <div className="h-2" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar: menu (small screens), global search, quick action */}
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-3 sm:px-5 lg:h-[72px] lg:px-6">
            <button type="button" onClick={() => setDrawer(true)} aria-label="Open navigation" aria-expanded={drawer} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-paper-sunk lg:hidden">
              <Icon name="menu" size={19} />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <h1 id="page-title" className="min-w-0 truncate text-[19px] font-semibold tracking-tight lg:text-[22px]">{pageTitle?.title ?? fallbackTitle}</h1>
              {typeof pageTitle?.count === "number" && (
                <span className="shrink-0 rounded-full border border-line-strong bg-paper-raised px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-ink-700" aria-label={`${pageTitle.count} results`}>{pageTitle.count.toLocaleString("en-US")}</span>
              )}
            </div>
            <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
              {wideHeader && <Suspense fallback={<div className="h-10 flex-1" />}><HeaderSearch /></Suspense>}
              <ThemeToggle />
              {action && (
                <Link href={action.href} className="btn-gold !min-h-[42px] shrink-0 !px-3 sm:!px-4" aria-label={action.label}>
                  <Icon name={action.icon} size={15} /> <span className="hidden sm:inline">{action.label}</span>
                </Link>
              )}
            </div>
          </div>
          {!wideHeader && <div className="px-3 pb-3"><Suspense fallback={<div className="h-10" />}><HeaderSearch /></Suspense></div>}
        </header>

        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-ink-900/40" onClick={() => setDrawer(false)} aria-hidden="true" />
            <div role="dialog" aria-modal="true" aria-label="Navigation" className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col bg-paper-raised px-3 pt-4 shadow-lg">
              <div className="flex items-center justify-between px-1">
                <Brand compact={false} />
                <button type="button" onClick={() => setDrawer(false)} aria-label="Close navigation" className="grid h-10 w-10 place-items-center rounded-md hover:bg-paper">
                  <Icon name="close" />
                </button>
              </div>
              {renderNav(false)}
              <div className="pb-3">{renderFooter(false)}</div>
            </div>
          </div>
        )}

        <main id="main" className={`w-full flex-1 px-3 pt-4 sm:px-5 lg:px-6 ${inAdmin ? "pb-6" : "pb-24 lg:pb-6"}`}>
          {children}
        </main>
        {!inAdmin && <InstallBanner />}
        {!inAdmin && <BottomNav onMenu={() => setDrawer(true)} />}
      </div>
    </div>
    </PageTitleContext.Provider>
  );
}
