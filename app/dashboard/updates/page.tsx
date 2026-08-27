"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { fmtDate } from "@/lib/format";

export default function MyUpdatesPage() {
  const router = useRouter();
  const [history, setHistory] = useState<any[] | null>(null);

  useEffect(() => {
    fetch("/api/applicant/me").then((r) => {
      if (r.status === 401) { router.push("/login"); return null; }
      return r.json();
    }).then((data) => {
      if (data) setHistory(data.applicant.history || []);
    });
  }, [router]);

  if (!history) return <p className="text-center text-gray-400 py-12">Loading…</p>;

  return (
    <div className="card p-6">
      <h3 className="font-bold text-navy-950 mb-4">Status Update History</h3>
      {history.length === 0 ? (
        <p className="text-sm text-gray-400">No updates yet.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {[...history].reverse().map((h) => (
            <li key={h.id} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <StatusBadge status={h.visaStatus} />
                {h.note && <p className="text-gray-500 mt-1">{h.note}</p>}
              </div>
              <span className="text-gray-400 shrink-0">{fmtDate(h.occurredAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
