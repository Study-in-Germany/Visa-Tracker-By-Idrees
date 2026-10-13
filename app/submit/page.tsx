"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Icon from "@/components/ui/Icon";
import { Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import Checkbox from "@/components/ui/Checkbox";
import IntakeSelect from "@/components/IntakeSelect";
import { CONSULATE_FIELD_OPTIONS, GENDER_OPTIONS, PROVINCE_OPTIONS, VISA_TYPE_OPTIONS } from "@/lib/options";
import { GENDER_LABELS } from "@/lib/constants";

const initialForm = {
  name: "", email: "", gender: "", city: "", province: "",
  university: "", program: "", intake: "", visaType: "",
  consulate: "Islamabad", sourceOfInformation: "", additionalDocuments: "",
  waitingListDate: "", submissionInviteDate: "", documentSubmissionDate: "",
  appointmentDate: "", interviewDate: "", decisionDate: "",
};
type Form = typeof initialForm;

const JOURNEY: { key: keyof Form; label: string }[] = [
  { key: "waitingListDate", label: "Waiting-list registration" },
  { key: "submissionInviteDate", label: "Submission invitation" },
  { key: "documentSubmissionDate", label: "Documents submitted" },
  { key: "appointmentDate", label: "Appointment booked" },
  { key: "interviewDate", label: "Interview" },
  { key: "decisionDate", label: "Visa received" },
];

const STEPS = [
  { title: "About you", hint: "Basic details" },
  { title: "Program", hint: "Where you are going" },
  { title: "Journey", hint: "Your visa dates" },
  { title: "Review", hint: "Check and submit" },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-paper-sunk px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wider text-mute">{label}</div>
        <div className="truncate font-mono text-sm font-semibold">{value}</div>
      </div>
      <button
        type="button"
        className="btn-secondary !min-h-[30px] !px-2.5 !text-xs"
        onClick={() => navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {})}
      >
        {copied ? <><Icon name="check" size={12} /> Copied</> : "Copy"}
      </button>
    </div>
  );
}

export default function SubmitPage() {
  const [form, setForm] = useState<Form>(initialForm);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [anonymous, setAnonymous] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ publicId: string; accessCode: string } | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const text = (key: keyof Form, label: string, props: { placeholder?: string; type?: string; required?: boolean; autoComplete?: string } = {}) => (
    <Field label={label} htmlFor={`s-${key}`} required={props.required} error={errors[key]}>
      <input
        id={`s-${key}`}
        className={`input ${errors[key] ? "!border-red-400" : ""}`}
        type={props.type}
        inputMode={props.type === "email" ? "email" : undefined}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </Field>
  );

  // Soft check: a stage dated before the previous recorded stage is probably a typo.
  const orderWarning = (i: number) => {
    const cur = form[JOURNEY[i].key];
    if (!cur) return undefined;
    for (let j = i - 1; j >= 0; j--) {
      const prev = form[JOURNEY[j].key];
      if (prev) return cur < prev ? `This is before "${JOURNEY[j].label}" (${fmtDate(prev)}). Check the date.` : undefined;
    }
    return undefined;
  };

  function validate(s: number) {
    const next: Partial<Record<keyof Form, string>> = {};
    if (s === 0) {
      if (!form.name.trim()) next.name = "Please enter your name.";
      if (form.email && !EMAIL.test(form.email)) next.email = "Enter a valid email address or leave it empty.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function go(to: number) {
    setStep(to);
    setError("");
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const { gender, ...rest } = form;
      const data = await apiFetch("/api/applicants", jsonInit("POST", { ...rest, ...(gender ? { gender } : {}), isAnonymous: anonymous }));
      setResult({ publicId: data.publicId, accessCode: data.accessCode });
    } catch (err: any) {
      setError(err.message || "Please check the form — some fields are invalid.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      if (validate(step)) go(step + 1);
    } else {
      // never submit with an invalid first step
      if (!validate(0)) return go(0);
      submit();
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-md pt-6">
        <Panel>
          <div className="space-y-2 text-center">
            <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Icon name="check" /></span>
            <h1 className="text-lg font-semibold">Entry submitted</h1>
            <p className="text-[13px] text-mute">It is pending admin review. Save these details now. They are shown only once.</p>
          </div>
          <div className="mt-4 space-y-2">
            <CopyRow label="Tracking ID" value={result.publicId} />
            <CopyRow label="Access code" value={result.accessCode} />
          </div>
          <Link href="/login" className="btn-gold mt-4 w-full">Log in to my dashboard</Link>
        </Panel>
      </div>
    );
  }

  const filled = JOURNEY.filter((j) => form[j.key]).length;
  const last = step === STEPS.length - 1;

  return (
    <>
      <div ref={top} className="scroll-mt-16" />
      <PageHeader title="Submit your visa journey" description="Your entry stays private until an admin approves it, then appears on the public tracker." />

      {/* Stepper: numbered pills on larger screens, compact bar on phones */}
      <nav aria-label="Progress" className="mb-4">
        <ol className="hidden gap-2 sm:grid sm:grid-cols-4">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.title}>
                <button
                  type="button"
                  disabled={i > step}
                  onClick={() => i < step && go(i)}
                  aria-current={active ? "step" : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors ${active ? "border-ink-800 bg-paper-raised" : "border-line bg-paper-raised/60"} ${done ? "hover:bg-paper-raised" : ""} disabled:cursor-default`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? "bg-emerald-600 text-white" : active ? "bg-ink-800 text-paper-raised" : "bg-paper-sunk text-mute"}`}>
                    {done ? <Icon name="check" size={13} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-[13px] font-medium ${active ? "" : "text-ink-700"}`}>{s.title}</span>
                    <span className="block truncate text-[11px] text-mute">{s.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="sm:hidden">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">{STEPS[step].title}</span>
            <span className="text-xs text-mute">Step {step + 1} of {STEPS.length}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-sunk">
            <div className="h-full rounded-full bg-clay-500 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>
      </nav>

      <form onSubmit={onSubmit} noValidate className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          {step === 0 && (
            <Panel title="About you" description="Your name stays hidden on the public tracker if you choose to be anonymous later.">
              <div className="grid gap-3 sm:grid-cols-2">
                {text("name", "Full name", { required: true, autoComplete: "name" })}
                {text("email", "Email", { type: "email", placeholder: "Private, for status updates", autoComplete: "email" })}
                <Field label="Gender" htmlFor="s-gender">
                  <Select id="s-gender" label="Gender" value={form.gender} onChange={(v) => set("gender", v)} options={GENDER_OPTIONS} placeholder="Prefer not to say" clearable />
                </Field>
                {text("city", "City")}
                <Field label="Province" htmlFor="s-province">
                  <Select id="s-province" label="Province" value={form.province} onChange={(v) => set("province", v)} options={PROVINCE_OPTIONS} placeholder="Select province" clearable />
                </Field>
              </div>
            </Panel>
          )}

          {step === 1 && (
            <Panel title="Program" description="All optional. Add what you know.">
              <div className="grid gap-3 sm:grid-cols-2">
                {text("university", "University")}
                {text("program", "Degree / program")}
                <Field label="Intake" htmlFor="s-intake-season">
                  <IntakeSelect idPrefix="s-intake" value={form.intake} onChange={(v) => set("intake", v)} />
                </Field>
                <Field label="Visa type" htmlFor="s-visaType">
                  <Select id="s-visaType" label="Visa type" value={form.visaType} onChange={(v) => set("visaType", v)} options={VISA_TYPE_OPTIONS} placeholder="Select visa type" clearable />
                </Field>
              </div>
            </Panel>
          )}

          {step === 2 && (
            <Panel title="Visa journey" description="Fill in what has happened so far and leave the rest empty. Use × on a date to clear it.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Embassy" htmlFor="s-consulate" required className="sm:col-span-2">
                  <Select id="s-consulate" label="Embassy" value={form.consulate} onChange={(v) => set("consulate", v)} options={CONSULATE_FIELD_OPTIONS} />
                </Field>
                {JOURNEY.map((j, i) => (
                  <div key={j.key}>
                    <Field label={j.label} htmlFor={`s-${j.key}`}>
                      <DatePicker id={`s-${j.key}`} label={j.label} value={form[j.key]} onChange={(v) => set(j.key, v)} />
                    </Field>
                    {orderWarning(i) && <p className="mt-1 text-xs text-ochre-700">{orderWarning(i)}</p>}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {/* Identity summary */}
              <div className="card flex items-center gap-3 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-clay-50 text-base font-semibold text-clay-600">
                  {(form.name.trim()[0] || "?").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{form.name || "No name yet"}</p>
                  <p className="truncate text-xs text-mute">
                    {[form.university, form.intake, form.consulate && `${form.consulate} embassy`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="ml-auto hidden rounded-md bg-ochre-50 px-2 py-1 text-[11px] font-semibold text-ochre-700 sm:inline">Not submitted yet</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <ReviewCard title="About you" onEdit={() => go(0)}>
                  <Row label="Email" value={form.email} />
                  <Row label="Gender" value={form.gender ? GENDER_LABELS[form.gender] : ""} />
                  <Row label="City" value={form.city} />
                  <Row label="Province" value={form.province} />
                </ReviewCard>
                <ReviewCard title="Program" onEdit={() => go(1)}>
                  <Row label="University" value={form.university} />
                  <Row label="Program" value={form.program} />
                  <Row label="Intake" value={form.intake} />
                  <Row label="Visa type" value={form.visaType} />
                </ReviewCard>
              </div>

              <ReviewCard title={`Journey · ${filled} of ${JOURNEY.length} dates`} onEdit={() => go(2)}>
                <ol className="relative ml-1.5 space-y-3 border-l border-line-strong pl-5">
                  {JOURNEY.map((j) => {
                    const v = form[j.key];
                    return (
                      <li key={j.key} className="relative flex items-baseline justify-between gap-3">
                        <span className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-paper-raised ${v ? "bg-clay-500" : "bg-line-strong"}`} />
                        <span className={v ? "font-medium" : "text-mute"}>{j.label}</span>
                        <span className={v ? "tabular-nums" : "text-mute"}>{v ? fmtDate(v) : "Not yet"}</span>
                      </li>
                    );
                  })}
                </ol>
              </ReviewCard>

              <Panel title="Optional extras">
                <div className="grid gap-3 sm:grid-cols-2">
                  {text("sourceOfInformation", "Where did you hear about this?", { placeholder: "e.g. WhatsApp group" })}
                  <Field label="Notes or additional documents" htmlFor="s-notes">
                    <textarea id="s-notes" className="input min-h-[84px]" rows={3} value={form.additionalDocuments} onChange={(e) => set("additionalDocuments", e.target.value)} />
                  </Field>
                </div>
              </Panel>

              <Panel title="Privacy">
                <Checkbox
                  checked={anonymous}
                  onChange={setAnonymous}
                  label="Hide my name on the public tracker"
                  description="Your Tracking ID, university and dates stay visible. Your email is never shown."
                />
                <p className="mt-2 flex items-start gap-1.5 text-xs text-mute">
                  <Icon name="shield" size={13} className="mt-0.5 shrink-0" />
                  An admin reviews every entry before it appears publicly. You can change these settings later from your dashboard.
                </p>
              </Panel>
            </div>
          )}

          {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}

          {/* Sticky action bar keeps Back / Next under the thumb on phones */}
          <div className="sticky bottom-0 z-10 -mx-3 mt-3 flex items-center justify-between gap-2 border-t border-line bg-paper/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
            <button type="button" onClick={() => go(step - 1)} disabled={step === 0} className="btn-secondary min-w-[88px] disabled:invisible">
              <Icon name="chevronLeft" size={14} /> Back
            </button>
            <button className="btn-gold min-w-[120px] flex-1 sm:flex-none" disabled={loading}>
              {last ? (loading ? "Submitting…" : "Submit entry") : <>Next <Icon name="chevronRight" size={14} /></>}
            </button>
          </div>
        </div>

        <aside className="hidden space-y-3 lg:sticky lg:top-16 lg:block">
          <Panel title="Dates recorded">
            <p className="text-2xl font-semibold tabular-nums">{filled}<span className="text-sm font-medium text-mute"> / {JOURNEY.length}</span></p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-sunk">
              <div className="h-full rounded-full bg-clay-500 transition-all" style={{ width: `${(filled / JOURNEY.length) * 100}%` }} />
            </div>
          </Panel>
          <Panel title="What happens next">
            <ol className="space-y-2 text-[13px] text-ink-700">
              <li className="flex gap-2"><span className="font-semibold text-clay-500">1</span> An admin reviews your entry.</li>
              <li className="flex gap-2"><span className="font-semibold text-clay-500">2</span> You get a Tracking ID and access code.</li>
              <li className="flex gap-2"><span className="font-semibold text-clay-500">3</span> Log in any time to update your dates.</li>
            </ol>
          </Panel>
        </aside>
      </form>
    </>
  );
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-mute">{title}</h2>
        <button type="button" onClick={onEdit} className="inline-flex min-h-[28px] items-center gap-1 rounded-md px-2 text-xs font-medium text-clay-600 hover:bg-clay-50">
          <Icon name="edit" size={12} /> Edit
        </button>
      </div>
      <dl className="text-[13px]">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-1.5 last:border-0">
      <dt className="shrink-0 text-mute">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value || <span className="font-normal text-mute">—</span>}</dd>
    </div>
  );
}
