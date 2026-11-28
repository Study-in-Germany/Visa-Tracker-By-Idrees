"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import OtpInput from "@/components/auth/OtpInput";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";

type Step = "request" | "verify" | "reset" | "done";
type AccountOption = { id: string; publicId: string; consulate: string; university: string | null };

export default function ForgotAccessCodePage() {
  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [recoveryToken, setRecoveryToken] = useState("");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [newAccessCode, setNewAccessCode] = useState("");
  const [confirmAccessCode, setConfirmAccessCode] = useState("");
  const [resetPublicId, setResetPublicId] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleRequest(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!identifier.trim()) return;
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>(
        "/api/applicant/otp/request",
        jsonInit("POST", { identifier: identifier.trim(), purpose: "RECOVERY" })
      );
      setStep("verify");
      setDigits(["", "", "", "", "", ""]);
      setResendCooldown(60);
      setInfo(res.message);
    } catch (err: any) {
      if (err?.retryAfterSeconds) setResendCooldown(err.retryAfterSeconds);
      setError(err?.message || "Could not send recovery code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        recoveryToken: string;
        accounts: AccountOption[];
      }>("/api/applicant/otp/verify", jsonInit("POST", { identifier: identifier.trim(), code, purpose: "RECOVERY" }));

      setRecoveryToken(res.recoveryToken);
      setAccounts(res.accounts);
      setSelectedAccountId(res.accounts[0]?.id ?? "");
      setStep("reset");
    } catch (err: any) {
      setError(err?.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (newAccessCode.trim().length < 8) {
      setError("New access code must be at least 8 characters.");
      return;
    }
    if (newAccessCode.trim().toUpperCase() !== confirmAccessCode.trim().toUpperCase()) {
      setError("Access codes do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; publicId: string }>(
        "/api/applicant/recovery/reset",
        jsonInit("POST", {
          recoveryToken,
          applicantId: selectedAccountId,
          newAccessCode: newAccessCode.trim(),
        })
      );
      setResetPublicId(res.publicId);
      setStep("done");
    } catch (err: any) {
      setError(err?.message || "Could not reset access code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={
        step === "request"
          ? "Reset access code"
          : step === "verify"
            ? "Verify your email"
            : step === "reset"
              ? "Choose a new access code"
              : "Access code updated"
      }
      subtitle={
        step === "request"
          ? "Enter your registered email address or Tracking ID to receive a 6-digit reset code."
          : step === "verify"
            ? "Enter the 6-digit code sent to your registered email address."
            : step === "reset"
              ? "Set a new access code for your entry."
              : "Your access code has been reset and your existing timeline data is intact."
      }
      points={[
        { icon: "mail", text: "6-digit single-use verification code" },
        { icon: "lock", text: "Existing timeline and Tracking ID stay unchanged" },
        { icon: "shield", text: "Confirmation email sent once updated" },
      ]}
      footer={
        <Link href="/login" className="font-semibold text-ink-900 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {step === "request" && (
        <form onSubmit={handleRequest} className="space-y-4" noValidate>
          <Field label="Email address or Tracking ID" htmlFor="recovery-id">
            <input
              id="recovery-id"
              type="text"
              inputMode="email"
              className="input !min-h-[44px]"
              placeholder="you@example.com or PK-ISB-10482"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </Field>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} disabled={!identifier.trim()}>
            Send verification code
          </Button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={handleVerify} className="space-y-4" noValidate>
          {info && <Notice tone="info">{info}</Notice>}
          <div>
            <label className="label mb-2 block">6-digit verification code</label>
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
          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} disabled={digits.some((d) => !d)}>
            Verify code
          </Button>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={resendCooldown > 0 || loading}
              onClick={() => handleRequest()}
              className="min-h-[36px] font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-mute disabled:no-underline"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("request");
                setError("");
              }}
              className="min-h-[36px] font-medium text-ink-600 hover:text-ink-900 hover:underline"
            >
              Change email or ID
            </button>
          </div>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          {accounts.length > 1 && (
            <div className="space-y-2">
              <label className="label">Select entry to reset</label>
              {accounts.map((acc) => (
                <label
                  key={acc.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                    selectedAccountId === acc.id ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30" : "border-line"
                  }`}
                >
                  <input
                    type="radio"
                    name="recovery-account"
                    checked={selectedAccountId === acc.id}
                    onChange={() => setSelectedAccountId(acc.id)}
                  />
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-ink-900">{acc.publicId}</p>
                    <p className="truncate text-xs text-ink-600">
                      {acc.consulate}
                      {acc.university ? ` · ${acc.university}` : ""}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          <Field
            label="New access code"
            htmlFor="new-code"
            hint="At least 8 characters using letters, numbers, or hyphens."
          >
            <PasswordInput
              id="new-code"
              value={newAccessCode}
              onChange={setNewAccessCode}
              placeholder="e.g. 7K4T-92XQ"
              className="!min-h-[44px] font-mono uppercase"
              required
            />
          </Field>

          <Field label="Confirm new access code" htmlFor="confirm-code">
            <PasswordInput
              id="confirm-code"
              value={confirmAccessCode}
              onChange={setConfirmAccessCode}
              placeholder="Repeat access code"
              className="!min-h-[44px] font-mono uppercase"
              required
            />
          </Field>

          {error && <Notice tone="error">{error}</Notice>}

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Reset access code
          </Button>
        </form>
      )}

      {step === "done" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Icon name="checkCircle" size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">Access code updated for {resetPublicId}</p>
            <p className="mt-1 text-xs text-ink-600">You can now sign in with your new access code or via email OTP.</p>
          </div>
          <Link href="/login" className="btn-primary !min-h-[44px] w-full">
            Return to sign in
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
