"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";
import { apiFetch, jsonInit } from "@/lib/api";

type SessionRow = {
  id: string;
  deviceLabel: string;
  authMethod: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.max(0, Math.floor(diffMs / 60_000));
  if (min < 1) return "Active just now";
  if (min < 60) return `Active ${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `Active ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `Active ${days}d ago`;
}

export default function ActiveSessionsPanel({ endpoint }: { endpoint: "/api/applicant/sessions" | "/api/admin/sessions" }) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ sessions: SessionRow[] }>(endpoint);
      setSessions(res.sessions ?? []);
    } catch (err: any) {
      setMsg({ tone: "error", text: err?.message || "Could not load active sessions." });
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  async function revokeSingle(sessionId: string) {
    setBusyId(sessionId);
    setMsg(null);
    try {
      await apiFetch(endpoint, jsonInit("DELETE", { mode: "single", sessionId }));
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setMsg({ tone: "success", text: "Session signed out." });
    } catch (err: any) {
      setMsg({ tone: "error", text: err?.message || "Could not sign out that session." });
    } finally {
      setBusyId(null);
    }
  }

  async function revokeOthers() {
    setBusyId("others");
    setMsg(null);
    try {
      const res = await apiFetch<{ ok: boolean; revokedCount: number }>(
        endpoint,
        jsonInit("DELETE", { mode: "others" })
      );
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setMsg({
        tone: "success",
        text:
          res.revokedCount > 0
            ? `Signed out ${res.revokedCount} other session${res.revokedCount === 1 ? "" : "s"}.`
            : "No other active sessions found.",
      });
    } catch (err: any) {
      setMsg({ tone: "error", text: err?.message || "Could not sign out other sessions." });
    } finally {
      setBusyId(null);
    }
  }

  const otherCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="space-y-3">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {loading ? (
        <p className="text-xs text-mute">Loading active sessions…</p>
      ) : sessions.length === 0 ? (
        <p className="text-xs text-mute">No active sessions found.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 text-xs">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink-900">{s.deviceLabel}</span>
                  {s.isCurrent && (
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      Current session
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-mute">
                  {formatRelativeTime(s.lastActivityAt)} · Signed in via {s.authMethod.replace(/_/g, " ")}
                </p>
              </div>
              {!s.isCurrent && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={busyId === s.id}
                  disabled={busyId !== null}
                  onClick={() => revokeSingle(s.id)}
                >
                  Sign out
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {otherCount > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={busyId === "others"}
            disabled={busyId !== null}
            onClick={revokeOthers}
          >
            Sign out all other devices ({otherCount})
          </Button>
        </div>
      )}
    </div>
  );
}
