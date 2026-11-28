"use client";

import { useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import OtpInput from "@/components/auth/OtpInput";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";
import { invalidateApi } from "@/hooks/useApi";
import { broadcastAuthEvent } from "@/hooks/useSessionSync";
import { sanitizeRedirectPath } from "@/lib/security/redirects";

type AdminStep = "credentials" | "mfa_challenge" | "mfa_enroll" | "recovery_codes";

export default function AdminLoginPage() {
  const [step, setStep] = useState<AdminStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [enrollmentToken, setEnrollmentToken] = useState("");
  const [enrollInfo, setEnrollInfo] = useState<{
    otpauthUri: string;
    secretFormatted: string;
    accountName: string;
  } | null>(null);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function completeAdminNavigation() {
    invalidateApi("/api/session");
    broadcastAuthEvent("LOGIN");
    const next = new URLSearchParams(window.location.search).get("next");
    const target = sanitizeRedirectPath(next, "/admin", "admin");
    window.location.assign(target);
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        mfaRequired?: boolean;
        challengeToken?: string;
        mfaEnrollmentRequired?: boolean;
        enrollmentToken?: string;
      }>("/api/admin/login", jsonInit("POST", { email: email.trim(), password }));

      if (res.mfaRequired && res.challengeToken) {
        setChallengeToken(res.challengeToken);
        setDigits(["", "", "", "", "", ""]);
        setUseRecoveryCode(false);
        setRecoveryInput("");
        setStep("mfa_challenge");
        setLoading(false);
        return;
      }

      if (res.mfaEnrollmentRequired && res.enrollmentToken) {
        setEnrollmentToken(res.enrollmentToken);
        const started = await apiFetch<{
          ok: boolean;
          otpauthUri: string;
          secretFormatted: string;
          accountName: string;
        }>("/api/admin/mfa/enroll/start", jsonInit("POST", { enrollmentToken: res.enrollmentToken }));
        setEnrollInfo(started);
        setDigits(["", "", "", "", "", ""]);
        setStep("mfa_enroll");
        setLoading(false);
        return;
      }

      completeAdminNavigation();
    } catch (err: any) {
      setError(err.status === 401 ? "Incorrect email or password." : err.message);
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = useRecoveryCode ? recoveryInput.trim() : digits.join("").trim();
    if (!useRecoveryCode && code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    if (useRecoveryCode && code.length < 8) {
      setError("Enter one of your backup recovery codes.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await apiFetch(
        "/api/admin/mfa/verify",
        jsonInit("POST", {
          challengeToken,
          code,
          isRecoveryCode: useRecoveryCode,
        })
      );
      completeAdminNavigation();
    } catch (err: any) {
      setError(err?.message || "Verification failed.");
      setLoading(false);
    }
  }

  async function handleEnrollConfirm(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("").trim();
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; recoveryCodes: string[] }>(
        "/api/admin/mfa/enroll/confirm",
        jsonInit("POST", { enrollmentToken, code })
      );
      setRecoveryCodes(res.recoveryCodes);
      setStep("recovery_codes");
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || "Could not verify authenticator setup.");
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={
        step === "credentials"
          ? "Admin sign in"
          : step === "mfa_challenge"
            ? "Two-factor verification"
            : step === "mfa_enroll"
              ? "Set up authenticator MFA"
              : "Save your recovery codes"
      }
      subtitle={
        step === "credentials"
          ? "Restricted access for Visa Tracker administrators."
          : step === "mfa_challenge"
            ? "Enter the 6-digit code from your authenticator app to finish signing in."
            : step === "mfa_enroll"
              ? "Multifactor authentication is required for all administrator accounts."
              : "Store these single-use backup codes safely. They will not be shown again."
      }
      points={[
        { icon: "inbox", text: "Review and approve new submissions" },
        { icon: "users", text: "Edit applicant records and statuses" },
        { icon: "bell", text: "Publish announcements to verified subscribers" },
      ]}
      footer={
        <Link href="/login" className="font-semibold text-ink-900 hover:underline">
          Applicant sign in instead
        </Link>
      }
    >
      {step === "credentials" && (
        <form onSubmit={handleCredentials} className="space-y-4" noValidate>
          <Field label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              inputMode="email"
              className="input !min-h-[44px]"
              autoComplete="username"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              className="!min-h-[44px]"
              required
            />
          </Field>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} disabled={!email.trim() || !password}>
            Continue
          </Button>
        </form>
      )}

      {step === "mfa_challenge" && (
        <form onSubmit={handleMfaVerify} className="space-y-4" noValidate>
          {!useRecoveryCode ? (
            <div>
              <label className="label mb-2 block">Authenticator 6-digit code</label>
              <OtpInput
                value={digits}
                onChange={(d) => {
                  setDigits(d);
                  if (error) setError("");
                }}
                disabled={loading}
                hasError={!!error}
              />
            </div>
          ) : (
            <Field label="Backup recovery code" htmlFor="admin-recovery-code" hint="Format: XXXX-XXXX-XXXX (single use)">
              <input
                id="admin-recovery-code"
                type="text"
                className="input !min-h-[44px] font-mono uppercase"
                placeholder="XXXX-XXXX-XXXX"
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                autoComplete="one-time-code"
                required
              />
            </Field>
          )}
          {error && <Notice tone="error">{error}</Notice>}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={useRecoveryCode ? !recoveryInput.trim() : digits.some((d) => !d)}
          >
            Verify and sign in
          </Button>
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setUseRecoveryCode((v) => !v);
                setError("");
              }}
              className="font-medium text-blue-600 hover:underline"
            >
              {useRecoveryCode ? "Use authenticator app code" : "Use a backup recovery code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setError("");
              }}
              className="font-medium text-ink-600 hover:text-ink-900 hover:underline"
            >
              Back
            </button>
          </div>
        </form>
      )}

      {step === "mfa_enroll" && enrollInfo && (
        <form onSubmit={handleEnrollConfirm} className="space-y-4" noValidate>
          <div className="rounded-xl border border-line bg-paper-sunk p-3.5 text-xs">
            <p className="font-semibold text-ink-900">1. Add to your authenticator app</p>
            <p className="mt-1 text-ink-600">
              Add this setup key in Google Authenticator, 1Password, or Bitwarden for{" "}
              <span className="font-medium text-ink-900">{enrollInfo.accountName}</span>:
            </p>
            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-line bg-paper-raised px-2.5 py-2">
              <code className="break-all font-mono text-[12px] font-semibold text-ink-900">
                {enrollInfo.secretFormatted}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(enrollInfo.secretFormatted.replace(/\s+/g, ""));
                  setCopiedSecret(true);
                  setTimeout(() => setCopiedSecret(false), 2000);
                }}
                className="shrink-0 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-ink-700 hover:bg-paper-sunk"
              >
                {copiedSecret ? "Copied" : "Copy"}
              </button>
            </div>
            <a
              href={enrollInfo.otpauthUri}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
            >
              <Icon name="external" size={12} /> Open in authenticator app on this device
            </a>
          </div>

          <div>
            <label className="label mb-2 block">2. Enter the 6-digit code to confirm</label>
            <OtpInput
              value={digits}
              onChange={(d) => {
                setDigits(d);
                if (error) setError("");
              }}
              disabled={loading}
              hasError={!!error}
            />
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={digits.some((d) => !d)}
          >
            Enable MFA and continue
          </Button>
        </form>
      )}

      {step === "recovery_codes" && (
        <div className="space-y-4">
          <Notice tone="info">
            Save these 10 single-use recovery codes in a password manager. Each code works once if you lose access to your authenticator app.
          </Notice>
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-line bg-paper-sunk p-3 font-mono text-xs text-ink-900">
            {recoveryCodes.map((c) => (
              <div key={c} className="rounded bg-paper-raised px-2 py-1 text-center font-semibold">
                {c}
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => {
              navigator.clipboard?.writeText(recoveryCodes.join("\n"));
              setCopiedCodes(true);
              setTimeout(() => setCopiedCodes(false), 2000);
            }}
          >
            {copiedCodes ? "Copied all recovery codes" : "Copy all recovery codes"}
          </Button>
          <Button type="button" variant="primary" size="lg" fullWidth onClick={completeAdminNavigation}>
            I saved my codes — open Admin Dashboard
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
