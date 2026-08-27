"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { fmtDate, toInputDate } from "@/lib/format";
import { CONSULATES, GENDER_LABELS, VISA_STATUS_LABELS, JOURNEY_STAGES } from "@/lib/constants";

const DATE_FIELD_KEYS = JOURNEY_STAGES.map((s) => s.key);

export default function AdminApplicantEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [applicant, setApplicant] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [statusNote, setStatusNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    fetch(`/api/applicants/${id}`).then((r) => r.json()).then((data) => {
      const a = data.applicant;
      setApplicant(a);
      const f: any = {
        name: a.name || "", gender: a.gender || "", city: a.city || "", province: a.province || "",
        university: a.university || "", program: a.program || "", intake: a.intake || "",
        visaType: a.visaType || "", consulate: a.consulate, waitingListCategory: a.waitingListCategory || "",
        sourceOfInformation: a.sourceOfInformation || "", additionalDocuments: a.additionalDocuments || "",
        notes: a.notes || "", visaStatus: a.visaStatus, approval: a.approval, isAnonymous: a.isAnonymous,
      };
      for (const k of DATE_FIELD_KEYS) f[k] = toInputDate(a[k]);
      setForm(f);
    });
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch(`/api/applicants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, statusNote: statusNote || undefined }),
    });
    setSaving(false);
    setSaved(true);
    setStatusNote("");
    load();
  }

  async function handleDelete() {
    if (!confirm("Delete this applicant record permanently? This cannot be undone.")) return;
    await fetch(`/api/applicants/${id}`, { method: "DELETE" });
    router.push("/admin/applicants");
  }

  if (!applicant || !form) return <p className="text-center text-gray-400 py-12">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/applicants" className="text-sm text-navy-700 hover:underline">&larr; Back to Applicants</Link>
          <h2 className="text-lg font-bold text-navy-950 mt-1 font-mono">{applicant.publicId}</h2>
        </div>
        <StatusBadge status={applicant.visaStatus} />
      </div>

      <form onSubmit={handleSave} className="card p-6 space-y-6">
        <FieldGrid>
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Gender">
            <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">—</option>
              {Object.entries(GENDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="City"><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="Province"><input className="input" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} /></Field>
          <Field label="University"><input className="input" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} /></Field>
          <Field label="Program"><input className="input" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} /></Field>
          <Field label="Intake"><input className="input" value={form.intake} onChange={(e) => setForm({ ...form, intake: e.target.value })} /></Field>
          <Field label="Visa Type"><input className="input" value={form.visaType} onChange={(e) => setForm({ ...form, visaType: e.target.value })} /></Field>
          <Field label="Consulate">
            <select className="input" value={form.consulate} onChange={(e) => setForm({ ...form, consulate: e.target.value })}>
              {CONSULATES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Waiting-List Category"><input className="input" value={form.waitingListCategory} onChange={(e) => setForm({ ...form, waitingListCategory: e.target.value })} /></Field>
          <Field label="Source of Information"><input className="input" value={form.sourceOfInformation} onChange={(e) => setForm({ ...form, sourceOfInformation: e.target.value })} /></Field>
        </FieldGrid>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-navy-950 text-sm mb-3">Journey Dates</h3>
          <FieldGrid>
            {JOURNEY_STAGES.map((stage) => (
              <Field key={stage.key} label={stage.label}>
                <input type="date" className="input" value={form[stage.key]} onChange={(e) => setForm({ ...form, [stage.key]: e.target.value })} />
              </Field>
            ))}
          </FieldGrid>
        </div>

        <div className="border-t pt-4 grid sm:grid-cols-2 gap-4">
          <Field label="Visa Status">
            <select className="input" value={form.visaStatus} onChange={(e) => setForm({ ...form, visaStatus: e.target.value })}>
              {Object.entries(VISA_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Approval">
            <select className="input" value={form.approval} onChange={(e) => setForm({ ...form, approval: e.target.value })}>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <label className="label">Status Change Note (optional, emailed to applicant if status changes)</label>
            <input className="input" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
          </div>
        </div>

        <div className="border-t pt-4">
          <Field label="Internal Admin Notes (never shown publicly)">
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-gray-700 mt-3">
            <input type="checkbox" checked={form.isAnonymous} onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />
            Hide name on public tracker
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-gold" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
          {saved && <span className="text-sm text-emerald-600">Saved.</span>}
          <button type="button" onClick={handleDelete} className="ml-auto text-sm text-red-600 hover:underline">Delete Record</button>
        </div>
      </form>

      {applicant.history?.length > 0 && (
        <div className="card p-6">
          <h3 className="font-bold text-navy-950 mb-4">Status History</h3>
          <ul className="space-y-3 text-sm">
            {applicant.history.map((h: any) => (
              <li key={h.id} className="flex items-start justify-between gap-3">
                <div><StatusBadge status={h.visaStatus} />{h.note && <p className="text-gray-500 mt-1">{h.note}</p>}</div>
                <span className="text-gray-400 shrink-0">{fmtDate(h.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
