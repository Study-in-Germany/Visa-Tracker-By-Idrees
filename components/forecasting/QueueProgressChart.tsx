"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const fmtShort = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

const fmtDayNum = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export default function QueueProgressChart({
  data,
  height = 240,
}: {
  data: {
    observationDate: string;
    submissionFrontier: string | null;
    appointmentWlFrontier: string | null;
  }[];
  height?: number;
}) {
  const chartData = data.map((d) => ({
    obs: d.observationDate,
    subMs: d.submissionFrontier ? new Date(`${d.submissionFrontier}T00:00:00Z`).getTime() : null,
    apptMs: d.appointmentWlFrontier ? new Date(`${d.appointmentWlFrontier}T00:00:00Z`).getTime() : null,
  }));

  if (chartData.length < 2) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-paper-sunk px-3 py-6 text-center text-xs text-mute">
        Not enough dated queue observations to plot progression history yet.
      </p>
    );
  }

  return (
    <div role="img" aria-label="Embassy queue progression history showing cohort dates reached over time">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 6, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="obs"
            tickFormatter={fmtShort}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            stroke="rgb(var(--mute))"
            minTickGap={22}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={fmtDayNum}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            stroke="rgb(var(--mute))"
            width={58}
          />
          <Tooltip
            labelFormatter={(v) => `Observed: ${fmtShort(String(v))}`}
            formatter={(val, name) => [
              typeof val === "number" ? fmtDayNum(val) : "—",
              name === "subMs" ? "Submission frontier" : "Appointment WL cohort",
            ]}
            contentStyle={{
              background: "rgb(var(--card))",
              border: "1px solid rgb(var(--line))",
              borderRadius: 8,
              fontSize: 12,
              color: "rgb(var(--ink-900))",
            }}
          />
          <Line
            type="monotone"
            dataKey="subMs"
            name="subMs"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 2.5 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="apptMs"
            name="apptMs"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 2.5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-mute">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-600" /> Waiting-list date getting submission invites
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Waiting-list cohort reaching appointments
        </span>
      </div>
    </div>
  );
}
