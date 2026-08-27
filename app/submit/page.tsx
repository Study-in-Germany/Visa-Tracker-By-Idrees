"use client";

import { useState } from "react";
import Link from "next/link";
import { CONSULATES, GENDER_LABELS } from "@/lib/constants";

const initialForm = {
  name: "", email: "", gender: "", city: "", province: "",
  university: "", program: "", intake: "", visaType: "",
  consulate: "Islamabad", waitingListCategory: "", sourceOfInformation: "",
  additionalDocuments: "", waitingListDate: "", submissionInviteDate: "",
  documentSubmissionDate: "", isAnonymous: true,
};

export default function SubmitPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ publicId: string; accessCode: string } | null>(null);

  function update<K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/applicants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError("Please check the form — some fields are invalid.");
      return;
    }
    setResult({ publicId: data.publicId, accessCode: data.accessCode });
  }

  if (result) {
    return (
      <div className="max-w-md mx-auto card p-6 text-center space-y-4">
        <h1 className="text-xl font-bold text-navy-950">Entry Submitted 🎉</h1>
        <p className="text-sm text-gray-600">
          Your entry is now pending admin review. Save these details — they won't be shown again:
        </p>
        <div className="bg-gray-50 border rounded-lg p-4 text-left space-y-2">
          <div>
            <div className="text-xs text-gray-400 uppercase">Tracking ID</div>
            <div className="font-mono font-bold text-navy-950">{result.publicId}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase">Access Code</div>
            <div className="font-mono font-bold text-navy-950">{result.accessCode}</div>
          </div>
        </div>
        <Link href="/login" className="btn-gold w-full block">Log In to My Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">Submit Your Visa Journey</h1>
        <p className="text-gray-600 text-sm mt-1">
          Your entry stays private until an admin reviews and approves it. Once approved, it
          appears on the public tracker in a partially-anonymous form.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <Fieldset title="Basic Information">
          <Field label="Name" required>
            <input className="input" required value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Email (private, for status updates)">
            <input type="email" className="input" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="Gender">
            <select className="input" value={form.gender} onChange={(e) => update("gender", e.target.value)}>
              <option value="">Prefer not to say</option>
              {Object.entries(GENDER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="City"><input className="input" value={form.city} onChange={(e) => update("city", e.target.value)} /></Field>
          <Field label="Province"><input className="input" value={form.province} onChange={(e) => update("province", e.target.value)} /></Field>
        </Fieldset>

        <Fieldset title="Program">
          <Field label="University"><input className="input" value={form.university} onChange={(e) => update("university", e.target.value)} /></Field>
          <Field label="Degree / Program"><input className="input" value={form.program} onChange={(e) => update("program", e.target.value)} /></Field>
          <Field label="Intake"><input className="input" placeholder="Winter 2026" value={form.intake} onChange={(e) => update("intake", e.target.value)} /></Field>
          <Field label="Visa Type"><input className="input" placeholder="National Visa - Student" value={form.visaType} onChange={(e) => update("visaType", e.target.value)} /></Field>
        </Fieldset>

        <Fieldset title="Visa Journey">
          <Field label="Consulate" required>
            <select className="input" required value={form.consulate} onChange={(e) => update("consulate", e.target.value)}>
              {CONSULATES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Waiting-List Category"><input className="input" value={form.waitingListCategory} onChange={(e) => update("waitingListCategory", e.target.value)} /></Field>
          <Field label="Waiting-List Registration Date">
            <input type="date" className="input" value={form.waitingListDate} onChange={(e) => update("waitingListDate", e.target.value)} />
          </Field>
          <Field label="Submission Invitation Date">
            <input type="date" className="input" value={form.submissionInviteDate} onChange={(e) => update("submissionInviteDate", e.target.value)} />
          </Field>
          <Field label="Document Submission Date">
            <input type="date" className="input" value={form.documentSubmissionDate} onChange={(e) => update("documentSubmissionDate", e.target.value)} />
          </Field>
        </Fieldset>

        <Fieldset title="Additional Info">
          <Field label="Source of Information"><input className="input" placeholder="e.g. found via WhatsApp group" value={form.sourceOfInformation} onChange={(e) => update("sourceOfInformation", e.target.value)} /></Field>
          <Field label="Additional Documents / Notes">
            <textarea className="input" rows={3} value={form.additionalDocuments} onChange={(e) => update("additionalDocuments", e.target.value)} />
          </Field>
        </Fieldset>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.isAnonymous} onChange={(e) => update("isAnonymous", e.target.checked)} />
          Keep my name hidden on the public tracker (recommended)
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button className="btn-gold w-full" disabled={loading}>
          {loading ? "Submitting…" : "Submit Entry"}
        </button>
      </form>
    </div>
  );
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="font-semibold text-navy-950 text-sm mb-1">{title}</legend>
      <div className="grid sm:grid-cols-2 gap-3">{children}</div>
    </fieldset>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
    </div>
  );
}
