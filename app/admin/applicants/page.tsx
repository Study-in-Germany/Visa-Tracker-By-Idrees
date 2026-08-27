"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { fmtDate } from "@/lib/format";
import { CONSULATES } from "@/lib/constants";

function ApplicantsInner() {
  const searchParams = useSearchParams();
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    approval: searchParams.get("approval") || "",
    consulate: "",
    q: "",
  });

  function load() {
    const params = new URLSearchParams();
    if (filters.approval) params.set("approval", filters.approval);
    if (filters.consulate) params.set("consulate", filters.consulate);
    if (filters.q) params.set("q", filters.q);
    setLoading(true);
    fetch(`/api/applicants?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setApplicants(data.applicants || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  async function quickApprove(id: string, approval: string) {
    await fetch(`/api/applicants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approval }),
    });
    load();
  }

  async function quickDelete(id: string) {
    if (!confirm("Delete this applicant record permanently?")) return;
    await fetch(`/api/applicants/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input w-48" placeholder="Search ID or name" value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        <select className="input w-40" value={filters.approval}
          onChange={(e) => setFilters((f) => ({ ...f, approval: e.target.value }))}>
          <option value="">All statuses</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select className="input w-36" value={filters.consulate}
          onChange={(e) => setFilters((f) => ({ ...f, consulate: e.target.value }))}>
          <option value="">All consulates</option>
          {CONSULATES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Tracking ID</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">University</th>
              <th className="text-left px-4 py-3">Consulate</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Review</th>
              <th className="text-left px-4 py-3">Submitted</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>}
            {!loading && applicants.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No applicants match these filters.</td></tr>
            )}
            {applicants.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono">
                  <Link href={`/admin/applicants/${a.id}`} className="text-navy-700 hover:underline">{a.publicId}</Link>
                </td>
                <td className="px-4 py-3">{a.name}{a.isAnonymous && <span className="text-xs text-gray-400"> (anon.)</span>}</td>
                <td className="px-4 py-3">{a.university || "—"}</td>
                <td className="px-4 py-3">{a.consulate}</td>
                <td className="px-4 py-3"><StatusBadge status={a.visaStatus} /></td>
                <td className="px-4 py-3">
                  <span className={`badge ${
                    a.approval === "APPROVED" ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : a.approval === "REJECTED" ? "bg-red-100 text-red-800 border-red-200"
                    : "bg-amber-100 text-amber-800 border-amber-200"
                  }`}>{a.approval.replace("_", " ")}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{fmtDate(a.createdAt)}</td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  {a.approval !== "APPROVED" && (
                    <button onClick={() => quickApprove(a.id, "APPROVED")} className="text-emerald-600 hover:underline text-xs font-medium">Approve</button>
                  )}
                  {a.approval !== "REJECTED" && (
                    <button onClick={() => quickApprove(a.id, "REJECTED")} className="text-red-600 hover:underline text-xs font-medium">Reject</button>
                  )}
                  <Link href={`/admin/applicants/${a.id}`} className="text-navy-700 hover:underline text-xs font-medium">Edit</Link>
                  <button onClick={() => quickDelete(a.id)} className="text-gray-400 hover:underline text-xs font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminApplicantsPage() {
  return (
    <Suspense fallback={<p className="text-center text-gray-400 py-12">Loading…</p>}>
      <ApplicantsInner />
    </Suspense>
  );
}
