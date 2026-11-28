"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FocusedWorkflowLayout from "@/components/submit/FocusedWorkflowLayout";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import Panel from "@/components/ui/Panel";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import Icon from "@/components/ui/Icon";
import { Notice } from "@/components/ui/States";
import EditableVisaJourney from "@/components/visa/journey/EditableVisaJourney";
import VisaJourneyReview from "@/components/visa/journey/VisaJourneyReview";
import { ApiError, apiFetch, jsonInit } from "@/lib/api";
import { invalidateApi } from "@/hooks/useApi";
import {
  ALL_SUBMISSION_MILESTONES,
  validateSubmissionJourneyDates,
  type SubmissionMilestoneKey,
} from "@/lib/journey-validation";
import Toggle from "@/components/ui/Toggle";
import IntakeSelect from "@/components/IntakeSelect";
import { GENDER_OPTIONS, PROVINCE_OPTIONS, VISA_TYPE_OPTIONS } from "@/lib/options";
import { GENDER_LABELS } from "@/lib/constants";

const initialForm = {
  name: "",
  email: "",
  gender: "",
  city: "",
  province: "",
  university: "",
  program: "",
  intake: "",
  visaType: "",
  consulate: "Islamabad",
  sourceOfInformation: "",
  additionalDocuments: "",
  waitingListDate: "",
  submissionInviteDate: "",
  documentSubmissionDate: "",
  correctionRequestDate: "",
  correctionSubmittedDate: "",
  appointmentDate: "",
  interviewDate: "",
  decisionDate: "",
};
type Form = typeof initialForm;

const STEP_FIELDS: Record<number, (keyof Form)[]> = {
  0: ["name", "email", "gender", "city", "province"],
  1: ["university", "program", "intake", "visaType"],
  2: ["consulate", ...ALL_SUBMISSION_MILESTONES.map((j) => j.key)],
  3: ["sourceOfInformation", "additionalDocuments"],
};

const STEPS = [
  { title: "About you", hint: "Basic details" },
  { title: "Program", hint: "Where you are going" },
  { title: "Journey", hint: "Your visa dates" },
  { title: "Review", hint: "Check and submit" },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESULT_STORAGE_KEY = "vt.submit.lastResult";

interface SubmitResult {
  publicId: string;
  accessCode?: string;
  emailConfirmationSent?: boolean;
  email?: string;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper-sunk px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wider text-mute">{label}</div>
        <div className="truncate font-mono text-sm font-semibold text-ink-900">{value}</div>
      </div>
      <button
        type="button"
        className="btn-secondary !min-h-[36px] !px-3 !text-xs"
        onClick={() =>
          navigator.clipboard
            ?.writeText(value)
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
            .catch(() => {})
        }
      >
        {copied ? (
          <>
            <Icon name="check" size={13} /> Copied
          </>
        ) : (
          "Copy"
        )}
      </button>
    </div>
  );
}

export default function SubmitPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(initialForm);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>("");

  const isDirty = useMemo(() => {
    if (anonymous) return true;
    for (const [k, v] of Object.entries(form)) {
      if (k === "consulate") {
        if (v !== "Islamabad") return true;
      } else if (v.trim() !== "") {
        return true;
      }
    }
    return false;
  }, [form, anonymous]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(RESULT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.publicId) setResult(parsed);
      }
    } catch {}
  }, []);

  // Warn before accidental browser tab close/refresh when unsaved draft exists
  useEffect(() => {
    if (!isDirty || result) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, result]);

  // Support Android hardware / swipe back across wizard steps cleanly
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const targetStep = e.state?.submitStep;
      if (typeof targetStep === "number" && targetStep >= 0 && targetStep < STEPS.length) {
        setStep(targetStep);
        setError("");
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const liveJourneyErrors = useMemo(() => validateSubmissionJourneyDates(form), [form]);

  const journeyErrors = useMemo(() => {
    const merged: Partial<Record<SubmissionMilestoneKey, string>> = { ...liveJourneyErrors };
    for (const m of ALL_SUBMISSION_MILESTONES) {
      if (errors[m.key]) merged[m.key] = errors[m.key];
    }
    return merged;
  }, [liveJourneyErrors, errors]);

  const text = (
    key: keyof Form,
    label: string,
    props: { placeholder?: string; type?: string; required?: boolean; autoComplete?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] } = {},
  ) => (
    <Field label={label} htmlFor={`s-${key}`} required={props.required} error={errors[key]}>
      <input
        id={`s-${key}`}
        className={`input !min-h-[46px] ${errors[key] ? "!border-red-500 dark:!border-red-500/80" : ""}`}
        type={props.type}
        inputMode={props.inputMode ?? (props.type === "email" ? "email" : undefined)}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </Field>
  );

  function validate(s: number) {
    const next: Partial<Record<keyof Form, string>> = {};
    if (s === 0) {
      if (!form.name.trim()) next.name = "Please enter your name.";
      if (form.email.trim() && !EMAIL.test(form.email.trim())) {
        next.email = "Enter a valid email address or leave it empty.";
      }
    }
    if (s === 2) {
      if (!form.consulate.trim()) next.consulate = "Please select an embassy.";
      Object.assign(next, validateSubmissionJourneyDates(form));
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function go(to: number, pushHistory = true) {
    setStep(to);
    setError("");
    if (pushHistory && typeof window !== "undefined") {
      try {
        window.history.pushState({ submitStep: to }, "");
      } catch {}
    }
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const exitWizard = useCallback(() => {
    setShowDiscardModal(false);
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.push("/");
    } else {
      router.push("/");
    }
  }, [router]);

  const handleCancel = useCallback(() => {
    if (!isDirty || result) {
      exitWizard();
    } else {
      setShowDiscardModal(true);
    }
  }, [isDirty, result, exitWizard]);

  const handleBack = useCallback(() => {
    if (result) {
      exitWizard();
      return;
    }
    if (step > 0) {
      go(step - 1, false);
      return;
    }
    handleCancel();
  }, [result, step, exitWizard, handleCancel]);

  function nextIdempotencyKey() {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return idempotencyKeyRef.current;
  }

  async function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setLoading(true);
    try {
      const { gender, ...rest } = form;
      const init = jsonInit("POST", {
        ...rest,
        name: rest.name.trim(),
        email: rest.email.trim(),
        ...(gender ? { gender } : {}),
        isAnonymous: anonymous,
      });
      const data = await apiFetch("/api/applicants", {
        ...init,
        headers: {
          ...(init.headers as Record<string, string>),
          "Idempotency-Key": nextIdempotencyKey(),
        },
      });
      const saved: SubmitResult = {
        publicId: data.publicId,
        accessCode: data.accessCode,
        emailConfirmationSent: Boolean(data.emailConfirmationSent),
        email: rest.email.trim() || undefined,
      };
      try {
        sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(saved));
      } catch {}
      invalidateApi("/api/stats");
      invalidateApi("/api/analytics");
      invalidateApi("/api/admin");
      setResult(saved);
    } catch (err: any) {
      if (err instanceof ApiError && err.fields) {
        const mapped: Partial<Record<keyof Form, string>> = {};
        let firstBadStep: number | null = null;
        for (const [key, messages] of Object.entries(err.fields)) {
          if (messages?.length && key in initialForm) {
            const k = key as keyof Form;
            mapped[k] = messages[0];
            if (firstBadStep === null) {
              for (const [stepIdx, keys] of Object.entries(STEP_FIELDS)) {
                if (keys.includes(k)) {
                  firstBadStep = Number(stepIdx);
                  break;
                }
              }
            }
          }
        }
        if (Object.keys(mapped).length > 0) setErrors(mapped);
        if (firstBadStep !== null && firstBadStep !== step) go(firstBadStep);
      }
      setError(err.message || "Please check the form — some fields are invalid.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  function resetSubmission() {
    idempotencyKeyRef.current = "";
    try {
      sessionStorage.removeItem(RESULT_STORAGE_KEY);
    } catch {}
    setResult(null);
    setForm(initialForm);
    setAnonymous(false);
    setErrors({});
    setError("");
    setStep(0);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      if (validate(step)) go(step + 1);
    } else {
      if (!validate(0)) return go(0);
      if (!validate(2)) return go(2);
      submit();
    }
  }

  if (result) {
    return (
      <FocusedWorkflowLayout title="Entry submitted" onBack={() => router.push("/")} hideCancel>
        <div className="mx-auto max-w-md pt-2">
          <Panel>
            <div className="space-y-2 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                <Icon name="check" size={20} />
              </span>
              <h2 className="text-lg font-semibold text-ink-900">Your entry is saved</h2>
              <p className="text-[13px] text-mute">
                Status: <strong className="text-ink-900">Pending Review</strong>. Save these credentials now — your access code is shown once.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <CopyRow label="Tracking ID" value={result.publicId} />
              {result.accessCode && <CopyRow label="Access code" value={result.accessCode} />}
            </div>

            <div className="mt-4 space-y-1.5 rounded-lg border border-line bg-paper-sunk p-3 text-xs text-mute">
              <p className="font-semibold text-ink-900">What happens next</p>
              <p>
                • Sign in anytime with <strong className="text-ink-900">Tracking ID + Access code</strong>
                {result.email ? " or request a 6-digit email OTP." : "."}
              </p>
              <p>• Your entry appears in My Journey &amp; forecasts right after admin approval.</p>
              {result.email && (
                <p>
                  • Confirmation email: {result.emailConfirmationSent ? `sent to ${result.email}.` : `queued for ${result.email}.`}
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link href="/login" className="btn-primary !min-h-[46px] flex-1 justify-center">
                Sign in to my dashboard
              </Link>
              <button type="button" onClick={resetSubmission} className="btn-secondary !min-h-[46px] flex-1 justify-center">
                Submit another
              </button>
            </div>
          </Panel>
        </div>
      </FocusedWorkflowLayout>
    );
  }

  const filled = ALL_SUBMISSION_MILESTONES.filter((j) => form[j.key]).length;
  const last = step === STEPS.length - 1;
  const actions = (
    <>
      <button type="submit" form="submit-journey-form" className="btn-primary !min-h-[46px] flex-1 lg:w-full lg:flex-none" disabled={loading}>
        {last ? (loading ? "Submitting…" : "Submit entry") : <>Continue <Icon name="chevronRight" size={15} /></>}
      </button>
      {step > 0 && (
        <button type="button" onClick={() => go(step - 1, false)} disabled={loading} className="btn-secondary !min-h-[46px] lg:w-full">
          <Icon name="arrowLeft" size={15} /> Back
        </button>
      )}
    </>
  );

  const desktopAside = (
    <>
      <div className="card space-y-3.5 p-4">
        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[14px] font-semibold">Progress</h2>
            <span className="text-xs tabular-nums text-mute">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-sunk" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
            <div className="h-full rounded-full bg-blue-600 transition-all dark:bg-[#FAFAFA]" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>
        <ol className="space-y-1">
          {STEPS.map((st, i) => (
            <li key={st.title}>
              <button
                type="button"
                disabled={i > step}
                onClick={() => i < step && go(i, false)}
                aria-current={i === step ? "step" : undefined}
                className="flex min-h-[34px] w-full items-center gap-2.5 rounded-lg px-1.5 text-left text-[13px] disabled:cursor-default"
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                    i < step
                      ? "bg-emerald-600 text-white"
                      : i === step
                        ? "bg-ink-900 text-white dark:bg-[#FAFAFA] dark:text-[#0A0A0A]"
                        : "bg-paper-sunk text-mute"
                  }`}
                >
                  {i < step ? <Icon name="check" size={11} strokeWidth={3} /> : i + 1}
                </span>
                <span className={i === step ? "font-semibold" : i < step ? "text-ink-700" : "text-mute"}>{st.title}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2 border-t border-line pt-3.5">{actions}</div>
      </div>

      {step === 2 && (
        <div className="card p-4">
          <p className="text-xl font-semibold tabular-nums">
            {filled}
            <span className="text-sm font-medium text-mute"> / {ALL_SUBMISSION_MILESTONES.length} dates</span>
          </p>
          <p className="mt-1 text-xs text-mute">Add known dates now and update future stages anytime.</p>
        </div>
      )}
    </>
  );

  return (
    <>
      <FocusedWorkflowLayout
        title="Submit entry"
        step={step}
        totalSteps={STEPS.length}
        stepLabel={STEPS[step].title}
        onBack={handleBack}
        onCancel={handleCancel}
        footer={actions}
        aside={desktopAside}
      >
        <div ref={top} className="scroll-mt-20" />

        <form id="submit-journey-form" onSubmit={onSubmit} noValidate className="space-y-4">
          {step === 0 && (
            <StepSection title="About you" description="Your name can be hidden on the last step. Email is never shown publicly.">
              <div className="grid gap-4 sm:grid-cols-2">
                {text("name", "Full name", { required: true, autoComplete: "name", placeholder: "Your name" })}
                {text("email", "Email", { type: "email", placeholder: "Private, for OTP login & updates", autoComplete: "email" })}
                <Field label="Gender" htmlFor="s-gender">
                  <Select id="s-gender" label="Gender" value={form.gender} onChange={(v) => set("gender", v)} options={GENDER_OPTIONS} placeholder="Prefer not to say" clearable />
                </Field>
                {text("city", "City", { placeholder: "e.g. Lahore" })}
                <Field label="Province" htmlFor="s-province">
                  <Select id="s-province" label="Province" value={form.province} onChange={(v) => set("province", v)} options={PROVINCE_OPTIONS} placeholder="Select province" clearable />
                </Field>
              </div>
            </StepSection>
          )}

          {step === 1 && (
            <StepSection title="Where are you going?" description="Optional details. You can add or update these from your dashboard.">
              <div className="grid gap-4 sm:grid-cols-2">
                {text("university", "University", { placeholder: "e.g. TU Munich" })}
                {text("program", "Degree / program", { placeholder: "e.g. MSc Informatics" })}
                <Field label="Intake" htmlFor="s-intake-season">
                  <IntakeSelect idPrefix="s-intake" value={form.intake} onChange={(v) => set("intake", v)} />
                </Field>
                <Field label="Visa type" htmlFor="s-visaType">
                  <Select id="s-visaType" label="Visa type" value={form.visaType} onChange={(v) => set("visaType", v)} options={VISA_TYPE_OPTIONS} placeholder="Select visa type" clearable />
                </Field>
              </div>
            </StepSection>
          )}

          {step === 2 && (
            <EditableVisaJourney
              consulate={form.consulate}
              onConsulateChange={(v) => set("consulate", v)}
              values={form}
              onDateChange={(k, v) => set(k, v)}
              errors={journeyErrors}
            />
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="card flex items-center gap-3 p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-paper-sunk text-sm font-semibold text-ink-800">
                  {(form.name.trim()[0] || "?").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{form.name || "No name yet"}</p>
                  <p className="truncate text-xs text-mute">
                    {[form.university, form.intake, form.consulate && `${form.consulate} embassy`].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <ReviewCard title="About you" onEdit={() => go(0, false)}>
                  <Row label="Email" value={form.email} />
                  <Row label="Gender" value={form.gender ? GENDER_LABELS[form.gender] : ""} />
                  <Row label="City" value={form.city} />
                  <Row label="Province" value={form.province} />
                </ReviewCard>
                <ReviewCard title="Program" onEdit={() => go(1, false)}>
                  <Row label="University" value={form.university} />
                  <Row label="Program" value={form.program} />
                  <Row label="Intake" value={form.intake} />
                  <Row label="Visa type" value={form.visaType} />
                </ReviewCard>
              </div>

              <VisaJourneyReview
                consulate={form.consulate}
                values={form}
                onEdit={() => go(2, false)}
              />

              <Panel title="Optional notes">
                <div className="grid gap-3 sm:grid-cols-2">
                  {text("sourceOfInformation", "Where did you hear about this?", { placeholder: "e.g. WhatsApp group" })}
                  <Field label="Additional notes" htmlFor="s-notes">
                    <textarea id="s-notes" className="input min-h-[80px]" rows={3} value={form.additionalDocuments} onChange={(e) => set("additionalDocuments", e.target.value)} />
                  </Field>
                </div>
              </Panel>

              <Panel title="Privacy">
                <Toggle checked={anonymous} onChange={setAnonymous} label="Hide my name on the public tracker" />
                <p className="mt-2 text-xs text-mute">
                  {anonymous
                    ? "Your name stays hidden publicly. Only your Tracking ID, university and dates appear after review."
                    : "Your name will appear publicly after admin review. Email stays private."}
                </p>
              </Panel>
            </div>
          )}

          {error && <Notice tone="error">{error}</Notice>}
        </form>
      </FocusedWorkflowLayout>

      <ConfirmationModal
        isOpen={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onConfirm={() => {
          resetSubmission();
          exitWizard();
        }}
        title="Discard your submission?"
        message="You have unsaved information. Leaving now will discard your current submission."
        cancelText="Continue editing"
        confirmText="Discard submission"
        variant="danger"
        icon="alert"
      />
    </>
  );
}

function StepSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight text-ink-900">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-mute">{description}</p>}
      </div>
      <div className="[&_button[role=combobox]]:min-h-[46px]">{children}</div>
    </section>
  );
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-mute">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-[32px] items-center gap-1 rounded-md px-2 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-[#202020]"
        >
          <Icon name="edit" size={13} /> Edit
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
