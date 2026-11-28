"use client";

import { formatMonthShort } from "@/lib/analytics/chart-formatters";
import type { CohortChartRow } from "@/lib/analytics/presentation-adapter";

const MATRIX_COLUMNS: {
  key: keyof Pick<
    CohortChartRow,
    | "waitingList"
    | "submissionInvited"
    | "documentsSubmitted"
    | "appointmentStage"
    | "visaIssued"
    | "visaRejected"
    | "withdrawn"
  >;
  pctKey: keyof Pick<
    CohortChartRow,
    | "waitingListPct"
    | "submissionInvitedPct"
    | "documentsSubmittedPct"
    | "appointmentStagePct"
    | "visaIssuedPct"
    | "visaRejectedPct"
    | "withdrawnPct"
  >;
  label: string;
}[] = [
  { key: "waitingList", pctKey: "waitingListPct", label: "Waiting list" },
  { key: "submissionInvited", pctKey: "submissionInvitedPct", label: "Invited" },
  { key: "documentsSubmitted", pctKey: "documentsSubmittedPct", label: "Submitted" },
  { key: "appointmentStage", pctKey: "appointmentStagePct", label: "Appointment" },
  { key: "visaIssued", pctKey: "visaIssuedPct", label: "Issued" },
  { key: "visaRejected", pctKey: "visaRejectedPct", label: "Rejected" },
  { key: "withdrawn", pctKey: "withdrawnPct", label: "Withdrawn" },
];

function cellShade(pct: number, count: number): string {
  if (count === 0) return "bg-paper-sunk/40 text-mute";
  if (pct >= 70) return "bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-950 font-semibold";
  if (pct >= 40) return "bg-slate-700 text-white dark:bg-neutral-300 dark:text-neutral-950 font-semibold";
  if (pct >= 15) return "bg-slate-200 text-slate-900 dark:bg-neutral-700 dark:text-neutral-100 font-medium";
  return "bg-slate-100 text-slate-800 dark:bg-neutral-800 dark:text-neutral-200";
}

export default function CohortHeatmap({
  rows,
  mode,
  selectedMonth,
  onSelectMonth,
}: {
  rows: CohortChartRow[];
  mode: "count" | "percent";
  selectedMonth: string | null;
  onSelectMonth: (month: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="w-full overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[540px] border-collapse text-[12px]">
          <caption className="sr-only">
            Current mutually exclusive status distribution matrix by waiting-list join month
          </caption>
          <thead>
            <tr className="border-b border-line bg-paper-sunk text-[11px] font-semibold text-mute">
              <th scope="col" className="px-3 py-2 text-left">
                WL Month
              </th>
              <th scope="col" className="px-2.5 py-2 text-right">
                Total
              </th>
              {MATRIX_COLUMNS.map((col) => (
                <th key={col.key} scope="col" className="px-2 py-2 text-center">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const isSelected = selectedMonth === r.month;
              return (
                <tr
                  key={r.month}
                  onClick={() => onSelectMonth(r.month)}
                  className={`cursor-pointer transition-colors hover:bg-[rgb(var(--hover)/0.6)] ${
                    isSelected ? "ring-1 ring-inset ring-ink-700" : ""
                  }`}
                >
                  <th
                    scope="row"
                    className="whitespace-nowrap px-3 py-2 text-left font-medium text-ink-900"
                  >
                    {formatMonthShort(r.month)}
                  </th>
                  <td className="px-2.5 py-2 text-right font-semibold tabular-nums text-ink-900">
                    {r.total}
                  </td>
                  {MATRIX_COLUMNS.map((col) => {
                    const count = r[col.key];
                    const pct = r[col.pctKey];
                    return (
                      <td key={col.key} className="p-1 text-center tabular-nums">
                        <span
                          className={`inline-flex w-full items-center justify-center rounded px-1.5 py-1 text-[11px] ${cellShade(
                            pct,
                            count
                          )}`}
                        >
                          {count === 0 ? "·" : mode === "percent" ? `${pct}%` : count}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-mute">
        Current-status snapshot per joining cohort (mutually exclusive across stages).
      </p>
    </div>
  );
}
