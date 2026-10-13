"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import Field from "@/components/ui/Field";
import Icon from "@/components/ui/Icon";
import { Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";

// Local development only: the account created by `npm run seed`. Compiled out of production builds.
const DEMO = process.env.NODE_ENV !== "production" ? { email: "admin@visatracker.local", password: "ChangeMe123!" } : null;

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/admin/login", jsonInit("POST", { email: email.trim(), password }));
      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.status === 401 ? "Incorrect email or password." : err.message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Admin sign in"
      subtitle="Restricted access for Visa Tracker administrators."
      points={[
        { icon: "inbox", text: "Review and approve new submissions" },
        { icon: "users", text: "Edit applicant records and statuses" },
        { icon: "bell", text: "Publish announcements to the community" },
      ]}
      footer={<Link href="/login" className="font-semibold text-ink-900 hover:underline">Applicant sign in instead</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" inputMode="email" className="input !min-h-[40px]" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" required />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <button className="btn-primary !min-h-[40px] w-full" disabled={loading || !email.trim() || !password}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {DEMO && (
        <div className="mt-4 rounded-lg border border-dashed border-line-strong bg-paper p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
            <Icon name="cog" size={12} /> Development only
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0 text-xs text-ink-700">
              <p>Seeded admin</p>
              <p className="truncate font-mono text-mute">{DEMO.email}</p>
            </div>
            <button type="button" className="btn-secondary !min-h-[30px] shrink-0 !text-xs" onClick={() => { setEmail(DEMO.email); setPassword(DEMO.password); setError(""); }}>
              Fill in
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
