"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import PasswordInput from "@/components/PasswordInput";
import Field from "@/components/ui/Field";
import { Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";

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
    </AuthLayout>
  );
}
