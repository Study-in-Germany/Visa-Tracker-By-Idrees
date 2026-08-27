"use client";

import { useEffect, useState } from "react";
import { fmtDate } from "@/lib/format";
import { CONSULATES } from "@/lib/constants";

const emptyForm = { title: "", body: "", consulate: "", pinned: false };

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/announcements").then((r) => r.json()).then((d) => setAnnouncements(d.announcements || []));
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (editingId) {
      await fetch(`/api/announcements/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setSaving(false);
    setForm(emptyForm);
    setEditingId(null);
    load();
  }

  function startEdit(a: any) {
    setEditingId(a.id);
    setForm({ title: a.title, body: a.body, consulate: a.consulate || "", pinned: a.pinned });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={handleSubmit} className="card p-6 space-y-4 h-fit">
        <h3 className="font-bold text-navy-950">{editingId ? "Edit Announcement" : "New Announcement"}</h3>
        <div>
          <label className="label">Title</label>
          <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Body</label>
          <textarea className="input" rows={4} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
        <div>
          <label className="label">Consulate (optional — leave blank for general)</label>
          <select className="input" value={form.consulate} onChange={(e) => setForm({ ...form, consulate: e.target.value })}>
            <option value="">General</option>
            {CONSULATES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
          Pin to top
        </label>
        <div className="flex items-center gap-3">
          <button className="btn-gold" disabled={saving}>{saving ? "Saving…" : editingId ? "Update" : "Publish"}</button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold text-navy-950">{a.pinned && "📌 "}{a.title}</h4>
              <span className="text-xs text-gray-400 shrink-0">{fmtDate(a.createdAt)}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{a.body}</p>
            <div className="flex items-center gap-3 mt-3">
              <button onClick={() => startEdit(a)} className="text-xs text-navy-700 hover:underline">Edit</button>
              <button onClick={() => handleDelete(a.id)} className="text-xs text-red-600 hover:underline">Delete</button>
            </div>
          </div>
        ))}
        {announcements.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No announcements yet.</p>}
      </div>
    </div>
  );
}
