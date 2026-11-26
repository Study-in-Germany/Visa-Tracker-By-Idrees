"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LineChart,
  Line,
} from "recharts";

export type EstimatorChartProps = {
  consulate: string;
  weeklyProgress: {
    weekKey: string;
    daysAdvanced: number;
    invitationsObserved: number;
    isLatest: boolean;
  }[];
  monthlyWaitTimes: {
    monthLabel: string;
    medianWaitDays: number;
    completedCount: number;
  }[];
  sixMonthsAvgDaysPerWeek: number;
};

export default function EstimatorCharts({
  consulate,
  weeklyProgress,
  monthlyWaitTimes,
  sixMonthsAvgDaysPerWeek,
}: EstimatorChartProps) {
  return (
    <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-ink-900">Weekly Waiting-List Progression</h4>
            <p className="text-xs text-mute">
              Calendar days of waiting list advanced by the invitation frontier each week.
            </p>
          </div>
          <span className="rounded border border-line bg-paper-raised px-2 py-0.5 text-xs text-mute">
            {consulate}
          </span>
        </div>

        <div className="h-64 w-full pt-2">
          {weeklyProgress.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyProgress} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
                <XAxis
                  dataKey="weekKey"
                  fontSize={10}
                  tickLine={false}
                  interval="preserveStartEnd"
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgb(var(--card))",
                    border: "1px solid rgb(var(--line))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(val: any, _name: any, item: any) => [
                    `${val} days advanced (${item.payload.invitationsObserved} invites)`,
                    "Queue Movement",
                  ]}
                  labelFormatter={(label) => `Week: ${label}`}
                />
                <ReferenceLine
                  y={sixMonthsAvgDaysPerWeek}
                  stroke="#16A34A"
                  strokeDasharray="3 3"
                  label={{ value: "6-Mo Avg", fill: "#16A34A", fontSize: 10, position: "top" }}
                />
                <Bar dataKey="daysAdvanced" radius={[3, 3, 0, 0]}>
                  {weeklyProgress.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isLatest ? "#2563EB" : "#3F3F46"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-mute">
              No weekly progression data available yet.
            </div>
          )}
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-ink-900">Historical Median Waiting Duration</h4>
            <p className="text-xs text-mute">
              Typical duration (days) from waiting list to invite, grouped by invitation month.
            </p>
          </div>
          <span className="rounded border border-line bg-paper-raised px-2 py-0.5 text-xs text-mute">
            Trend
          </span>
        </div>

        <div className="h-64 w-full pt-2">
          {monthlyWaitTimes.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyWaitTimes} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
                <XAxis dataKey="monthLabel" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} unit="d" />
                <Tooltip
                  contentStyle={{
                    background: "rgb(var(--card))",
                    border: "1px solid rgb(var(--line))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(val: any, _name: any, item: any) => [
                    `${val} days (≈ ${Math.round((val / 30.4) * 10) / 10} mos) [Sample: ${item.payload.completedCount}]`,
                    "Median Wait",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="medianWaitDays"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ fill: "#2563EB", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-mute">
              No monthly invitation wait points available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
