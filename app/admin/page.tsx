"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then(setData);
    fetch("/api/applicants?approval=PENDING_REVIEW")
      .then((r) => r.json())
      .then((d) => setPendingCount(d.count ?? 0));
  }, []);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Stat label="Total Applicants" value={data?.total} />
        <Stat label="Active" value={data?.activeApplicants} />
        <Stat label="Completed" value={data?.completedCases} />
        <Stat label="Visa Issued" value={data?.visaIssued} />
        <Stat label="Pending Review" value={pendingCount} highlight />
      </section>

      {pendingCount !== null && pendingCount > 0 && (
        <div className="card p-5 border-l-4 border-amber-400 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-700">
            <strong>{pendingCount}</strong> applicant submission{pendingCount === 1 ? "" : "s"} waiting for your review.
          </p>
          <Link href="/admin/applicants?approval=PENDING_REVIEW" className="btn-gold text-sm">Review Now</Link>
        </div>
      )}

      <section className="grid sm:grid-cols-2 gap-4">
        <Link href="/admin/applicants" className="card p-5 hover:border-navy-300 transition-colors">
          <h3 className="font-bold text-navy-950">Manage Applicants</h3>
          <p className="text-sm text-gray-600 mt-1">Approve submissions, edit records, update statuses.</p>
        </Link>
        <Link href="/admin/announcements" className="card p-5 hover:border-navy-300 transition-colors">
          <h3 className="font-bold text-navy-950">Announcements</h3>
          <p className="text-sm text-gray-600 mt-1">Publish updates for the community.</p>
        </Link>
      </section>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | null | undefined; highlight?: boolean }) {
  return (
    <div className={`card p-4 text-center ${highlight ? "border-amber-300" : ""}`}>
      <div className="text-2xl font-extrabold text-navy-950">{value ?? "—"}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
