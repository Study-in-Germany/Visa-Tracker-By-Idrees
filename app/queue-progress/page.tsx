"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function QueueProgressPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-center text-gray-400 py-12">Loading…</p>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">Queue Progress</h1>
        <p className="text-gray-600 text-sm mt-1">
          How the waiting list is moving, and how long each processing stage is taking on average.
        </p>
      </div>

      <section className="grid sm:grid-cols-3 gap-4">
        <Metric label="Avg. Waiting → Submission" value={data.processing.avgWaitingToSubmission} />
        <Metric label="Avg. Submission → Appointment" value={data.processing.avgSubmissionToAppointment} />
        <Metric label="Avg. Appointment → Decision" value={data.processing.avgAppointmentToDecision} />
      </section>

      <section className="card p-4">
        <h3 className="font-semibold text-navy-950 mb-2 text-sm">New Waiting-List Joins per Month</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.monthlyVolume}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Bar dataKey="count" fill="#152752" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <p className="text-xs text-gray-400">
        These figures reflect community-submitted, admin-approved entries only and are for general
        guidance — they are not official consulate processing statistics.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="card p-5 text-center">
      <div className="text-3xl font-extrabold text-navy-950">{value ?? "—"}</div>
      <div className="text-xs text-gray-500 mt-1">{label}{value !== null ? " days" : ""}</div>
    </div>
  );
}
