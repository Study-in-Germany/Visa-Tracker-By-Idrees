"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import Popover from "@/components/ui/Popover";
import StatusBadge from "@/components/StatusBadge";
import { useDebounced } from "@/hooks/useDebounced";
import { apiFetch } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { ApplicantsResponse, ApplicantRow } from "@/lib/types";

/**
 * Header search. Matches Tracking ID, university, program, consulate, intake, status
 * and exact dates (2026-03-05 or 05/03/2026). Enter opens the full list.
 */
export default function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const inAdmin = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const listPath = inAdmin ? "/admin/applicants" : "/tracker";

  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ApplicantRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState(-1);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const q = useDebounced(text.trim(), 250);

  // "/" focuses the search from anywhere that isn't a text field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (q.length < 2) {
      setRows([]);
      setCount(0);
      setError("");
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    apiFetch<ApplicantsResponse>(`/api/applicants?q=${encodeURIComponent(q)}&page=1&pageSize=6`, { signal: ctrl.signal })
      .then((d) => {
        setRows(d.applicants);
        setCount(d.count);
        setCursor(-1);
      })
      .catch((e) => e?.name !== "AbortError" && setError(e.message))
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [q]);

  const hrefFor = (r: ApplicantRow) => (inAdmin ? `/admin/applicants/${r.id}` : `/tracker/${r.publicId}`);
  const seeAll = `${listPath}?q=${encodeURIComponent(text.trim())}`;
  const close = () => setOpen(false);
  const go = (href: string) => {
    close();
    setText("");
    router.push(href);
  };

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setCursor((c) => Math.min(rows.length - 1, c + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(-1, c - 1)); }
    else if (e.key === "Enter" && text.trim()) {
      e.preventDefault();
      go(cursor >= 0 && rows[cursor] ? hrefFor(rows[cursor]) : seeAll);
    }
  }

  const show = open && text.trim().length >= 2;

  return (
    <div ref={wrap} className="relative w-full min-w-0 max-w-sm flex-1">
      <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
      <input
        ref={input}
        type="search"
        value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search ID, university, embassy…"
        aria-label="Search applicants"
        autoComplete="off"
        className="h-10 w-full rounded-xl border border-line-strong bg-paper-raised pl-9 pr-8 text-[13px] placeholder:text-mute focus:border-ink-600 focus:ring-1 focus:ring-ink-600 [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 text-[10px] text-mute sm:block">/</kbd>

      <Popover open={show} onClose={close} anchorRef={wrap as React.RefObject<HTMLElement>} title="Search results" sheet={false} minWidth={340} align="right">
        <div className="p-1">
          {loading && rows.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-mute">Searching…</p>
          ) : error ? (
            <p className="px-3 py-4 text-center text-xs text-red-700">{error}</p>
          ) : rows.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-mute">No matches for “{text.trim()}”.</p>
          ) : (
            <>
              <ul role="listbox" aria-label="Matches">
                {rows.map((r, i) => (
                  <li key={r.id} role="option" aria-selected={i === cursor}>
                    <Link href={hrefFor(r)} onClick={() => { close(); setText(""); }} className={`flex items-center justify-between gap-3 rounded-md px-2.5 py-2 ${i === cursor ? "bg-paper-sunk" : "hover:bg-paper-sunk"}`}>
                      <span className="min-w-0">
                        <span className="block font-mono text-[13px] font-medium">{r.publicId}</span>
                        <span className="block truncate text-xs text-mute">
                          {[r.university, r.consulate, r.waitingListDate ? fmtDate(r.waitingListDate) : null].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <StatusBadge status={r.visaStatus} />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={seeAll} onClick={() => { close(); setText(""); }} className="mt-1 flex items-center justify-between rounded-md border-t border-line px-2.5 py-2 text-xs font-medium text-ink-800 hover:bg-paper-sunk">
                <span>See all {count.toLocaleString("en-US")} {count === 1 ? "result" : "results"}</span>
                <Icon name="chevronRight" size={14} />
              </Link>
            </>
          )}
        </div>
      </Popover>
    </div>
  );
}
