"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type Series = { key: string; label: string; color: string };

const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
};

/** Grouped monthly bars for one or more series. Data rows are { month: "YYYY-MM", ...series values }. */
export default function MonthlyBars({ data, series, height = 260 }: { data: Record<string, any>[]; series: Series[]; height?: number }) {
  return (
    <div role="img" aria-label={`Monthly chart of ${series.map((s) => s.label).join(", ")}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
          <XAxis dataKey="month" tickFormatter={monthLabel} fontSize={12} tickLine={false} axisLine={{ stroke: "rgb(var(--line-strong))" }} minTickGap={16} stroke="rgb(var(--mute))" />
          <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} stroke="rgb(var(--mute))" />
          <Tooltip
            labelFormatter={(m) => monthLabel(String(m))}
            cursor={{ fill: "rgb(var(--paper-sunk))" }}
            contentStyle={{ background: "rgb(var(--card))", border: "1px solid rgb(var(--line))", borderRadius: 8, fontSize: 12, color: "rgb(var(--ink-900))" }}
          />
          {series.length > 1 && <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
