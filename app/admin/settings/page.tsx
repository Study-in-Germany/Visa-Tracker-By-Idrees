"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Field from "@/components/ui/Field";
import Icon, { IconName } from "@/components/ui/Icon";
import { Notice } from "@/components/ui/States";
import PasswordInput from "@/components/PasswordInput";
import { Section } from "@/components/admin/parts";
import { invalidateApi } from "@/hooks/useApi";
import { useSession } from "@/hooks/useSession";
import { useTheme } from "@/hooks/useTheme";
import { apiFetch, jsonInit } from "@/lib/api";
import { PASSWORD_RULES } from "@/lib/password";

function Strength({ password, email }: { password: string; email?: string }) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password, email)).length;
  const pct = password ? (passed / PASSWORD_RULES.length) * 100 : 0;
  const tone = passed === PASSWORD_RULES.length ? "bg-green-500" : passed >= 4 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-2.5" aria-live="polite">
      <div className="h-1.5 overflow-hidden rounded-full bg-paper-sunk"><div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${pct}%` }} /></div>
      <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(password, email);
          return (
            <li key={r.id} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-700" : "text-mute"}`}>
              <Icon name={ok ? "checkCircle" : "clock"} size={13} /> {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PasswordCard({ email }: { email?: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const valid = PASSWORD_RULES.every((r) => r.test(next, email));
  const matches = next === confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!valid) return setMsg({ tone: "error", text: "The new password doesn't meet every requirement yet." });
    if (!matches) return setMsg({ tone: "error", text: "The two new passwords don't match." });
    setSaving(true);
    try {
      await apiFetch("/api/admin/password", jsonInit("POST", { currentPassword: current, newPassword: next }));
      setMsg({ tone: "success", text: "Password updated. Use it the next time you sign in." });
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err: any) {
      setMsg({ tone: "error", text: err?.message || "Could not update the password." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Password" hint="Use a long, unique password. Don't reuse it anywhere else.">
      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2" noValidate>
        <div className="space-y-3.5">
          <Field label="Current password" htmlFor="cp"><PasswordInput id="cp" value={current} onChange={setCurrent} autoComplete="current-password" required /></Field>
          <Field label="New password" htmlFor="np"><PasswordInput id="np" value={next} onChange={setNext} autoComplete="new-password" required /></Field>
          <Field label="Confirm new password" htmlFor="cf" error={confirm && !matches ? "Doesn't match yet." : undefined}><PasswordInput id="cf" value={confirm} onChange={setConfirm} autoComplete="new-password" required /></Field>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-xl bg-paper p-4">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-mute">Requirements</p>
            <Strength password={next} email={email} />
          </div>
          <div className="space-y-3">
            {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
            <button className="btn-primary w-full" disabled={saving || !current || !next || !confirm}>{saving ? "Saving…" : "Update password"}</button>
          </div>
        </div>
      </form>
    </Section>
  );
}

function Link2({ href, icon, title, desc }: { href: string; icon: IconName; title: string; desc: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-paper">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-paper-sunk text-ink-700 group-hover:bg-clay-100 group-hover:text-clay-600"><Icon name={icon} size={16} /></span>
      <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold">{title}</span><span className="block truncate text-xs text-mute">{desc}</span></span>
      <Icon name="chevronRight" size={15} className="text-mute" />
    </Link>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { email } = useSession();
  const { theme, setTheme } = useTheme();
  const [out, setOut] = useState(false);

  async function signOut() {
    setOut(true);
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    invalidateApi();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      <PageHeader title="Settings" description="Your admin account, security and how the dashboard looks." />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Section title="Account">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-ink-800 text-xl font-semibold text-paper-raised">{(email?.[0] || "A").toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{email || "Administrator"}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-mute"><Icon name="shield" size={12} /> Administrator · full access</p>
              </div>
              <button type="button" className="btn-secondary" onClick={signOut} disabled={out}><Icon name="logout" size={14} /> {out ? "Signing out…" : "Sign out"}</button>
            </div>
          </Section>

          <PasswordCard email={email} />
        </div>

        <div className="space-y-5">
          <Section title="Appearance" hint="Saved on this device.">
            <div role="radiogroup" aria-label="Theme" className="grid grid-cols-2 gap-2">
              {([["light", "Light", "sun"], ["dark", "Dark", "moon"]] as const).map(([v, label, icon]) => (
                <button key={v} type="button" role="radio" aria-checked={theme === v} onClick={() => setTheme(v)} className={`flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border text-[13px] font-semibold transition-colors ${theme === v ? "border-ink-800 bg-paper-sunk" : "border-line-strong bg-paper-raised hover:bg-paper-sunk"}`}>
                  <Icon name={icon} size={18} /> {label}
                </button>
              ))}
            </div>
          </Section>

          <Section flush title="Shortcuts">
            <div className="divide-y divide-line">
              <Link2 href="/admin/imports" icon="layers" title="Update data" desc="Refresh universities and programmes" />
              <Link2 href="/admin/import" icon="upload" title="Import applicants" desc="Bulk upload from a spreadsheet" />
              <Link2 href="/admin/announcements" icon="bell" title="Announcements" desc="Publish updates to the community" />
            </div>
          </Section>

          <Section title="Security notes">
            <ul className="space-y-2 text-xs leading-relaxed text-mute">
              <li className="flex gap-2"><Icon name="check" size={13} className="mt-0.5 shrink-0 text-green-600" /> Sessions last 30 days on a device, then ask you to sign in again.</li>
              <li className="flex gap-2"><Icon name="check" size={13} className="mt-0.5 shrink-0 text-green-600" /> Applicants can never open admin pages, even when signed in.</li>
              <li className="flex gap-2"><Icon name="alert" size={13} className="mt-0.5 shrink-0 text-amber-600" /> Sign out on shared computers.</li>
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
