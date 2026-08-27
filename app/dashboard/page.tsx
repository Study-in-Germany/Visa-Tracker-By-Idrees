"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { fmtDate } from "@/lib/format";
import { JOURNEY_STAGES } from "@/lib/constants";

export default function MyJourneyPage() {
  const router = useRouter();
  const [applicant, setApplicant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/applicant/me").then((r) => {
      if (r.status === 401) { router.push("/login"); return null; }
      return r.json();
    }).then((data) => {
      if (data) setApplicant(data.applicant);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <p className="text-center text-gray-400 py-12">Loading…</p>;
  if (!applicant) return null;

  return (
    <div className="space-y-6">
      <div className="card p-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-sm text-gray-500">{applicant.publicId}</div>
          <h2 className="text-lg font-bold text-navy-950">{applicant.name}</h2>
          <p className="text-sm text-gray-600">
            {applicant.university || "University not set"}{applicant.approval === "PENDING_REVIEW" ? " · Pending admin review" : ""}
          </p>
        </div>
        <StatusBadge status={applicant.visaStatus} />
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-navy-950 mb-4">Timeline</h3>
        <ol className="space-y-4">
          {JOURNEY_STAGES.map((stage) => {
            const value = applicant[stage.key];
            return (
              <li key={stage.key} className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full shrink-0 ${value ? "bg-navy-700" : "bg-gray-200"}`} />
                <span className={`flex-1 text-sm ${value ? "text-gray-900" : "text-gray-400"}`}>{stage.label}</span>
                <span className="text-sm text-gray-500">{value ? fmtDate(value) : "Pending"}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
