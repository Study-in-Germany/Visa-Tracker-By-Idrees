"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { useApi } from "@/hooks/useApi";
import {
  HeaderActionsContext,
  PageTitleContext,
  type HeaderActionsState,
  type PageTitleState,
} from "@/components/PageTitle";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import BottomNav from "@/components/BottomNav";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import { SessionProvider, useSession, type SessionInfo } from "@/hooks/useSession";
import Sidebar from "@/components/Sidebar";
import DynamicPageHeader from "@/components/DynamicPageHeader";
import NavigationProgress from "@/components/NavigationProgress";
import { InstallBanner } from "@/components/InstallApp";
import FloatingWhatsAppButton from "@/components/whatsapp/FloatingWhatsAppButton";
import { isFocusedWorkflowRoute } from "@/lib/navigation";

const COLLAPSE_KEY = "vt.sidebar.collapsed";

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [pageTitle, setTitle] = useState<PageTitleState>(null);
  const [headerActions, setHeaderActions] = useState<HeaderActionsState>(null);
  const wideHeader = useMediaQuery("(min-width: 768px)");

  const session = useSession();
  const isFocused = isFocusedWorkflowRoute(pathname);
  const inAdmin = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const inDashboard = pathname.startsWith("/dashboard");
  const isTrackerWorkspace = pathname === "/tracker";
  const isAdminViewer = session.role === "admin";

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

  if (isFocused) {
    return (
      <>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </>
    );
  }

  return (
    <PageTitleContext.Provider value={setTitle}>
      <HeaderActionsContext.Provider value={setHeaderActions}>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <div className={`min-h-[100dvh] bg-paper md:flex ${isTrackerWorkspace ? "md:h-[100dvh] md:overflow-hidden" : ""}`}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-paper-raised focus:px-3 focus:py-2"
          >
            Skip to content
          </a>

          <Sidebar
            inAdmin={inAdmin}
            session={{
              role: session.role ?? "guest",
              publicId: session.publicId,
              email: session.email,
              name: session.name,
              university: session.university,
              consulate: session.consulate,
              visaStatus: session.visaStatus,
              loading: session.loading,
            }}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
            drawerOpen={drawer}
            onCloseDrawer={() => setDrawer(false)}
            pendingCount={pendingCount}
            moderationCount={moderationCount}
          />

          <div className={`flex min-w-0 flex-1 flex-col overflow-x-clip ${isTrackerWorkspace ? "md:min-h-0 md:overflow-hidden" : ""}`}>
            <DynamicPageHeader
              inAdmin={inAdmin}
              pageTitle={pageTitle}
              headerActions={headerActions}
              wideHeader={wideHeader}
              drawerOpen={drawer}
              onOpenDrawer={() => setDrawer(true)}
            />

            {isAdminViewer && !inAdmin && !inDashboard && (
              <div className="flex items-center justify-between gap-3 border-b border-line bg-paper-sunk px-3 py-1.5 text-xs text-ink-700 sm:px-4 lg:px-5">
                <span className="flex items-center gap-1.5 font-medium">
                  <Icon name="shield" size={13} className="text-blue-600 dark:text-blue-400" /> You&apos;re signed in as admin
                </span>
                <Link href="/admin" className="font-semibold text-blue-600 underline-offset-2 hover:underline dark:text-blue-400">
                  Back to dashboard
                </Link>
              </div>
            )}

            <main
              id="main"
              className={`w-full flex-1 px-3 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-4 lg:px-5 lg:pt-3.5 ${
                isTrackerWorkspace
                  ? "md:flex md:min-h-0 md:flex-1 md:flex-col md:overflow-hidden md:p-0"
                  : "md:pb-4 lg:pb-5"
              }`}
            >
              {children}
            </main>

            {!inAdmin && <FloatingWhatsAppButton hidden={drawer} />}
            {!inAdmin && <InstallBanner />}
            {inAdmin ? (
              <AdminBottomNav onMenu={() => setDrawer(true)} pending={pendingCount} moderation={moderationCount} />
            ) : (
              <BottomNav />
            )}
          </div>
        </div>
      </HeaderActionsContext.Provider>
    </PageTitleContext.Provider>
  );
}

export default function AppShell({
  initialSession,
  children,
}: {
  initialSession: SessionInfo;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider initialSession={initialSession}>
      <ShellInner>{children}</ShellInner>
    </SessionProvider>
  );
}
