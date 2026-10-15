"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Checkbox from "@/components/ui/Checkbox";
import Icon from "@/components/ui/Icon";
import { ErrorState, LoadingBlock, Notice } from "@/components/ui/States";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch, jsonInit } from "@/lib/api";
import { fmtDate, toInputDate } from "@/lib/format";
import { JOURNEY_STAGES } from "@/lib/constants";
import { APPROVAL_OPTIONS, CONSULATE_FIELD_OPTIONS, GENDER_OPTIONS, PROVINCE_OPTIONS, VISA_STATUS_OPTIONS, VISA_TYPE_OPTIONS } from "@/lib/options";
import IntakeSelect from "@/components/IntakeSelect";

const DATE_FIELD_KEYS = JOURNEY_STAGES.map((s) => s.key);
const TEXT_FIELDS: [string, string][] = [
  ["name", "Name"], ["city", "City"], ["university", "University"], ["program", "Program"],
  ["waitingListCategory", "Waiting-list category"], ["sourceOfInformation", "Source of information"],
];
const LIST_KEYS = ["province", "intake", "visaType"];

export default function AdminApplicantEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [applicant, setApplicant] = useState<any>(null);
  const [form, setForm] = useState<any>(null);
  const [statusNote, setStatusNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  function load() {
    apiFetch(`/api/applicants/${id}`)
      .then((data) => {
        const a = data.applicant;
        setApplicant(a);
        const f: any = {
          gender: a.gender || "", consulate: a.consulate, additionalDocuments: a.additionalDocuments || "",
          notes: a.notes || "", visaStatus: a.visaStatus, approval: a.approval, isAnonymous: a.isAnonymous,
        };
        for (const [k] of TEXT_FIELDS) f[k] = a[k] || "";
        for (const k of LIST_KEYS) f[k] = a[k] || "";
        for (const k of DATE_FIELD_KEYS) f[k] = toInputDate(a[k]);
        setForm(f);
      })
      .catch((e) => setError(e.message));
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      await apiFetch(`/api/applicants/${id}`, jsonInit("PATCH", { ...form, gender: form.gender || null, statusNote: statusNote || undefined }));
      setSaved(true);
      setStatusNote("");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this applicant? This will hide the entry and disable applicant access.")) return;
    try {
      await apiFetch(`/api/applicants/${id}`, { method: "DELETE" });
      router.push("/admin/applicants");
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (error && !form) return <div className="card"><ErrorState error={error} onRetry={load} /></div>;
  if (!applicant || !form) return <LoadingBlock />;

  return (
    <>
      <Link href="/admin/applicants" className="mb-2 inline-flex items-center gap-1 text-xs text-mute hover:text-ink-900">
        <Icon name="chevronLeft" size={14} /> Applicants
      </Link>
      <PageHeader title={applicant.publicId} description={applicant.name} actions={<StatusBadge status={applicant.visaStatus} />} />

      <form onSubmit={handleSave} className="space-y-3">
        <Panel title="Profile">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {TEXT_FIELDS.map(([k, label]) => (
              <Field key={k} label={label} htmlFor={`f-${k}`}>
                <input id={`f-${k}`} className="input" value={form[k]} onChange={(e) => set(k, e.target.value)} />
              </Field>
            ))}
            <Field label="Province" htmlFor="p-province">
              <Select id="p-province" label="Province" value={form.province} onChange={(v) => set("province", v)} options={PROVINCE_OPTIONS} placeholder="Select province" clearable />
            </Field>
            <Field label="Visa type" htmlFor="p-visaType">
              <Select id="p-visaType" label="Visa type" value={form.visaType} onChange={(v) => set("visaType", v)} options={VISA_TYPE_OPTIONS} placeholder="Select visa type" clearable />
            </Field>
            <Field label="Intake">
              <IntakeSelect idPrefix="p-intake" value={form.intake} onChange={(v) => set("intake", v)} />
            </Field>
            <Field label="Gender" htmlFor="f-gender">
              <Select id="f-gender" label="Gender" value={form.gender} onChange={(v) => set("gender", v)} options={GENDER_OPTIONS} placeholder="Not specified" clearable />
            </Field>
            <Field label="Embassy" htmlFor="f-consulate">
              <Select id="f-consulate" label="Embassy" value={form.consulate} onChange={(v) => set("consulate", v)} options={CONSULATE_FIELD_OPTIONS} />
            </Field>
          </div>
        </Panel>

        <Panel title="Journey dates" description="Each date can be cleared with the × button.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {JOURNEY_STAGES.map((stage) => (
              <Field key={stage.key} label={stage.label} htmlFor={`f-${stage.key}`}>
                <DatePicker id={`f-${stage.key}`} label={stage.label} value={form[stage.key]} onChange={(v) => set(stage.key, v)} />
              </Field>
            ))}
          </div>
        </Panel>

        <Panel title="Review">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Visa status" htmlFor="f-visaStatus">
              <Select id="f-visaStatus" label="Visa status" value={form.visaStatus} onChange={(v) => set("visaStatus", v)} options={VISA_STATUS_OPTIONS} />
            </Field>
            <Field label="Approval" htmlFor="f-approval">
              <Select id="f-approval" label="Approval" value={form.approval} onChange={(v) => set("approval", v)} options={APPROVAL_OPTIONS} />
            </Field>
            <Field label="Status change note" htmlFor="f-note" hint="Optional. Emailed to the applicant when the status changes." className="sm:col-span-2">
              <input id="f-note" className="input" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
            </Field>
            <Field label="Internal notes" htmlFor="f-notes" hint="Never shown publicly." className="sm:col-span-2">
              <textarea id="f-notes" className="input min-h-[84px]" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <div className="mt-2">
            <Checkbox checked={form.isAnonymous} onChange={(v) => set("isAnonymous", v)} label="Hide name on the public tracker" />
          </div>
        </Panel>

        <div className="sticky bottom-0 z-10 -mx-3 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6">
          <button className="btn-gold" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
          {saved && <Notice tone="success">Saved.</Notice>}
          {error && <Notice tone="error">{error}</Notice>}
          <button type="button" onClick={handleDelete} className="ml-auto text-xs font-medium text-red-700 hover:underline">Delete record</button>
        </div>
      </form>

      {applicant.history?.length > 0 && (
        <Panel title="Status history" className="mt-3">
          <ul className="divide-y divide-line">
            {applicant.history.map((h: any) => (
              <li key={h.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div>
                  <StatusBadge status={h.visaStatus} />
                  {h.note && <p className="mt-1 text-xs text-mute">{h.note}</p>}
                </div>
                <span className="shrink-0 text-xs text-mute">{fmtDate(h.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
