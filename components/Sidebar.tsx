"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import GermanFlagBar from "@/components/ui/GermanFlagBar";
import SidebarAccountTrigger from "@/components/sidebar/SidebarAccountTrigger";
import SidebarSupportLink from "@/components/whatsapp/SidebarSupportLink";
import InstallApp from "@/components/InstallApp";
import { LogoMark } from "@/components/Logo";
import { useSession, type SessionInfo } from "@/hooks/useSession";
import { getNavSections, type NavItem } from "@/lib/navigation";

export default function Sidebar({
  inAdmin,
  session,
  collapsed,
  onToggleCollapse,
  drawerOpen,
  onCloseDrawer,
  pendingCount,
  moderationCount,
}: {
  inAdmin: boolean;
  session: SessionInfo & { loading?: boolean };
  collapsed: boolean;
  onToggleCollapse: () => void;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
  pendingCount: number;
  moderationCount: number;
}) {
  const pathname = usePathname();
  const { logout } = useSession();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const sections = getNavSections(inAdmin, session.role);
  const isAuthenticated = session.role === "admin" || session.role === "applicant";
  const isAdminViewer = session.role === "admin";

  const isActive = (i: NavItem) =>
    !i.external && (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"));

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [pathname]);

  async function confirmLogout() {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      const asAdmin = inAdmin || isAdminViewer;
      const result = await logout({
        asAdmin,
        redirectTo: asAdmin ? "/admin/login" : "/",
      });
      if (!result.ok) {
        setLogoutError(result.error || "Could not revoke your server session. Please try again.");
        return;
      }
      setShowLogoutModal(false);
      onCloseDrawer();
    } finally {
      setLoggingOut(false);
    }
  }

  const identityLabel = session.publicId || session.email || (isAdminViewer ? "Admin" : "Applicant");

  const renderContent = (compact: boolean, isMobileDrawer: boolean) => (
    <>
      <GermanFlagBar />
      {/* Brand and in-header rail toggle */}
      <div className={`flex h-14 shrink-0 items-center px-3 ${compact ? "justify-center" : "justify-between"}`}>
        {isMobileDrawer ? (
          <>
            <Link href="/" onClick={onCloseDrawer} className="flex items-center gap-2.5 px-1">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-paper-raised">
                <LogoMark size={24} />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[13px] font-bold leading-tight tracking-tight text-ink-900">Visa Tracker</span>
                <span className="text-[10px] font-medium uppercase leading-tight tracking-wide text-mute">by Idrees</span>
              </div>
            </Link>
            <button
              type="button"
              onClick={onCloseDrawer}
              aria-label="Close navigation"
              className="grid h-10 w-10 place-items-center rounded-lg text-ink-700 hover:bg-paper-sunk"
            >
              <Icon name="close" size={18} />
            </button>
          </>
        ) : (
          <>
          <div className={`flex min-w-0 items-center ${compact ? "justify-center" : "flex-1"}`}>
            <button type="button" onClick={onToggleCollapse} aria-label={compact ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!compact} title={compact ? "Expand sidebar" : "Collapse sidebar"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-paper-raised transition-colors hover:bg-[rgb(var(--hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700">
              <LogoMark size={24} />
            </button>
            {!compact && <div className="ml-2.5 min-w-0 overflow-hidden whitespace-nowrap">
              <div className="flex flex-col text-left">
                <span className="text-[13px] font-bold leading-tight tracking-tight text-ink-900">Visa Tracker</span>
                <span className="text-[10px] font-medium uppercase leading-tight tracking-wide text-mute">
                  {inAdmin ? "Admin" : "by Idrees"}
                </span>
              </div>
            </div>}
          </div>
          </>
        )}
      </div>

      {/* Compact account selector in fixed sidebar header (authenticated applicants only) */}
      {session.role === "applicant" && !inAdmin && (
        <div className={`shrink-0 border-b border-line ${compact ? "px-2 py-2" : "px-3 pb-2.5 pt-0.5"}`}>
          <SidebarAccountTrigger
            session={session}
            compact={compact}
            onNavigate={isMobileDrawer ? onCloseDrawer : undefined}
          />
        </div>
      )}

      {/* Scrollable navigation groups */}
      <nav aria-label="Primary" className={`sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2 ${compact ? "px-2" : "px-3"}`}>
        {sections.map((section, idx) => (
          <div key={section.title} className={idx === 0 ? "" : compact ? "mt-2" : "mt-4"}>
            {!compact ? (
              <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
                {section.title}
              </p>
            ) : (
              idx > 0 && <div aria-hidden="true" className="mx-auto mb-2 w-7 border-t border-line" />
            )}
            <ul className={compact ? "space-y-1.5" : "space-y-0.5"}>
              {section.items.map((item) => {
                const active = isActive(item);
                const badgeValue =
                  item.badge === "pending" ? pendingCount : item.badge === "moderation" ? moderationCount : 0;

                return (
                  <li key={item.href}>
                    <Link
                      ref={active && !isMobileDrawer ? activeRef : undefined}
                      href={item.href}
                      prefetch={item.href.startsWith("/dashboard") || item.href.startsWith("/admin") ? false : undefined}
                      {...(item.external ? { target: "_blank", rel: "noopener" } : {})}
                      onClick={() => isMobileDrawer && onCloseDrawer()}
                      title={compact ? item.label : undefined}
                      aria-label={compact ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex w-full items-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700 ${
                        compact ? "h-10 justify-center px-0" : "h-9"
                      } ${
                        active
                          ? "bg-neutral-100 text-ink-900 dark:bg-[#303030] dark:text-[#F5F5F5]"
                          : "text-ink-600 hover:bg-[rgb(var(--hover))] hover:text-ink-900"
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                        <Icon
                          name={item.icon}
                          size={18}
                          className={
                            active ? "text-ink-900 dark:text-[#F5F5F5]" : "text-mute group-hover:text-ink-900"
                          }
                        />
                      </span>
                      {!compact && (
                        <span className="flex flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap pr-2.5 text-[13px] font-medium">
                          <span className="truncate">{item.label}</span>
                          {item.external && <Icon name="external" size={12} className="shrink-0 opacity-70" />}
                          {badgeValue > 0 && (
                            <span
                              className={`ml-auto grid h-5 min-w-[20px] place-items-center rounded-md px-1 text-[11px] font-semibold tabular-nums ${
                                active
                                  ? "bg-white/20 text-white dark:bg-[#0A0A0A]/15 dark:text-[#0A0A0A]"
                                  : "bg-neutral-100 text-ink-800 dark:bg-[#272727] dark:text-[#FAFAFA]"
                              }`}
                            >
                              {badgeValue}
                            </span>
                          )}
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

      {/* Fixed bottom auth, support & PWA footer */}
      <div className={`shrink-0 space-y-1 border-t border-line ${compact ? "px-2 py-2.5" : "p-3"}`}>
        {!inAdmin && <InstallApp compact={compact} />}

        {isAdminViewer && !inAdmin && (
          <Link
            href="/admin"
            onClick={() => isMobileDrawer && onCloseDrawer()}
            title={compact ? "Admin dashboard" : undefined}
            aria-label={compact ? "Admin dashboard" : undefined}
            className={`flex h-10 w-full items-center rounded-xl text-[13px] font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 ${
              compact ? "justify-center" : ""
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Icon name="shield" size={18} />
            </span>
            {!compact && <span className="flex-1 truncate pr-2.5">Admin dashboard</span>}
          </Link>
        )}

        {!inAdmin && (
          <SidebarSupportLink
            compact={compact}
            onNavigate={isMobileDrawer ? onCloseDrawer : undefined}
          />
        )}

        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            title={compact ? `Log out (${identityLabel})` : undefined}
            aria-label="Log out"
            className={`group flex h-10 w-full cursor-pointer items-center rounded-lg text-[13px] font-medium text-ink-600 transition-colors duration-150 hover:bg-[rgb(var(--hover))] hover:text-ink-900 ${
              compact ? "justify-center" : ""
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Icon
                name="logout"
                size={18}
                className="text-mute transition-colors group-hover:text-ink-900"
              />
            </span>
            {!compact && <span className="flex-1 truncate pr-2.5 text-left">Log out</span>}
          </button>
        ) : (
          <Link
            href="/login"
            onClick={() => isMobileDrawer && onCloseDrawer()}
            title={compact ? "Applicant login" : undefined}
            aria-label={compact ? "Applicant login" : undefined}
            className={`group flex h-10 w-full items-center rounded-xl text-[13px] font-medium text-ink-700 transition-colors hover:bg-[rgb(var(--hover))] hover:text-ink-900 ${
              compact ? "justify-center" : ""
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Icon name="logIn" size={18} className="text-mute group-hover:text-ink-900" />
            </span>
            {!compact && <span className="flex-1 truncate pr-2.5">Applicant login</span>}
          </Link>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Adaptive Tablet Navigation Rail (md to lg) */}
      <aside
        aria-label="Tablet navigation rail"
        className="hidden w-[68px] shrink-0 flex-col overflow-hidden border-r border-line bg-[rgb(var(--chrome))] md:sticky md:top-0 md:flex md:h-[100dvh] lg:hidden"
      >
        {renderContent(true, false)}
      </aside>

      {/* Desktop Sidebar (lg+) matching Valley width & proportions */}
      <aside
        className={`hidden shrink-0 flex-col overflow-hidden border-r border-line bg-[rgb(var(--chrome))] transition-[width] duration-200 ease-in-out lg:sticky lg:top-0 lg:flex lg:h-[100dvh] ${
          collapsed ? "w-[68px]" : "w-[264px]"
        }`}
      >
        {renderContent(collapsed, false)}
      </aside>

      {/* Slide-over drawer (Admin mobile drawer or optional fallback) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs" onClick={onCloseDrawer} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 flex w-[264px] max-w-[85vw] flex-col overflow-hidden border-r border-line bg-[rgb(var(--chrome))] pb-[env(safe-area-inset-bottom)] shadow-xl animate-[drawer-in_160ms_ease-out]"
          >
            {renderContent(false, true)}
          </div>
        </div>
      )}

      {/* Logout confirmation modal (Valley design) */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => {
          if (loggingOut) return;
          setShowLogoutModal(false);
          setLogoutError(null);
        }}
        onConfirm={confirmLogout}
        title="Log out?"
        message="Are you sure you want to log out of your account?"
        confirmText={logoutError ? "Retry log out" : "Log out"}
        cancelText="Cancel"
        variant="danger"
        icon="logout"
        isLoading={loggingOut}
        error={logoutError}
      />
    </>
  );
}
