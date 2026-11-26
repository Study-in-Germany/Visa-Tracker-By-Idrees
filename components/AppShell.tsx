"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon, { IconName } from "@/components/ui/Icon";
import { invalidateApi, useApi } from "@/hooks/useApi";
import { SITE_NAME } from "@/lib/constants";
import Logo from "@/components/Logo";
import HeaderSearch from "@/components/HeaderSearch";
import { chromeFor } from "@/lib/chrome";
import ThemeToggle from "@/components/ThemeToggle";
import InstallApp, { InstallBanner } from "@/components/InstallApp";
import { PageTitleContext, type PageTitleState } from "@/components/PageTitle";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import BottomNav from "@/components/BottomNav";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import NavigationProgress from "@/components/NavigationProgress";
import { useSession } from "@/hooks/useSession";

type Item = { href: string; label: string; icon: IconName; exact?: boolean; badge?: "pending" | "moderation"; external?: boolean };
type Section = { title: string; items: Item[] };

const PUBLIC_NAV: Section[] = [
  {
    title: "Tracking",
    items: [
      { href: "/", label: "Overview", icon: "grid", exact: true },
      { href: "/tracker", label: "Tracker", icon: "search" },
      { href: "/queue-progress", label: "Queue progress", icon: "queue" },
      { href: "/visa-estimator", label: "Visa estimator", icon: "pulse" },
      { href: "/analytics", label: "Analytics", icon: "chart" },
      { href: "/announcements", label: "Announcements", icon: "bell" },
      { href: "/submit", label: "Submit entry", icon: "plus" },
    ],
  },
  {
    title: "Directory",
    items: [
      { href: "/universities", label: "Universities", icon: "school" },
      { href: "/programmes", label: "Programmes", icon: "book" },
      { href: "/accommodation", label: "Accommodation", icon: "home" },
      { href: "/connect", label: "Student connect", icon: "users" },
      { href: "/admission-guide", label: "Admission guide", icon: "file" },
    ],
  },
  {
    title: "Tools",
    items: [
      { href: "/tools/german-grade-converter", label: "Grade converter", icon: "calculator" },
      { href: "/tools/ects-calculator", label: "ECTS calculator", icon: "sliders" },
      { href: "/resources", label: "Resources", icon: "layers" },
      { href: "/about", label: "About", icon: "info" },
    ],
  },
];

const ADMIN_NAV: Section[] = [
  {
    title: "Operations",
    items: [
      { href: "/admin", label: "Dashboard", icon: "grid", exact: true },
      { href: "/admin/applicants", label: "Applicants", icon: "users", badge: "pending" },
      { href: "/admin/accommodation", label: "Accommodation", icon: "home", badge: "moderation" },
      { href: "/admin/announcements", label: "Announcements", icon: "bell" },
    ],
  },
  {
    title: "Data & System",
    items: [
      { href: "/admin/universities", label: "Universities", icon: "school" },
      { href: "/admin/imports", label: "Update data", icon: "layers" },
      { href: "/admin/import", label: "Import CSV", icon: "upload" },
      { href: "/admin/settings", label: "Settings", icon: "settings" },
    ],
  },
  {
    title: "Public",
    items: [
      { href: "/", label: "Public tracker", icon: "external", exact: true, external: true },
    ],
  },
];

const APPLICANT_NAV: Section[] = [
  {
    title: "My entry",
    items: [
      { href: "/dashboard", label: "My journey", icon: "queue", exact: true },
      { href: "/dashboard/information", label: "My information", icon: "user" },
      { href: "/dashboard/updates", label: "My updates", icon: "bell" },
      { href: "/dashboard/listings", label: "My listings", icon: "key" },
      { href: "/messages", label: "Messages", icon: "inbox" },
    ],
  },
  ...PUBLIC_NAV,
];

const COLLAPSE_KEY = "vt.sidebar.collapsed";

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
  const session = useSession();
  const isAdminViewer = session.role === "admin";
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
    const asAdmin = inAdmin || isAdminViewer;
    await fetch(asAdmin ? "/api/admin/logout" : "/api/applicant/logout", { method: "POST" });
    invalidateApi("/api/session");
    router.push(asAdmin ? "/admin/login" : "/");
    router.refresh();
  }

  const fallbackTitle =
    sections
      .flatMap((sec) => sec.items)
      .filter((i) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/")))
      .sort((x, y) => y.href.length - x.href.length)[0]?.label ?? "";

  const isActive = (i: Item) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"));

  const row = (compact: boolean) =>
    `flex min-h-[38px] w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors focus-visible:ring-inset focus-visible:ring-offset-0 lg:min-h-[32px] ${
      compact ? "justify-center px-0" : ""
    }`;

  const renderNav = (compact: boolean) => (
    <nav aria-label="Main" className="flex-1 space-y-4 overflow-y-auto py-3">
      {sections.map((s) => (
        <div key={s.title}>
          {!compact && (
            <p className="mb-1 px-2.5 text-[11px] font-medium text-mute">{s.title}</p>
          )}
          <ul className="space-y-0.5">
            {s.items.map((i) => {
              const active = !i.external && isActive(i);
              const badgeCount = i.badge === "pending" ? pendingCount : i.badge === "moderation" ? moderationCount : 0;
              return (
                <li key={s.title + i.href}>
                  <Link
                    href={i.href}
                    {...(i.external ? { target: "_blank", rel: "noopener" } : {})}
                    title={compact ? i.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`${row(compact)} ${
                      active
                        ? "bg-paper-sunk font-semibold text-ink-900"
                        : "font-medium text-ink-600 hover:bg-paper-sunk/70 hover:text-ink-900"
                    }`}
                  >
                    <Icon name={i.icon} size={16} className={active ? "text-ink-900" : "text-mute"} />
                    <span className={compact ? "sr-only" : "flex-1 truncate"}>{i.label}</span>
                    {!compact && i.external && <Icon name="external" size={12} className="text-mute" />}
                    {!compact && badgeCount > 0 && (
                      <span className="grid h-4 min-w-[18px] place-items-center rounded bg-ink-800 px-1 text-[10px] font-semibold tabular-nums text-white dark:bg-zinc-200 dark:text-zinc-900">
                        {badgeCount}
                      </span>
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
    const cls = `${row(compact)} font-medium text-ink-600 hover:bg-paper-sunk/70 hover:text-ink-900`;
    return (
      <div className="space-y-0.5 border-t border-line py-2.5">
        {!inAdmin && <InstallApp />}
        {inAdmin || inDashboard || isAdminViewer ? (
          <>
            {isAdminViewer && !inAdmin && (
              <Link href="/admin" title="Admin dashboard" className={`${cls} text-blue-600`}>
                <Icon name="shield" size={16} />
                {txt("Admin dashboard")}
              </Link>
            )}
            <button type="button" onClick={logout} title="Log out" className={cls}>
              <Icon name="logout" size={16} className="text-mute" />
              {txt("Log out")}
            </button>
          </>
        ) : (
          <Link href="/login" title="Applicant login" className={cls}>
            <Icon name="user" size={16} className="text-mute" />
            {txt("Applicant login")}
          </Link>
        )}
      </div>
    );
  };

  if (pathname === "/login" || pathname === "/admin/login") {
    return (
      <>
        <NavigationProgress />
        {children}
      </>
    );
  }

  return (
    <PageTitleContext.Provider value={setTitle}>
      <NavigationProgress />
      <div className="min-h-screen bg-paper lg:flex">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
        >
          Skip to content
        </a>

        {/* Desktop sidebar */}
        <aside
          className={`hidden shrink-0 flex-col border-r border-line bg-paper-raised px-2.5 transition-[width] duration-150 lg:fixed lg:left-0 lg:top-0 lg:flex lg:h-screen ${
            collapsed ? "w-[60px]" : "w-[224px]"
          }`}
        >
          <div className={`flex h-14 items-center ${collapsed ? "justify-center" : "justify-between px-1"}`}>
            <Link href="/" title={SITE_NAME} className="min-w-0">
              <Logo size={26} showText={!collapsed} />
            </Link>
            {!collapsed && (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Collapse sidebar"
                aria-expanded={true}
                title="Collapse sidebar"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-mute hover:bg-paper-sunk hover:text-ink-900"
              >
                <Icon name="chevronLeft" size={15} />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              aria-expanded={false}
              title="Expand sidebar"
              className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-md text-mute hover:bg-paper-sunk hover:text-ink-900"
            >
              <Icon name="chevronRight" size={15} />
            </button>
          )}
          {renderNav(collapsed)}
          {renderFooter(collapsed)}
        </aside>

        <div className={`flex min-w-0 flex-1 flex-col lg:transition-[padding] lg:duration-150 ${collapsed ? "lg:pl-[60px]" : "lg:pl-[224px]"}`}>
          <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm">
            <div className="flex h-14 items-center gap-3 px-3 sm:px-5 lg:px-6">
              <button
                type="button"
                onClick={() => setDrawer(true)}
                aria-label="Open navigation"
                aria-expanded={drawer}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-ink-700 hover:bg-paper-sunk lg:hidden"
              >
                <Icon name="menu" size={18} />
              </button>
              <div className="flex min-w-0 items-center gap-2">
                <h1 id="page-title" className="min-w-0 truncate text-[17px] font-semibold tracking-tight text-ink-900 lg:text-[19px]">
                  {pageTitle?.title ?? fallbackTitle}
                </h1>
                {typeof pageTitle?.count === "number" && (
                  <span
                    className="shrink-0 rounded-md border border-line bg-paper-raised px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-700"
                    aria-label={`${pageTitle.count} results`}
                  >
                    {pageTitle.count.toLocaleString("en-US")}
                  </span>
                )}
              </div>
              <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
                {wideHeader && (
                  <Suspense fallback={<div className="h-9 flex-1 max-w-sm" />}>
                    <HeaderSearch />
                  </Suspense>
                )}
                <ThemeToggle />
                {action && (
                  <Link href={action.href} className="btn-primary !min-h-[34px] shrink-0 !px-3" aria-label={action.label}>
                    <Icon name={action.icon} size={14} /> <span className="hidden sm:inline">{action.label}</span>
                  </Link>
                )}
              </div>
            </div>
            {!wideHeader && (
              <div className="px-3 pb-2.5">
                <Suspense fallback={<div className="h-9" />}>
                  <HeaderSearch />
                </Suspense>
              </div>
            )}
          </header>

          {drawer && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} aria-hidden="true" />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Navigation"
                className="animate-drawer-in absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col border-r border-line bg-paper-raised px-3 pt-3 shadow-lg"
              >
                <div className="flex items-center justify-between px-1 pb-1">
                  <Link href="/" title={SITE_NAME} onClick={() => setDrawer(false)}>
                    <Logo size={26} showText />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDrawer(false)}
                    aria-label="Close navigation"
                    className="grid h-9 w-9 place-items-center rounded-md text-ink-700 hover:bg-paper-sunk"
                  >
                    <Icon name="close" size={17} />
                  </button>
                </div>
                {renderNav(false)}
                <div className="pb-2">{renderFooter(false)}</div>
              </div>
            </div>
          )}

          {isAdminViewer && !inAdmin && !inDashboard && (
            <div className="flex items-center justify-between gap-3 border-b border-line bg-paper-raised px-3 py-1.5 text-xs text-ink-700 sm:px-5 lg:px-6">
              <span className="flex items-center gap-1.5 font-medium">
                <Icon name="shield" size={13} className="text-blue-600" /> Signed in as admin
              </span>
              <Link href="/admin" className="font-medium text-blue-600 hover:underline">
                Back to dashboard
              </Link>
            </div>
          )}

          <main id="main" className="w-full flex-1 px-3 pt-4 pb-24 sm:px-5 lg:px-6 lg:pb-8">
            {children}
          </main>

          {!inAdmin && <InstallBanner />}
          {inAdmin ? (
            <AdminBottomNav onMenu={() => setDrawer(true)} pending={pendingCount} moderation={moderationCount} />
          ) : (
            <BottomNav onMenu={() => setDrawer(true)} />
          )}
        </div>
      </div>
    </PageTitleContext.Provider>
  );
}
