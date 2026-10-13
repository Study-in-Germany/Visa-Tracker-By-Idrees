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

// Local development only: created by `npm run seed:demo`. Compiled out of production builds.
const DEMO = process.env.NODE_ENV !== "production" ? { publicId: "DEMO-0001", accessCode: "DEMO-1234" } : null;

export default function LoginPage() {
  const router = useRouter();
  const [publicId, setPublicId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/applicant/login", jsonInit("POST", { publicId: publicId.trim(), accessCode: accessCode.trim() }));
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.status === 401 ? "That Tracking ID and access code do not match. Check both and try again." : err.message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in with the Tracking ID and access code you received when you submitted your entry."
      points={[
        { icon: "queue", text: "See your queue position and next-step estimate" },
        { icon: "edit", text: "Update your dates as your case moves" },
        { icon: "shield", text: "Control whether your name is public" },
      ]}
      footer={
        <>
          No entry yet?{" "}
          <Link href="/submit" className="font-semibold text-ink-900 hover:underline">Submit your journey</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <Field label="Tracking ID" htmlFor="publicId">
          <input id="publicId" className="input !min-h-[40px] font-mono uppercase" placeholder="PK-ISB-10482" autoComplete="username" autoCapitalize="characters" spellCheck={false} value={publicId} onChange={(e) => setPublicId(e.target.value)} required />
        </Field>
        <Field label="Access code" htmlFor="accessCode" hint="Format 7K4T-92XQ. It was shown once after you submitted.">
          <PasswordInput id="accessCode" value={accessCode} onChange={setAccessCode} autoComplete="current-password" placeholder="XXXX-XXXX" required />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <button className="btn-gold !min-h-[40px] w-full" disabled={loading || !publicId.trim() || !accessCode.trim()}>
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
              <p>Demo account</p>
              <p className="truncate font-mono text-mute">{DEMO.publicId} · {DEMO.accessCode}</p>
            </div>
            <button type="button" className="btn-secondary !min-h-[30px] shrink-0 !text-xs" onClick={() => { setPublicId(DEMO.publicId); setAccessCode(DEMO.accessCode); setError(""); }}>
              Fill in
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 border-t border-line pt-3 text-center text-xs text-mute">
        Administrator? <Link href="/admin/login" className="font-medium text-ink-800 hover:underline">Admin sign in</Link>
      </p>
    </AuthLayout>
  );
}
