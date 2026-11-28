"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
};

export default function CohortProgress({
  data,
  height = 240,
}: {
  data: {
    month: string;
    total: number;
    waitingList: number;
    submissionInvited: number;
    documentsSubmitted: number;
    appointmentStage: number;
    visaIssued: number;
    visaRejected: number;
    withdrawn: number;
  }[];
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-paper-sunk px-3 py-6 text-center text-xs text-mute">
        No joining-month cohort breakdown available yet.
      </p>
    );
  }

  return (
    <div role="img" aria-label="Mutually exclusive applicant status breakdown by waiting-list joining month">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
          <XAxis dataKey="month" tickFormatter={monthLabel} fontSize={11} tickLine={false} axisLine={false} stroke="rgb(var(--mute))" />
          <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} stroke="rgb(var(--mute))" />
          <Tooltip
            labelFormatter={(m) => `Joined ${monthLabel(String(m))}`}
            cursor={{ fill: "rgb(var(--paper-sunk))" }}
            contentStyle={{
              background: "rgb(var(--card))",
              border: "1px solid rgb(var(--line))",
              borderRadius: 8,
              fontSize: 12,
              color: "rgb(var(--ink-900))",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="waitingList" stackId="a" name="Waiting list" fill="#737373" />
          <Bar dataKey="submissionInvited" stackId="a" name="Sub. invite" fill="#0ea5e9" />
          <Bar dataKey="documentsSubmitted" stackId="a" name="Docs submitted" fill="#3b82f6" />
          <Bar dataKey="appointmentStage" stackId="a" name="Appointment" fill="#14b8a6" />
          <Bar dataKey="visaIssued" stackId="a" name="Visa issued" fill="#10b981" />
          <Bar dataKey="visaRejected" stackId="a" name="Rejected" fill="#ef4444" />
          <Bar dataKey="withdrawn" stackId="a" name="Withdrawn" fill="#f59e0b" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
