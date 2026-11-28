"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import OtpInput from "@/components/auth/OtpInput";
import Field from "@/components/ui/Field";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";
import { invalidateApi } from "@/hooks/useApi";
import { useSession } from "@/hooks/useSession";
import { broadcastAuthEvent } from "@/hooks/useSessionSync";
import { sanitizeRedirectPath } from "@/lib/security/redirects";

// Local development only: created by `npm run seed:demo`. Compiled out of production builds.
const DEMO = process.env.NODE_ENV !== "production" ? { publicId: "DEMO-0001", accessCode: "DEMO-1234" } : null;

type AuthMethod = "otp" | "code";
type OtpStep = "identifier" | "verify" | "select";
type AccountOption = { id: string; publicId: string; consulate: string; university: string | null };

export default function LoginPage() {
  const session = useSession();
  const [method, setMethod] = useState<AuthMethod>("otp");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // Email OTP state
  const [otpStep, setOtpStep] = useState<OtpStep>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [selectionToken, setSelectionToken] = useState("");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [otpInfo, setOtpInfo] = useState("");

  // Access code state (backward compatible)
  const [publicId, setPublicId] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function finishSignIn() {
    invalidateApi("/api/session");
    session.refresh();
    broadcastAuthEvent("LOGIN");
    const next = new URLSearchParams(window.location.search).get("next");
    const target = sanitizeRedirectPath(next, "/dashboard", "applicant");
    window.location.assign(target);
  }

  async function confirmSignOut() {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      const result = await session.logout({ asAdmin: false, redirectTo: "/login" });
      if (!result.ok) {
        setLogoutError(result.error || "Could not complete sign-out. Please retry.");
        return;
      }
      setShowLogoutConfirm(false);
    } finally {
      setLoggingOut(false);
    }
  }

  async function requestOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!identifier.trim()) return;
    setError("");
    setOtpInfo("");
    setLoading(true);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>(
        "/api/applicant/otp/request",
        jsonInit("POST", { identifier: identifier.trim(), purpose: "LOGIN" })
      );
      setOtpStep("verify");
      setDigits(["", "", "", "", "", ""]);
      setResendCooldown(60);
      setOtpInfo(res.message);
    } catch (err: any) {
      if (err?.retryAfterSeconds) setResendCooldown(err.retryAfterSeconds);
      setError(err?.message || "Could not send verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtpCode(codeOverride?: string) {
    const code = (codeOverride ?? digits.join("")).trim();
    if (code.length !== 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{
        ok: boolean;
        needsAccountSelection?: boolean;
        selectionToken?: string;
        accounts?: AccountOption[];
      }>("/api/applicant/otp/verify", jsonInit("POST", { identifier: identifier.trim(), code, purpose: "LOGIN" }));

      if (res.needsAccountSelection && res.selectionToken && res.accounts?.length) {
        setSelectionToken(res.selectionToken);
        setAccounts(res.accounts);
        setSelectedAccountId(res.accounts[0].id);
        setOtpStep("select");
        setLoading(false);
        return;
      }

      finishSignIn();
    } catch (err: any) {
      setError(err?.message || "Invalid or expired verification code.");
      setLoading(false);
    }
  }

  async function selectAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || !selectionToken) return;
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/applicant/otp/select", jsonInit("POST", { selectionToken, applicantId: selectedAccountId }));
      finishSignIn();
    } catch (err: any) {
      setError(err?.message || "Could not complete sign in.");
      setLoading(false);
    }
  }

  async function handleAccessCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch(
        "/api/applicant/login",
        jsonInit("POST", { publicId: publicId.trim(), accessCode: accessCode.trim() })
      );
      finishSignIn();
    } catch (err: any) {
      setError(
        err.status === 401
          ? "That Tracking ID and access code do not match. Check both and try again."
          : err.message
      );
      setLoading(false);
    }
  }

  function switchMethod(next: AuthMethod) {
    setMethod(next);
    setError("");
    setOtpInfo("");
  }

  if (session.role === "applicant") {
    return (
      <AuthLayout
        title="Already signed in"
        subtitle={`You are currently signed in${session.publicId ? ` as ${session.publicId}` : ""}.`}
        points={[
          { icon: "queue", text: "See your queue position and stage estimates" },
          { icon: "edit", text: "Update your dates as your application moves" },
          { icon: "shield", text: "Manage email notifications and privacy" },
        ]}
      >
        <div className="space-y-3">
          <Link href="/dashboard" className="btn-primary w-full justify-center">
            Open my dashboard
          </Link>
          <Button type="button" variant="secondary" fullWidth onClick={() => setShowLogoutConfirm(true)}>
            Log out
          </Button>
        </div>
        <ConfirmationModal
          isOpen={showLogoutConfirm}
          onClose={() => {
            if (loggingOut) return;
            setShowLogoutConfirm(false);
            setLogoutError(null);
          }}
          onConfirm={confirmSignOut}
          title="Log out?"
          message="Are you sure you want to log out of your account?"
          confirmText={logoutError ? "Retry log out" : "Log out"}
          cancelText="Cancel"
          variant="danger"
          icon="logout"
          isLoading={loggingOut}
          error={logoutError}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Applicant sign in"
      subtitle="Sign in with a 6-digit email verification code or your Tracking ID and access code."
      points={[
        { icon: "queue", text: "See your queue position and stage estimates" },
        { icon: "edit", text: "Update your dates as your application moves" },
        { icon: "shield", text: "Manage email notifications and privacy" },
      ]}
      footer={
        <>
          No entry yet?{" "}
          <Link href="/submit" className="font-semibold text-ink-900 hover:underline">
            Submit your journey
          </Link>
        </>
      }
    >
      {/* Auth method selector */}
      <div className="mb-5 grid grid-cols-2 rounded-xl border border-line bg-paper-sunk p-1" role="tablist" aria-label="Sign in method">
        <button
          type="button"
          role="tab"
          aria-selected={method === "otp"}
          onClick={() => switchMethod("otp")}
          className={`min-h-[38px] rounded-lg px-3 text-xs font-semibold transition-colors ${
            method === "otp"
              ? "bg-paper-raised text-ink-900 shadow-xs"
              : "text-ink-600 hover:text-ink-900"
          }`}
        >
          Email code (OTP)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={method === "code"}
          onClick={() => switchMethod("code")}
          className={`min-h-[38px] rounded-lg px-3 text-xs font-semibold transition-colors ${
            method === "code"
              ? "bg-paper-raised text-ink-900 shadow-xs"
              : "text-ink-600 hover:text-ink-900"
          }`}
        >
          Access code
        </button>
      </div>

      <div className={`flex flex-col justify-between ${DEMO ? "min-h-[310px]" : "min-h-[240px]"}`}>

      {method === "otp" ? (
        <>
          {otpStep === "identifier" && (
            <form onSubmit={requestOtp} className="space-y-4" noValidate>
              <Field
                label="Email address or Tracking ID"
                htmlFor="otp-identifier"
                hint="We will send a 6-digit sign-in code to the registered email address."
              >
                <input
                  id="otp-identifier"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  className="input !min-h-[44px]"
                  placeholder="you@example.com or PK-ISB-10482"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </Field>
              {error && <Notice tone="error">{error}</Notice>}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={!identifier.trim()}
              >
                Send verification code
              </Button>
            </form>
          )}

          {otpStep === "verify" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyOtpCode();
              }}
              className="space-y-4"
              noValidate
            >
              {otpInfo && <Notice tone="info">{otpInfo}</Notice>}
              <div>
                <label className="label mb-2 block">Enter 6-digit verification code</label>
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
                Verify and sign in
              </Button>
              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={() => requestOtp()}
                  className="min-h-[36px] font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-mute disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep("identifier");
                    setError("");
                    setOtpInfo("");
                  }}
                  className="min-h-[36px] font-medium text-ink-600 hover:text-ink-900 hover:underline"
                >
                  Change email or ID
                </button>
              </div>
            </form>
          )}

          {otpStep === "select" && (
            <form onSubmit={selectAccount} className="space-y-4">
              <p className="text-[13px] text-ink-700">
                Multiple entries are registered with this email. Choose which entry to open:
              </p>
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <label
                    key={acc.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                      selectedAccountId === acc.id
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30"
                        : "border-line hover:bg-paper-sunk"
                    }`}
                  >
                    <input
                      type="radio"
                      name="account"
                      value={acc.id}
                      checked={selectedAccountId === acc.id}
                      onChange={() => setSelectedAccountId(acc.id)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-bold text-ink-900">{acc.publicId}</p>
                      <p className="truncate text-xs text-ink-600">
                        {acc.consulate}
                        {acc.university ? ` · ${acc.university}` : ""}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {error && <Notice tone="error">{error}</Notice>}
              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                Continue
              </Button>
            </form>
          )}
        </>
      ) : (
        <form onSubmit={handleAccessCodeSubmit} className="space-y-4" noValidate>
          <Field label="Tracking ID" htmlFor="publicId">
            <input
              id="publicId"
              className="input !min-h-[44px] font-mono uppercase"
              placeholder="PK-ISB-10482"
              autoComplete="username"
              autoCapitalize="characters"
              spellCheck={false}
              value={publicId}
              onChange={(e) => setPublicId(e.target.value)}
              required
            />
          </Field>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="accessCode" className="text-xs font-semibold text-ink-700">
                Access code
              </label>
              <Link href="/forgot-access-code" className="text-xs font-medium text-blue-600 hover:underline">
                Forgot access code?
              </Link>
            </div>
            <PasswordInput
              id="accessCode"
              value={accessCode}
              onChange={setAccessCode}
              autoComplete="current-password"
              placeholder="XXXX-XXXX"
              className="!min-h-[44px]"
              required
            />
          </div>

          {error && <Notice tone="error">{error}</Notice>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!publicId.trim() || !accessCode.trim()}
          >
            Sign in
          </Button>
        </form>
      )}

      {method === "code" && DEMO && (
        <div className="mt-5 rounded-xl border border-dashed border-line-strong bg-paper-sunk p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
            <Icon name="cog" size={12} /> Development only
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0 text-xs text-ink-700">
              <p className="font-medium">Demo account</p>
              <p className="truncate font-mono text-mute">
                {DEMO.publicId} · {DEMO.accessCode}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setPublicId(DEMO.publicId);
                setAccessCode(DEMO.accessCode);
                setError("");
              }}
            >
              Fill in
            </Button>
          </div>
        </div>
      )}
      </div>

      <p className="mt-5 border-t border-line pt-4 text-center text-xs text-mute">
        Administrator?{" "}
        <Link href="/admin/login" className="font-semibold text-ink-900 hover:underline">
          Admin sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
