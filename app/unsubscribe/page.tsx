"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { LogoMark } from "@/components/Logo";

function UnsubscribeInner() {
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("No unsubscribe token was provided.");
      return;
    }
    fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Could not update subscription.");
        }
        setState("done");
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Could not update subscription.");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper-raised p-6 text-center sm:p-8">
        <div className="mx-auto mb-4 flex w-fit items-center gap-2">
          <LogoMark size={32} />
          <span className="text-sm font-bold text-ink-900">Visa Tracker</span>
        </div>

        {state === "loading" ? (
          <p className="text-sm text-ink-600">Updating your notification preferences…</p>
        ) : state === "done" ? (
          <div className="space-y-3">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Icon name="checkCircle" size={22} />
            </div>
            <h1 className="text-lg font-bold text-ink-900">Unsubscribed from announcements</h1>
            <p className="text-[13px] text-ink-600">
              You will no longer receive community announcement emails. Essential security and verification emails remain active.
            </p>
            <div className="pt-2">
              <Link href="/dashboard/information" className="btn-primary !min-h-[40px]">
                Manage preferences
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-600">
              <Icon name="alert" size={22} />
            </div>
            <h1 className="text-lg font-bold text-ink-900">Could not unsubscribe</h1>
            <p className="text-[13px] text-ink-600">{message}</p>
            <div className="pt-2">
              <Link href="/" className="btn-secondary !min-h-[40px]">
                Back to overview
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-paper text-sm text-mute">Loading…</div>}>
      <UnsubscribeInner />
    </Suspense>
  );
}
