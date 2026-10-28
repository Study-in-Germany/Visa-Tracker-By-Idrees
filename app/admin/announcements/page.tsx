"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Select from "@/components/ui/Select";
import Field from "@/components/ui/Field";
import Toggle from "@/components/ui/Toggle";
import Icon from "@/components/ui/Icon";
import { EmptyState, ErrorState, Notice, Skeleton } from "@/components/ui/States";
import { Kpi, timeAgo } from "@/components/admin/parts";
import { invalidateApi, useApi } from "@/hooks/useApi";
import { apiFetch, jsonInit } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { CONSULATES } from "@/lib/constants";

type Announcement = { id: string; title: string; body: string; consulate: string | null; pinned: boolean; createdAt: string; updatedAt: string };
type Form = { title: string; body: string; consulate: string; pinned: boolean };

const SCOPE_OPTIONS = [{ value: "", label: "Everyone (all embassies)" }, ...CONSULATES.map((c) => ({ value: c, label: `${c} embassy only` }))];
const FILTERS = [{ v: "all", l: "All" }, { v: "pinned", l: "Pinned" }, { v: "general", l: "Everyone" }, ...CONSULATES.map((c) => ({ v: c, l: c }))];
const empty: Form = { title: "", body: "", consulate: "", pinned: false };
const TITLE_MAX = 200;
const BODY_MAX = 5000;

/** How the announcement looks to visitors, so the admin sees the result before publishing. */
function Preview({ f }: { f: Form }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3.5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">Preview</p>
      <article className={`card p-4 ${f.pinned ? "border-l-4 border-l-clay-500" : ""}`}>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          {f.pinned && <span className="inline-flex items-center gap-1 rounded-md bg-clay-100 px-1.5 py-0.5 text-clay-600"><Icon name="pin" size={11} /> Pinned</span>}
          <span className="rounded-md bg-paper-sunk px-1.5 py-0.5 text-ink-700">{f.consulate || "All embassies"}</span>
          <span className="font-normal text-mute">Today</span>
        </div>
        <h3 className="mt-2 break-words text-[16px] font-semibold leading-snug">{f.title.trim() || <span className="text-ink-300">Your headline</span>}</h3>
        <p className="mt-1.5 whitespace-pre-line break-words text-[13px] leading-relaxed text-ink-700">{f.body.trim() || <span className="text-ink-300">The message body appears here.</span>}</p>
      </article>
    </div>
  );
}

function Counter({ n, max }: { n: number; max: number }) {
  return <span className={`text-[11px] tabular-nums ${n > max * 0.95 ? "text-red-700" : "text-mute"}`}>{n.toLocaleString("en-US")} / {max.toLocaleString("en-US")}</span>;
}

function Composer({ open, editing, onClose, onSaved }: { open: boolean; editing: Announcement | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState<Form>(empty);
  const [seed, setSeed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Re-seed the form each time the dialog opens for a different announcement.
  const key = open ? (editing?.id ?? "new") : null;
  if (key !== seed) {
    setSeed(key);
    if (open) setForm(editing ? { title: editing.title, body: editing.body, consulate: editing.consulate || "", pinned: editing.pinned } : empty);
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return setError("A title and a message are both required.");
    setBusy(true);
    setError("");
    try {
      await apiFetch(editing ? `/api/announcements/${editing.id}` : "/api/announcements", jsonInit(editing ? "PATCH" : "POST", { ...form, title: form.title.trim(), body: form.body.trim() }));
      invalidateApi("/api/announcements");
      invalidateApi("/api/admin/overview");
      onSaved(editing ? "Announcement updated." : "Announcement published.");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Could not save the announcement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      size="xl"
      title={editing ? "Edit announcement" : "New announcement"}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="announcement-form" className="btn-gold" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Publish"}</button>
        </>
      }
    >
      <form id="announcement-form" onSubmit={submit} noValidate className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          <Field label="Headline" htmlFor="an-title" required>
            <input id="an-title" className="input" maxLength={TITLE_MAX} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Islamabad embassy appointments reopened" autoFocus />
            <div className="mt-1 text-right"><Counter n={form.title.length} max={TITLE_MAX} /></div>
          </Field>
          <Field label="Message" htmlFor="an-body" required>
            <textarea id="an-body" className="input min-h-[190px] leading-relaxed" maxLength={BODY_MAX} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write the update. Line breaks are kept." />
            <div className="mt-1 text-right"><Counter n={form.body.length} max={BODY_MAX} /></div>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Audience" htmlFor="an-scope">
              <Select id="an-scope" label="Audience" value={form.consulate} onChange={(v) => setForm({ ...form, consulate: v })} options={SCOPE_OPTIONS} />
            </Field>
            <Field label="Position" htmlFor="an-pin">
              <Toggle id="an-pin" checked={form.pinned} onChange={(v) => setForm({ ...form, pinned: v })} label="Pin to top" />
            </Field>
          </div>
          {error && <Notice tone="error">{error}</Notice>}
        </div>
        <div className="lg:sticky lg:top-0 lg:self-start"><Preview f={form} /></div>
      </form>
    </Modal>
  );
}

function AnnouncementsInner() {
  const { data, error, loading, reload } = useApi<{ announcements: Announcement[] }>("/api/announcements");
  const [composer, setComposer] = useState<{ open: boolean; editing: Announcement | null }>({ open: false, editing: null });
  const [del, setDel] = useState<Announcement | null>(null);
  const [filter, setFilter] = useState("all");
  const q = useSearchParams().get("q") ?? "";
  const [message, setMessage] = useState("");
  const all = data?.announcements ?? [];

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((a) => {
      if (filter === "pinned" && !a.pinned) return false;
      if (filter === "general" && a.consulate) return false;
      if (CONSULATES.includes(filter) && a.consulate !== filter) return false;
      return !needle || a.title.toLowerCase().includes(needle) || a.body.toLowerCase().includes(needle);
    });
  }, [all, filter, q]);

  const pinned = all.filter((a) => a.pinned).length;
  const scoped = all.filter((a) => a.consulate).length;
  const flash = (t: string) => { setMessage(t); setTimeout(() => setMessage(""), 4000); };

  async function togglePin(a: Announcement) {
    try {
      await apiFetch(`/api/announcements/${a.id}`, jsonInit("PATCH", { title: a.title, body: a.body, consulate: a.consulate || "", pinned: !a.pinned }));
      invalidateApi("/api/announcements");
      reload();
      flash(a.pinned ? "Unpinned." : "Pinned to the top.");
    } catch (e: any) { flash(e?.message || "Could not update."); }
  }

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Updates shown on the public Announcements page."
        actions={<button type="button" className="btn-gold" onClick={() => setComposer({ open: true, editing: null })}><Icon name="plus" size={14} /> New announcement</button>}
      />

      <section className="mb-4 grid grid-cols-3 gap-3" aria-label="Summary">
        <Kpi icon="bell" tone="clay" label="Published" value={data ? all.length : undefined} />
        <Kpi icon="pin" tone="amber" label="Pinned" value={data ? pinned : undefined} />
        <Kpi icon="building" tone="blue" label="Embassy-specific" value={data ? scoped : undefined} />
      </section>

      {message && <div className="mb-3" role="status"><Notice tone="success">{message}</Notice></div>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Filter announcements" className="-mx-3 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button key={f.v} role="tab" type="button" aria-selected={filter === f.v} onClick={() => setFilter(f.v)} className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors ${filter === f.v ? "border-ink-800 bg-ink-800 text-paper-raised" : "border-line-strong bg-paper-raised text-ink-800 hover:bg-paper-sunk"}`}>{f.l}</button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="grid gap-3 xl:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}</div>
      ) : error && !data ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : shown.length === 0 ? (
        <div className="card">
          <EmptyState
            title={all.length === 0 ? "No announcements yet" : "Nothing matches"}
            hint={all.length === 0 ? "Share embassy news and tips with everyone using the tracker." : "Try a different filter or search."}
            action={all.length === 0 ? <button type="button" className="btn-gold" onClick={() => setComposer({ open: true, editing: null })}>Write the first one</button> : undefined}
          />
        </div>
      ) : (
        <ul className="grid items-start gap-3 xl:grid-cols-2">
          {shown.map((a) => (
            <li key={a.id}>
              <article className={`card group flex h-full flex-col p-4 ${a.pinned ? "border-l-4 border-l-clay-500" : ""}`}>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                  {a.pinned && <span className="inline-flex items-center gap-1 rounded-md bg-clay-100 px-1.5 py-0.5 text-clay-600"><Icon name="pin" size={11} /> Pinned</span>}
                  <span className="rounded-md bg-paper-sunk px-1.5 py-0.5 text-ink-700">{a.consulate || "All embassies"}</span>
                  <span className="ml-auto font-normal text-mute" title={fmtDate(a.createdAt)}>{timeAgo(a.createdAt)}</span>
                </div>
                <h3 className="mt-2 break-words text-[16px] font-semibold leading-snug">{a.title}</h3>
                <p className="mt-1.5 line-clamp-4 whitespace-pre-line break-words text-[13px] leading-relaxed text-ink-700">{a.body}</p>
                <div className="mt-auto flex flex-wrap items-center gap-1 pt-3">
                  <button type="button" onClick={() => setComposer({ open: true, editing: a })} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold hover:bg-paper-sunk"><Icon name="edit" size={13} /> Edit</button>
                  <button type="button" onClick={() => togglePin(a)} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold hover:bg-paper-sunk"><Icon name="pin" size={13} /> {a.pinned ? "Unpin" : "Pin"}</button>
                  <button type="button" onClick={() => setDel(a)} className="ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-red-800 hover:bg-red-50"><Icon name="trash" size={13} /> Delete</button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <Composer open={composer.open} editing={composer.editing} onClose={() => setComposer((c) => ({ ...c, open: false }))} onSaved={(m) => { flash(m); reload(); }} />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title="Delete announcement?"
        message={del ? <>“{del.title}” will be removed from the public site. This can&apos;t be undone.</> : ""}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!del) return;
          await apiFetch(`/api/announcements/${del.id}`, { method: "DELETE" });
          invalidateApi("/api/announcements");
          invalidateApi("/api/admin/overview");
          reload();
          flash("Announcement deleted.");
        }}
      />
    </>
  );
}

export default function AdminAnnouncementsPage() {
  return <Suspense><AnnouncementsInner /></Suspense>;
}
