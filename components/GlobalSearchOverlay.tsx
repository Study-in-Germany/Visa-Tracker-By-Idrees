"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/StatusBadge";
import { useDebounced } from "@/hooks/useDebounced";
import { apiFetch } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { ApplicantRow, ApplicantsResponse } from "@/lib/types";

const RECENT_KEY = "vt.recentSearches";
const SUGGESTIONS = ["Islamabad", "Karachi", "Appointment Scheduled", "TU Munich", "Waiting List"];

export default function GlobalSearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const inAdmin = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const listPath = inAdmin ? "/admin/applicants" : "/tracker";

  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ApplicantRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedScrollY = useRef(0);
  const q = useDebounced(text.trim(), 220);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecent(parsed.slice(0, 6).map(String));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    savedScrollY.current = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
      requestAnimationFrame(() => window.scrollTo(0, savedScrollY.current));
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || q.length < 2) {
      setRows([]);
      setCount(0);
      setError("");
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    apiFetch<ApplicantsResponse>(`/api/applicants?q=${encodeURIComponent(q)}&page=1&pageSize=8`, { signal: ctrl.signal })
      .then((d) => {
        setRows(d.applicants);
        setCount(d.count);
      })
      .catch((e) => e?.name !== "AbortError" && setError(e?.message || "Search failed."))
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [open, q]);

  function saveRecent(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recent.filter((r) => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
  }

  function clearRecent() {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {}
  }

  function navigateTo(href: string, queryToSave?: string) {
    if (queryToSave) saveRecent(queryToSave);
    onClose();
    setText("");
    router.push(href);
  }

  if (!open || !mounted) return null;

  const hrefFor = (r: ApplicantRow) => (inAdmin ? `/admin/applicants/${r.id}` : `/tracker/${r.publicId}`);
  const seeAllHref = `${listPath}?q=${encodeURIComponent(text.trim())}`;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      className="fixed inset-0 z-[80] flex flex-col bg-paper pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      {/* Top native search bar */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-[rgb(var(--chrome))] px-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-800 hover:bg-[rgb(var(--hover))]"
        >
          <Icon name="arrowLeft" size={20} />
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) navigateTo(seeAllHref, text.trim());
          }}
          className="relative flex-1"
        >
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search ID, university, embassy…"
            aria-label="Search Tracking ID, university, programme, or embassy"
            className="h-10 w-full rounded-xl border border-line-strong bg-paper-sunk pl-9 pr-9 text-[15px] text-ink-900 placeholder:text-mute focus:border-neutral-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {text && (
            <button
              type="button"
              onClick={() => {
                setText("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-mute hover:text-ink-900"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] shrink-0 px-2 text-xs font-semibold text-blue-600 dark:text-blue-400"
        >
          Cancel
        </button>
      </div>

      {/* Scrollable search content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {q.length < 2 ? (
          <div className="space-y-6">
            {recent.length > 0 && (
              <section aria-label="Recent searches" className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-mute">Recent searches</h2>
                  <button type="button" onClick={clearRecent} className="text-xs font-medium text-mute hover:text-ink-900">
                    Clear
                  </button>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {recent.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => setText(item)}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-line bg-card px-3 text-xs font-medium text-ink-800 hover:bg-[rgb(var(--hover))]"
                      >
                        <Icon name="history" size={13} className="text-mute" />
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-label="Suggestions" className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-mute">Quick suggestions</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => setText(s)}
                      className="flex min-h-[46px] w-full items-center gap-3 px-3.5 text-left text-[13px] font-medium text-ink-900 hover:bg-[rgb(var(--hover))]"
                    >
                      <Icon name="search" size={16} className="text-mute" />
                      <span className="flex-1">{s}</span>
                      <Icon name="chevronRight" size={15} className="text-mute" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : loading && rows.length === 0 ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-line bg-card" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-center text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="text-sm font-semibold text-ink-900">No entries match “{text.trim()}”</p>
            <p className="mt-1 text-xs text-mute">Try a Tracking ID, university name, programme, or embassy.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <section aria-label="Matching Visa Journeys" className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-mute">
                  Matching visa journeys ({count.toLocaleString("en-US")})
                </h2>
                <button
                  type="button"
                  onClick={() => navigateTo(seeAllHref, text.trim())}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400"
                >
                  View all
                </button>
              </div>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={hrefFor(r)}
                      onClick={() => {
                        saveRecent(text.trim());
                        onClose();
                      }}
                      className="flex min-h-[56px] items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-[rgb(var(--hover))]"
                    >
                      <span className="min-w-0">
                        <span className="block font-mono text-[13px] font-semibold text-ink-900">{r.publicId}</span>
                        <span className="block truncate text-xs text-mute">
                          {[r.university, r.program, r.consulate, r.waitingListDate ? fmtDate(r.waitingListDate) : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <StatusBadge status={r.visaStatus} short />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
