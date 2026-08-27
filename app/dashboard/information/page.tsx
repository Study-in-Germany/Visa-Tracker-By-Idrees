"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toInputDate } from "@/lib/format";
import { CONSULATES, GENDER_LABELS } from "@/lib/constants";

const EDITABLE_FIELDS = [
  "name", "gender", "city", "province", "university", "program", "intake", "visaType",
  "waitingListCategory", "sourceOfInformation", "additionalDocuments",
];
const DATE_FIELDS = [
  "waitingListDate", "submissionInviteDate", "documentSubmissionDate",
  "correctionRequestDate", "correctionSubmittedDate", "appointmentDate", "interviewDate", "decisionDate",
];

export default function MyInformationPage() {
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/applicant/me").then((r) => {
      if (r.status === 401) { router.push("/login"); return null; }
      return r.json();
    }).then((data) => {
      if (!data) return;
      const a = data.applicant;
      const f: any = {};
      for (const k of EDITABLE_FIELDS) f[k] = a[k] || "";
      for (const k of DATE_FIELDS) f[k] = toInputDate(a[k]);
      f.consulate = a.consulate;
      setForm(f);
      setIsAnonymous(a.isAnonymous);
    });
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/applicant/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, isAnonymous }),
    });
    setSaving(false);
    setSaved(true);
  }

  if (!form) return <p className="text-center text-gray-400 py-12">Loading…</p>;

  return (
    <form onSubmit={handleSave} className="card p-6 space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Gender</label>
          <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="">Prefer not to say</option>
            {Object.entries(GENDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label">City</label>
          <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div>
          <label className="label">Province</label>
          <input className="input" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
        </div>
        <div>
          <label className="label">University</label>
          <input className="input" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })} />
        </div>
        <div>
          <label className="label">Program</label>
          <input className="input" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} />
        </div>
        <div>
          <label className="label">Intake</label>
          <input className="input" value={form.intake} onChange={(e) => setForm({ ...form, intake: e.target.value })} />
        </div>
        <div>
          <label className="label">Visa Type</label>
          <input className="input" value={form.visaType} onChange={(e) => setForm({ ...form, visaType: e.target.value })} />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold text-navy-950 text-sm mb-3">Journey Dates</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {DATE_FIELDS.map((f) => (
            <div key={f}>
              <label className="label capitalize">{f.replace(/([A-Z])/g, " $1")}</label>
              <input type="date" className="input" value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
        Keep my name hidden on the public tracker
      </label>

      <div className="flex items-center gap-3">
        <button className="btn-gold" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
        {saved && <span className="text-sm text-emerald-600">Saved.</span>}
      </div>
    </form>
  );
}
