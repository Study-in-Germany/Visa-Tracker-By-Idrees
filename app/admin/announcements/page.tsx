"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, ErrorState, LoadingBlock, Notice } from "@/components/ui/States";
import { useApi } from "@/hooks/useApi";
import { apiFetch, jsonInit } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import Field from "@/components/ui/Field";
import { CONSULATES } from "@/lib/constants";

const SCOPE_OPTIONS = [{ value: "", label: "General (all embassies)" }, ...CONSULATES.map((c) => ({ value: c, label: c }))];

const emptyForm = { title: "", body: "", consulate: "", pinned: false };

export default function AdminAnnouncementsPage() {
  const { data, error, loading, reload } = useApi<{ announcements: any[] }>("/api/announcements");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const announcements = data?.announcements ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch(editingId ? `/api/announcements/${editingId}` : "/api/announcements", jsonInit(editingId ? "PATCH" : "POST", form));
      setMessage({ tone: "success", text: editingId ? "Announcement updated." : "Announcement published." });
      setForm(emptyForm);
      setEditingId(null);
      reload();
    } catch (err: any) {
      setMessage({ tone: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  function startEdit(a: any) {
    setEditingId(a.id);
    setForm({ title: a.title, body: a.body, consulate: a.consulate || "", pinned: a.pinned });
    setMessage(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    try {
      await apiFetch(`/api/announcements/${id}`, { method: "DELETE" });
      setMessage({ tone: "success", text: "Announcement deleted." });
      reload();
    } catch (err: any) {
      setMessage({ tone: "error", text: err.message });
    }
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Announcements" />
      {message && <div className="mb-4"><Notice tone={message.tone}>{message.text}</Notice></div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="card h-fit space-y-3 p-4">
          <h2 className="font-semibold text-lg">{editingId ? "Edit announcement" : "New announcement"}</h2>
          <Field label="Title" htmlFor="a-title">
            <input id="a-title" className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Body" htmlFor="a-body">
            <textarea id="a-body" className="input min-h-[110px]" rows={5} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
          <Field label="Applies to" htmlFor="a-consulate">
            <Select id="a-consulate" label="Applies to" value={form.consulate} onChange={(v) => setForm({ ...form, consulate: v })} options={SCOPE_OPTIONS} />
          </Field>
          <Checkbox checked={form.pinned} onChange={(v) => setForm({ ...form, pinned: v })} label="Pin to top" />
          <div className="flex items-center gap-3">
            <button className="btn-gold" disabled={saving}>{saving ? "Saving…" : editingId ? "Update" : "Publish"}</button>
            {editingId && <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}
          </div>
        </form>

        <div className="space-y-3">
          {loading && !data ? (
            <LoadingBlock />
          ) : error ? (
            <div className="card"><ErrorState error={error} onRetry={reload} /></div>
          ) : announcements.length === 0 ? (
            <div className="card"><EmptyState title="No announcements yet" hint="Publish one with the form." /></div>
          ) : (
            announcements.map((a) => (
              <Panel key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <h3 className="font-semibold">{a.title}</h3>
                  <span className="text-xs text-ink-600">{fmtDate(a.createdAt)}</span>
                </div>
                <div className="mt-1.5 flex gap-1.5">{a.pinned && <Chip tone="accent">Pinned</Chip>}{a.consulate && <Chip>{a.consulate}</Chip>}</div>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{a.body}</p>
                <div className="mt-3 flex items-center gap-1">
                  <button onClick={() => startEdit(a)} className="min-h-[36px] rounded-md px-2.5 text-xs font-semibold hover:bg-paper-sunk">Edit</button>
                  <button onClick={() => handleDelete(a.id)} className="min-h-[36px] rounded-md px-2.5 text-xs font-semibold text-red-800 hover:bg-red-50">Delete</button>
                </div>
              </Panel>
            ))
          )}
        </div>
      </div>
    </>
  );
}
