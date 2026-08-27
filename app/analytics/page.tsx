"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { VISA_STATUS_LABELS } from "@/lib/constants";

const COLORS = ["#152752", "#d4af37", "#274785", "#e0c158", "#1c3468", "#ecd587"];

type Analytics = {
  total: number;
  activeApplicants: number;
  completedCases: number;
  visaIssued: number;
  visaRejected: number;
  statusCounts: Record<string, number>;
  topUniversities: { university: string; count: number }[];
  consulateComparison: {
    consulate: string; total: number; issued: number; rejected: number;
    avgWaitingToSubmission: number | null; avgSubmissionToAppointment: number | null; avgAppointmentToDecision: number | null;
  }[];
  processing: { avgWaitingToSubmission: number | null; avgSubmissionToAppointment: number | null; avgAppointmentToDecision: number | null };
  monthlyVolume: { month: string; count: number }[];
  monthlyOutcomes: { month: string; issued: number; rejected: number }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-center text-gray-400 py-12">Loading analytics…</p>;

  const statusData = Object.entries(data.statusCounts).map(([key, value]) => ({
    name: VISA_STATUS_LABELS[key] || key,
    value,
  }));

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-navy-950">Analytics</h1>

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Stat label="Total Applicants" value={data.total} />
        <Stat label="Active" value={data.activeApplicants} />
        <Stat label="Completed" value={data.completedCases} />
        <Stat label="Visa Issued" value={data.visaIssued} />
        <Stat label="Visa Rejected" value={data.visaRejected} />
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Applicants per Month (Waiting List Joins)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.monthlyVolume}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#152752" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Breakdown">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={100} label>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Visa Outcomes by Month">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.monthlyOutcomes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="issued" stroke="#059669" strokeWidth={2} name="Issued" />
              <Line type="monotone" dataKey="rejected" stroke="#dc2626" strokeWidth={2} name="Rejected" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Universities">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.topUniversities} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="university" width={140} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#d4af37" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section>
        <h2 className="font-bold text-navy-950 mb-4">Islamabad vs Karachi</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Consulate</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Issued</th>
                <th className="text-right px-4 py-3">Rejected</th>
                <th className="text-right px-4 py-3">Avg Waiting→Submission</th>
                <th className="text-right px-4 py-3">Avg Submission→Appointment</th>
                <th className="text-right px-4 py-3">Avg Appointment→Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.consulateComparison.map((c) => (
                <tr key={c.consulate}>
                  <td className="px-4 py-3 font-medium">{c.consulate}</td>
                  <td className="px-4 py-3 text-right">{c.total}</td>
                  <td className="px-4 py-3 text-right">{c.issued}</td>
                  <td className="px-4 py-3 text-right">{c.rejected}</td>
                  <td className="px-4 py-3 text-right">{c.avgWaitingToSubmission ?? "—"} d</td>
                  <td className="px-4 py-3 text-right">{c.avgSubmissionToAppointment ?? "—"} d</td>
                  <td className="px-4 py-3 text-right">{c.avgAppointmentToDecision ?? "—"} d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-extrabold text-navy-950">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold text-navy-950 mb-2 text-sm">{title}</h3>
      {children}
    </div>
  );
}
