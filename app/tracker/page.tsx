"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { fmtDate } from "@/lib/format";
import { CONSULATES, VISA_STATUS_LABELS } from "@/lib/constants";

type Applicant = {
  id: string;
  publicId: string;
  name: string | null;
  university: string | null;
  consulate: string;
  waitingListDate: string | null;
  visaStatus: string;
};

export default function TrackerPage() {
  const router = useRouter();
  const [lookupId, setLookupId] = useState("");
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ consulate: "", visaStatus: "", q: "" });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.consulate) params.set("consulate", filters.consulate);
    if (filters.visaStatus) params.set("visaStatus", filters.visaStatus);
    if (filters.q) params.set("q", filters.q);
    setLoading(true);
    fetch(`/api/applicants?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setApplicants(data.applicants || []))
      .finally(() => setLoading(false));
  }, [filters]);

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (lookupId.trim()) router.push(`/tracker/${encodeURIComponent(lookupId.trim().toUpperCase())}`);
  }

  return (
    <div className="space-y-8">
      <section className="card p-6 max-w-xl mx-auto text-center">
        <h1 className="text-xl font-bold text-navy-950">Track Your Application</h1>
        <p className="text-sm text-gray-500 mt-1">Enter your Tracking ID, e.g. PK-ISB-10482</p>
        <form onSubmit={handleLookup} className="mt-4 flex gap-2">
          <input
            className="input"
            placeholder="PK-ISB-10482"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
          />
          <button className="btn-gold shrink-0">Search</button>
        </form>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-bold text-navy-950">Public Tracker</h2>
          <div className="flex flex-wrap gap-2">
            <input
              className="input w-40"
              placeholder="Search ID or university"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
            <select
              className="input w-36"
              value={filters.consulate}
              onChange={(e) => setFilters((f) => ({ ...f, consulate: e.target.value }))}
            >
              <option value="">All consulates</option>
              {CONSULATES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              className="input w-48"
              value={filters.visaStatus}
              onChange={(e) => setFilters((f) => ({ ...f, visaStatus: e.target.value }))}
            >
              <option value="">All statuses</option>
              {Object.entries(VISA_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Tracking ID</th>
                <th className="text-left px-4 py-3">University</th>
                <th className="text-left px-4 py-3">Consulate</th>
                <th className="text-left px-4 py-3">Waiting Since</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
              )}
              {!loading && applicants.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No entries yet.</td></tr>
              )}
              {applicants.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">
                    <Link href={`/tracker/${a.publicId}`} className="text-navy-700 hover:underline">
                      {a.publicId}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{a.university || "—"}</td>
                  <td className="px-4 py-3">{a.consulate}</td>
                  <td className="px-4 py-3">{fmtDate(a.waitingListDate)}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.visaStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
