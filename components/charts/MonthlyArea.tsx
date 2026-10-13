"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Series } from "./MonthlyBars";

const monthLabel = (m: string) => {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-GB", { month: "short" });
};

/** Compact monthly area/line chart. Rows are { month: "YYYY-MM", ...series values }. */
export default function MonthlyArea({ data, series, height = 150 }: { data: Record<string, any>[]; series: Series[]; height?: number }) {
  return (
    <div role="img" aria-label={`Monthly trend of ${series.map((s) => s.label).join(", ")}`}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 6, right: 6, left: -26, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="#e3e0d8" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="month" tickFormatter={monthLabel} fontSize={11} tickLine={false} axisLine={false} minTickGap={14} />
          <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip labelFormatter={(m) => String(m)} contentStyle={{ background: "#fbfaf7", border: "1px solid #e3e0d8", borderRadius: 8, fontSize: 12 }} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} fill={`url(#fill-${s.key})`} dot={false} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
