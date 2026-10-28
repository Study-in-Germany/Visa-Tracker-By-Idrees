"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Icon from "@/components/ui/Icon";
import { Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";
import { invalidateApi } from "@/hooks/useApi";
import { APPROVAL_OPTIONS, CONSULATE_FIELD_OPTIONS, VISA_STATUS_OPTIONS } from "@/lib/options";

const blank = { name: "", email: "", university: "", program: "", city: "", consulate: "Islamabad", visaStatus: "WAITING_LIST", approval: "APPROVED", waitingListDate: "" };

/** Admin-side "add applicant". The access code is only known at creation, so it is shown once here. */
export default function AddApplicantModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id: string; publicId: string; accessCode: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const set = (k: keyof typeof blank) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  function close() {
    if (busy) return;
    const created = done;
    setF(blank); setDone(null); setError(""); setCopied(false);
    onClose();
    if (created) onCreated?.(created.id);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setError("Name is required.");
    setBusy(true);
    setError("");
    try {
      const body: Record<string, unknown> = { ...f, name: f.name.trim(), isAnonymous: false };
      for (const k of Object.keys(body)) if (body[k] === "") delete body[k];
      const res = await apiFetch<{ id: string; publicId: string; accessCode: string }>("/api/admin/applicants", jsonInit("POST", body));
      invalidateApi("/api/applicants");
      invalidateApi("/api/admin/overview");
      setDone(res);
    } catch (err: any) {
      setError(err?.message || "Could not save the applicant.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!done) return;
    try { await navigator.clipboard.writeText(`Tracking ID: ${done.publicId}\nAccess code: ${done.accessCode}`); setCopied(true); } catch {}
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={done ? "Applicant added" : "Add applicant"}
      footer={
        done ? (
          <button type="button" className="btn-primary" onClick={close}>Open record</button>
        ) : (
          <>
            <button type="button" className="btn-secondary" onClick={close} disabled={busy}>Cancel</button>
            <button type="submit" form="add-applicant" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Add applicant"}</button>
          </>
        )
      }
    >
      {done ? (
        <div className="space-y-4">
          <Notice tone="success">Saved. Share these with the applicant now. The access code can&apos;t be shown again.</Notice>
          <dl className="divide-y divide-line rounded-xl border border-line">
            <div className="flex items-center justify-between gap-3 px-3.5 py-3"><dt className="text-xs text-mute">Tracking ID</dt><dd className="font-mono text-[15px] font-semibold">{done.publicId}</dd></div>
            <div className="flex items-center justify-between gap-3 px-3.5 py-3"><dt className="text-xs text-mute">Access code</dt><dd className="font-mono text-[15px] font-semibold">{done.accessCode}</dd></div>
          </dl>
          <button type="button" className="btn-secondary w-full" onClick={copy}><Icon name={copied ? "check" : "file"} size={14} /> {copied ? "Copied" : "Copy both"}</button>
        </div>
      ) : (
        <form id="add-applicant" onSubmit={submit} noValidate className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="aa-name" required className="sm:col-span-2">
            <input id="aa-name" className="input" value={f.name} onChange={(e) => set("name")(e.target.value)} autoFocus />
          </Field>
          <Field label="Email" htmlFor="aa-email" hint="Optional">
            <input id="aa-email" type="email" className="input" value={f.email} onChange={(e) => set("email")(e.target.value)} />
          </Field>
          <Field label="City" htmlFor="aa-city">
            <input id="aa-city" className="input" value={f.city} onChange={(e) => set("city")(e.target.value)} />
          </Field>
          <Field label="University" htmlFor="aa-uni">
            <input id="aa-uni" className="input" value={f.university} onChange={(e) => set("university")(e.target.value)} />
          </Field>
          <Field label="Programme" htmlFor="aa-prog">
            <input id="aa-prog" className="input" value={f.program} onChange={(e) => set("program")(e.target.value)} />
          </Field>
          <Field label="Embassy" htmlFor="aa-cons">
            <Select id="aa-cons" label="Embassy" value={f.consulate} onChange={set("consulate")} options={CONSULATE_FIELD_OPTIONS} />
          </Field>
          <Field label="Waiting list date" htmlFor="aa-wl">
            <DatePicker id="aa-wl" label="Waiting list date" value={f.waitingListDate} onChange={set("waitingListDate")} />
          </Field>
          <Field label="Visa status" htmlFor="aa-vs">
            <Select id="aa-vs" label="Visa status" value={f.visaStatus} onChange={set("visaStatus")} options={VISA_STATUS_OPTIONS} />
          </Field>
          <Field label="Review state" htmlFor="aa-ap">
            <Select id="aa-ap" label="Review state" value={f.approval} onChange={set("approval")} options={APPROVAL_OPTIONS} />
          </Field>
          {error && <div className="sm:col-span-2"><Notice tone="error">{error}</Notice></div>}
        </form>
      )}
    </Modal>
  );
}
