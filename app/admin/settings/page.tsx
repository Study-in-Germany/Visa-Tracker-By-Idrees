"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import Field from "@/components/ui/Field";
import { Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      await apiFetch("/api/admin/password", jsonInit("POST", { currentPassword, newPassword }));
      setMsg({ tone: "success", text: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setMsg({ tone: "error", text: err.message || "Could not update password." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Settings" />
      <Panel title="Change admin password" className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Current password" htmlFor="cp">
            <input id="cp" type="password" className="input" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </Field>
          <Field label="New password" htmlFor="np" hint="At least 8 characters.">
            <input id="np" type="password" className="input" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
          </Field>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <button className="btn-gold" disabled={saving}>{saving ? "Saving…" : "Update password"}</button>
        </form>
      </Panel>
    </>
  );
}
