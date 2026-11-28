"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/ui/Icon";
import HeaderSearch from "@/components/HeaderSearch";
import ThemeToggle from "@/components/ThemeToggle";
import GermanFlagBar from "@/components/ui/GermanFlagBar";
import GlobalSearchOverlay from "@/components/GlobalSearchOverlay";
import type { HeaderActionsState, PageTitleState } from "@/components/PageTitle";
import { useSession } from "@/hooks/useSession";
import { CONSULATE_CODES } from "@/lib/constants";
import { getRouteMeta } from "@/lib/navigation";

function getDashboardGreetingPeriod(hour: number) {
  if (hour < 12) return { label: "Good morning", icon: "sun" as const };
  if (hour < 17) return { label: "Good afternoon", icon: "sun" as const };
  return { label: "Good evening", icon: "moon" as const };
}

function MobileInlineLocalSearch({
  placeholder,
  label,
  onClose,
}: {
  placeholder: string;
  label: string;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const [val, setVal] = useState(sp.get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVal(sp.get("q") ?? "");
  }, [sp]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  function update(q: string) {
    setVal(q);
    const next = new URLSearchParams(sp.toString());
    if (q) next.set("q", q);
    else next.delete("q");
    next.delete("page");
    router.replace(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
  }

  return (
    <div className="flex h-14 items-center gap-2 px-3">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close search"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-800 hover:bg-[rgb(var(--hover))]"
      >
        <Icon name="arrowLeft" size={20} />
      </button>
      <div className="relative flex-1">
        <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
        <input
          ref={inputRef}
          type="search"
          value={val}
          onChange={(e) => update(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="h-10 w-full rounded-xl border border-line-strong bg-paper-sunk pl-9 pr-8 text-[14px] text-ink-900 placeholder:text-mute focus:border-neutral-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {val && (
          <button
            type="button"
            onClick={() => update("")}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-mute"
          >
            <Icon name="close" size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Shared Valley-style contextual app bar:
 * - Mobile (< md): single 56px row (+ top safe area), back arrow on secondary screens,
 *   search icon opening full-screen GlobalSearchOverlay or inline local search, no mobile theme toggle.
 * - Tablet/Desktop (md+): inline search where appropriate, desktop ThemeToggle, and contextual action.
 */
export default function DynamicPageHeader({
  inAdmin,
  pageTitle,
  headerActions,
  wideHeader,
  drawerOpen,
  onOpenDrawer,
}: {
  inAdmin: boolean;
  pageTitle: PageTitleState;
  headerActions?: HeaderActionsState;
  wideHeader: boolean;
  drawerOpen: boolean;
  onOpenDrawer: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const role = session.role ?? "guest";
  const meta = getRouteMeta(pathname, role);

  const [mobileGlobalOpen, setMobileGlobalOpen] = useState(false);
  const [mobileLocalOpen, setMobileLocalOpen] = useState(false);
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    setHour(new Date().getHours());
    const t = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setMobileLocalOpen(false);
    setMobileGlobalOpen(false);
  }, [pathname]);

  const isDashboardApplicant = pathname === "/dashboard" && role === "applicant";
  const greetingMeta = hour !== null ? getDashboardGreetingPeriod(hour) : { label: "Welcome back", icon: "sun" as const };
  const firstName = session.name?.trim().split(/\s+/)[0] || session.publicId || "there";
  const embassyFull = session.consulate?.trim() || null;
  const embassyCode = embassyFull
    ? CONSULATE_CODES[embassyFull] || embassyFull.slice(0, 3).toUpperCase()
    : null;

  const title = pageTitle?.title || meta.title;
  const parentLabel = pageTitle?.parentLabel ?? meta.parentLabel;
  const parentHref = pageTitle?.parentHref ?? meta.parentHref;
  const count = pageTitle?.count;
  const action = inAdmin ? undefined : meta.contextualAction;

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(parentHref || "/");
    }
  }

  const showMobileSearchTrigger =
    meta.searchMode === "global" || meta.searchMode === "local";

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-[rgb(var(--chrome))] pt-[env(safe-area-inset-top)]">
        <GermanFlagBar />

        {/* Mobile single-row 56px contextual app bar */}
        <div className="md:hidden">
          {mobileLocalOpen && meta.searchMode === "local" ? (
            <Suspense fallback={<div className="h-14" />}>
              <MobileInlineLocalSearch
                placeholder={meta.searchPlaceholder || "Search…"}
                label={meta.searchLabel || "Search"}
                onClose={() => setMobileLocalOpen(false)}
              />
            </Suspense>
          ) : (
            <div className="flex h-14 items-center gap-1.5 px-2.5">
              {meta.headerKind === "secondary" ? (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label={parentLabel ? `Back to ${parentLabel}` : "Go back"}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-800 hover:bg-[rgb(var(--hover))]"
                >
                  <Icon name="arrowLeft" size={20} />
                </button>
              ) : inAdmin ? (
                <button
                  type="button"
                  onClick={onOpenDrawer}
                  aria-label="Open navigation"
                  aria-expanded={drawerOpen}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-800 hover:bg-[rgb(var(--hover))]"
                >
                  <Icon name="menu" size={20} />
                </button>
              ) : null}

              <div className={`min-w-0 flex-1 ${meta.headerKind === "secondary" || inAdmin ? "pl-0.5" : "pl-1.5"}`}>
                <div className="flex min-w-0 items-center gap-2">
                  {isDashboardApplicant ? (
                    <>
                      <Icon
                        name={greetingMeta.icon}
                        size={16}
                        className={`shrink-0 ${greetingMeta.icon === "moon" ? "text-ink-500" : "text-amber-500"}`}
                      />
                      <h1 id="page-title" className="min-w-0 truncate text-[16px] font-bold tracking-tight text-ink-900">
                        <span className="font-normal text-ink-600">{greetingMeta.label}, </span>
                        {firstName}
                      </h1>
                      {embassyCode && (
                        <span
                          title={`${embassyFull} Embassy`}
                          aria-label={`${embassyFull} Embassy`}
                          className="shrink-0 rounded-md border border-line bg-paper-sunk px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-ink-700"
                        >
                          {embassyCode}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <h1 id="page-title" className="min-w-0 truncate text-[17px] font-bold tracking-tight text-ink-900">
                        {title}
                      </h1>
                      {typeof count === "number" && (
                        <span className="shrink-0 rounded-full border border-line bg-paper-sunk px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-700">
                          {count.toLocaleString("en-US")}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {headerActions?.mobile}
                {showMobileSearchTrigger && (
                  <button
                    type="button"
                    onClick={() =>
                      meta.searchMode === "global" ? setMobileGlobalOpen(true) : setMobileLocalOpen(true)
                    }
                    aria-label={meta.searchLabel || "Search"}
                    className="grid h-11 w-11 place-items-center rounded-lg text-ink-800 hover:bg-[rgb(var(--hover))]"
                  >
                    <Icon name="search" size={20} />
                  </button>
                )}
                {action && (
                  <Link
                    href={action.href}
                    aria-label={action.label}
                    className="grid h-11 w-11 place-items-center rounded-lg text-ink-900 hover:bg-[rgb(var(--hover))]"
                  >
                    <Icon name={action.icon} size={20} />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tablet & Desktop app bar */}
        <div className="hidden h-14 items-center gap-3 px-4 md:flex lg:px-5">
          <div className="min-w-0">
            {parentLabel && parentHref && (
              <div className="flex items-center gap-1 text-[11px] font-medium text-mute">
                <Link href={parentHref} className="inline-flex items-center gap-1 hover:text-ink-900">
                  <Icon name="arrowLeft" size={12} />
                  {parentLabel}
                </Link>
              </div>
            )}
            <div className="flex min-w-0 items-center gap-2">
              {isDashboardApplicant ? (
                <>
                  <Icon
                    name={greetingMeta.icon}
                    size={17}
                    className={`shrink-0 ${greetingMeta.icon === "moon" ? "text-ink-500" : "text-amber-500"}`}
                  />
                  <h1 id="page-title-desktop" className="min-w-0 truncate text-[18px] font-bold tracking-tight text-ink-900 lg:text-[20px]">
                    <span className="font-normal text-ink-600">{greetingMeta.label}, </span>
                    {firstName}
                  </h1>
                  {embassyCode && (
                    <span
                      title={`${embassyFull} Embassy`}
                      aria-label={`${embassyFull} Embassy`}
                      className="shrink-0 rounded-md border border-line bg-paper-sunk px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-ink-700"
                    >
                      {embassyCode}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <h1 id="page-title-desktop" className="min-w-0 truncate text-[18px] font-bold tracking-tight text-ink-900 lg:text-[20px]">
                    {title}
                  </h1>
                  {typeof count === "number" && (
                    <span
                      className="shrink-0 rounded-full border border-line bg-paper-sunk px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-700"
                      aria-label={`${count} results`}
                    >
                      {count.toLocaleString("en-US")}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
            {headerActions?.desktop}
            {wideHeader && meta.searchMode !== "none" && (
              <Suspense fallback={<div className="h-9 flex-1 max-w-sm" />}>
                <HeaderSearch />
              </Suspense>
            )}
            <ThemeToggle />
            {action && (
              <Link
                href={action.href}
                className="btn-primary !min-h-[36px] shrink-0 whitespace-nowrap !px-3.5 text-xs sm:text-[13px]"
                aria-label={action.label}
              >
                <Icon name={action.icon} size={15} />
                <span>{action.label}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <GlobalSearchOverlay open={mobileGlobalOpen} onClose={() => setMobileGlobalOpen(false)} />
    </>
  );
}
