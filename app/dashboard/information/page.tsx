"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Checkbox from "@/components/ui/Checkbox";
import { ErrorState, LoadingBlock, Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";
import { toInputDate } from "@/lib/format";
import { JOURNEY_STAGES } from "@/lib/constants";
import { GENDER_OPTIONS, PROVINCE_OPTIONS, VISA_TYPE_OPTIONS } from "@/lib/options";
import IntakeSelect from "@/components/IntakeSelect";

const TEXT_FIELDS: [string, string][] = [
  ["name", "Name"], ["city", "City"], ["university", "University"], ["program", "Program"],
  ["waitingListCategory", "Waiting-list category"], ["sourceOfInformation", "Source of information"],
];
const LIST_KEYS = ["province", "intake", "visaType"];

export default function MyInformationPage() {
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadError, setLoadError] = useState("");

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  useEffect(() => {
    apiFetch("/api/applicant/me")
      .then((data) => {
        const a = data.applicant;
        const f: any = { gender: a.gender || "", additionalDocuments: a.additionalDocuments || "", consulate: a.consulate };
        for (const [k] of TEXT_FIELDS) f[k] = a[k] || "";
        for (const k of LIST_KEYS) f[k] = a[k] || "";
        for (const s of JOURNEY_STAGES) f[s.key] = toInputDate(a[s.key]);
        setForm(f);
        setIsAnonymous(a.isAnonymous);
      })
      .catch((e) => {
        if (e.status === 401) router.push("/login");
        else setLoadError(e.message);
      });
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      await apiFetch("/api/applicant/me", jsonInit("PATCH", { ...form, gender: form.gender || null, isAnonymous }));
      setSaved(true);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <div className="card"><ErrorState error={loadError} /></div>;
  if (!form) return <LoadingBlock />;

  return (
    <>
      <PageHeader title="My information" description="Changes appear on the public tracker after they are saved." />
      <form onSubmit={handleSave} className="space-y-3">
        <Panel title="Profile">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {TEXT_FIELDS.map(([k, label]) => (
              <Field key={k} label={label} htmlFor={`i-${k}`}>
                <input id={`i-${k}`} className="input" value={form[k]} onChange={(e) => set(k, e.target.value)} />
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
            <Field label="Gender" htmlFor="i-gender">
              <Select id="i-gender" label="Gender" value={form.gender} onChange={(v) => set("gender", v)} options={GENDER_OPTIONS} placeholder="Prefer not to say" clearable />
            </Field>
          </div>
        </Panel>

        <Panel title="Journey dates" description="Leave a date empty if it hasn't happened yet. Use × to clear one.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {JOURNEY_STAGES.map((s) => (
              <Field key={s.key} label={s.label} htmlFor={`i-${s.key}`}>
                <DatePicker id={`i-${s.key}`} label={s.label} value={form[s.key]} onChange={(v) => set(s.key, v)} />
              </Field>
            ))}
          </div>
        </Panel>

        <Panel title="Privacy">
          <Checkbox checked={isAnonymous} onChange={setIsAnonymous} label="Keep my name hidden on the public tracker" description="Your Tracking ID and journey stay visible." />
        </Panel>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-gold" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
          {saved && <Notice tone="success">Saved.</Notice>}
          {saveError && <Notice tone="error">{saveError}</Notice>}
        </div>
      </form>
    </>
  );
}
