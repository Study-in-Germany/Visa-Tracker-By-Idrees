"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Checkbox from "@/components/ui/Checkbox";
import Toggle from "@/components/ui/Toggle";
import Button from "@/components/ui/Button";
import OtpInput from "@/components/auth/OtpInput";
import ActiveSessionsPanel from "@/components/auth/ActiveSessionsPanel";
import { FormSkeleton } from "@/components/ui/Skeletons";
import { ErrorState, Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";
import { invalidateApi } from "@/hooks/useApi";
import { useSession } from "@/hooks/useSession";
import { toInputDate } from "@/lib/format";
import { JOURNEY_STAGES } from "@/lib/constants";
import { GENDER_OPTIONS, PROVINCE_OPTIONS, VISA_TYPE_OPTIONS } from "@/lib/options";
import IntakeSelect from "@/components/IntakeSelect";

const TEXT_FIELDS: [string, string][] = [
  ["name", "Name"],
  ["city", "City"],
  ["university", "University"],
  ["program", "Program"],
  ["waitingListCategory", "Waiting-list category"],
  ["sourceOfInformation", "Source of information"],
];
const LIST_KEYS = ["province", "intake", "visaType"];

export default function MyInformationPage() {
  const router = useRouter();
  const session = useSession();
  const [form, setForm] = useState<any>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [notifyAnnouncements, setNotifyAnnouncements] = useState(true);
  const [notifyStatusUpdates, setNotifyStatusUpdates] = useState(true);

  // Email verification state
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailOtpSentTo, setEmailOtpSentTo] = useState<string | null>(null);
  const [emailDigits, setEmailDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [emailMsg, setEmailMsg] = useState("");
  const [emailErr, setEmailErr] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loadError, setLoadError] = useState("");

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setTimeout(() => setEmailCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [emailCooldown]);

  useEffect(() => {
    apiFetch("/api/applicant/me")
      .then((data) => {
        const a = data.applicant;
        const f: any = {
          gender: a.gender || "",
          additionalDocuments: a.additionalDocuments || "",
          consulate: a.consulate,
        };
        for (const [k] of TEXT_FIELDS) f[k] = a[k] || "";
        for (const k of LIST_KEYS) f[k] = a[k] || "";
        for (const s of JOURNEY_STAGES) f[s.key] = toInputDate(a[s.key]);
        setForm(f);
        setIsAnonymous(a.isAnonymous);
        setNotifyAnnouncements(a.notifyAnnouncements ?? true);
        setNotifyStatusUpdates(a.notifyStatusUpdates ?? true);
        setCurrentEmail(a.email || null);
        setEmailVerifiedAt(a.emailVerifiedAt || null);
        setEmailInput(a.email || "");
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
      await apiFetch(
        "/api/applicant/me",
        jsonInit("PATCH", {
          ...form,
          gender: form.gender || null,
          isAnonymous,
          notifyAnnouncements,
          notifyStatusUpdates,
        })
      );
      invalidateApi("/api/applicant/me");
      invalidateApi("/api/applicant/me/forecast");
      invalidateApi("/api/session");
      session.refresh();
      setSaved(true);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function requestEmailVerification(targetEmail?: string) {
    const target = (targetEmail ?? emailInput).trim();
    if (!target) {
      setEmailErr("Enter an email address.");
      return;
    }
    setEmailBusy(true);
    setEmailErr("");
    setEmailMsg("");
    try {
      await apiFetch("/api/applicant/me/email/request", jsonInit("POST", { email: target }));
      setEmailOtpSentTo(target);
      setEmailDigits(["", "", "", "", "", ""]);
      setEmailCooldown(60);
      setEmailMsg(`Verification code sent to ${target}.`);
    } catch (err: any) {
      if (err?.retryAfterSeconds) setEmailCooldown(err.retryAfterSeconds);
      setEmailErr(err?.message || "Could not send verification code.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function confirmEmailVerification() {
    if (!emailOtpSentTo) return;
    const code = emailDigits.join("");
    if (code.length !== 6) {
      setEmailErr("Enter the 6-digit verification code.");
      return;
    }
    setEmailBusy(true);
    setEmailErr("");
    setEmailMsg("");
    try {
      const res = await apiFetch<{ email: string; emailVerifiedAt: string }>(
        "/api/applicant/me/email/verify",
        jsonInit("POST", { email: emailOtpSentTo, code })
      );
      setCurrentEmail(res.email);
      setEmailVerifiedAt(res.emailVerifiedAt);
      setEmailInput(res.email);
      setEmailOtpSentTo(null);
      setEmailDigits(["", "", "", "", "", ""]);
      setEmailMsg("Email verified.");
    } catch (err: any) {
      setEmailErr(err?.message || "Invalid verification code.");
    } finally {
      setEmailBusy(false);
    }
  }

  if (loadError) return <div className="card"><ErrorState error={loadError} /></div>;
  if (!form) return <FormSkeleton fields={8} />;

  const needsVerifyCurrent = !!currentEmail && !emailVerifiedAt;

  return (
    <>
      <PageHeader title="My information" />

      <div className="space-y-4">
        <form onSubmit={handleSave} className="space-y-4">
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

          <Panel title="Journey dates" description="Leave a date empty if it hasn't happened yet.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {JOURNEY_STAGES.map((s) => (
                <Field key={s.key} label={s.label} htmlFor={`i-${s.key}`}>
                  <DatePicker id={`i-${s.key}`} label={s.label} value={form[s.key]} onChange={(v) => set(s.key, v)} />
                </Field>
              ))}
            </div>
          </Panel>

          <Panel title="Privacy & email notifications">
            <div className="space-y-4">
              <Checkbox
                checked={isAnonymous}
                onChange={setIsAnonymous}
                label="Keep my name hidden on the public tracker"
                description="Your Tracking ID and journey stay visible."
              />

              <div className="space-y-3 border-t border-line pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-ink-900">Community announcements</p>
                    <p className="text-xs text-mute">Receive emails when admins publish announcements (requires a verified email).</p>
                  </div>
                  <Toggle
                    id="pref-announcements"
                    checked={notifyAnnouncements}
                    onChange={setNotifyAnnouncements}
                    label="Receive announcements"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-ink-900">Application status updates</p>
                    <p className="text-xs text-mute">Receive an email when your entry status is updated.</p>
                  </div>
                  <Toggle
                    id="pref-status"
                    checked={notifyStatusUpdates}
                    onChange={setNotifyStatusUpdates}
                    label="Receive status updates"
                  />
                </div>

                <p className="text-xs text-mute">
                  Essential login verification codes and account security notifications are always delivered to your verified email.
                </p>
              </div>
            </div>
          </Panel>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" loading={saving}>
              Save changes
            </Button>
            {saved && <Notice tone="success">Changes saved.</Notice>}
            {saveError && <Notice tone="error">{saveError}</Notice>}
          </div>
        </form>

        {/* Email verification panel (separate from profile save so unverified emails are never stored) */}
        <Panel
          title="Email address & verification"
          actions={
            emailVerifiedAt ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                Verified
              </span>
            ) : currentEmail ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                Unverified
              </span>
            ) : (
              <span className="rounded-full border border-line bg-paper-sunk px-2.5 py-0.5 text-[11px] font-semibold text-mute">
                Not added
              </span>
            )
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-ink-600">
              {currentEmail
                ? `Current email on file: ${currentEmail}${emailVerifiedAt ? " (verified for OTP sign-in, recovery, and announcements)" : " — verify this address with a 6-digit code to enable OTP sign-in and announcement emails."}`
                : "Add and verify an email address to enable 6-digit OTP sign-in, access code recovery, and community announcement alerts."}
            </p>

            {needsVerifyCurrent && !emailOtpSentTo && (
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={emailBusy}
                  onClick={() => requestEmailVerification(currentEmail!)}
                >
                  Verify {currentEmail}
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Field label={currentEmail ? "Update email address" : "Add email address"} htmlFor="verify-email-input">
                  <input
                    id="verify-email-input"
                    type="email"
                    inputMode="email"
                    className="input"
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="secondary"
                loading={emailBusy && !emailOtpSentTo}
                disabled={!emailInput.trim() || emailCooldown > 0}
                onClick={() => requestEmailVerification()}
              >
                {emailCooldown > 0 ? `Wait ${emailCooldown}s` : "Send verification code"}
              </Button>
            </div>

            {emailOtpSentTo && (
              <div className="space-y-3 rounded-xl border border-line bg-paper-sunk p-4">
                <p className="text-xs font-medium text-ink-800">
                  Enter the 6-digit code sent to <span className="font-semibold">{emailOtpSentTo}</span>
                </p>
                <div className="max-w-sm">
                  <OtpInput
                    value={emailDigits}
                    onChange={setEmailDigits}
                    disabled={emailBusy}
                    hasError={!!emailErr}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={emailBusy}
                    disabled={emailDigits.some((d) => !d)}
                    onClick={confirmEmailVerification}
                  >
                    Confirm verification
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={emailBusy || emailCooldown > 0}
                    onClick={() => requestEmailVerification(emailOtpSentTo)}
                  >
                    {emailCooldown > 0 ? `Resend in ${emailCooldown}s` : "Resend code"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={emailBusy}
                    onClick={() => setEmailOtpSentTo(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {emailMsg && <Notice tone="success">{emailMsg}</Notice>}
            {emailErr && <Notice tone="error">{emailErr}</Notice>}
          </div>
        </Panel>

        <Panel
          title="Active sessions"
          description="Devices currently signed in to your entry. Sign out any unrecognized session."
        >
          <ActiveSessionsPanel endpoint="/api/applicant/sessions" />
        </Panel>
      </div>
    </>
  );
}
