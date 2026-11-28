"use client";

import Select from "@/components/ui/Select";
import type { AnalyticsFilterState } from "@/lib/analytics/dashboard-types";
import { CONSULATES, VISA_STATUS_ORDER, VISA_STATUS_SHORT } from "@/lib/constants";
import AnalyticsDateRangeControl from "./AnalyticsDateRangeControl";

export default function AnalyticsFilterForm({
  values,
  onChange,
  universityOptions,
  intakeOptions,
  idPrefix,
}: {
  values: AnalyticsFilterState;
  onChange: (next: AnalyticsFilterState) => void;
  universityOptions: { value: string; label: string; count?: number }[];
  intakeOptions: { value: string; label: string; count?: number }[];
  idPrefix: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-mute">
          Waiting-list join period
        </span>
        <AnalyticsDateRangeControl
          value={{ from: values.from, to: values.to }}
          onChange={(p) => onChange({ ...values, from: p.from, to: p.to })}
          fullWidth
        />
        <p className="mt-1.5 text-[11px] text-mute">
          Applies to applicant cohort metrics, embassy shares, and duration calculations.
        </p>
      </div>

      <div>
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-mute">
          Embassy / Consulate
        </span>
        <div role="group" aria-label="Filter by embassy" className="grid grid-cols-3 gap-1.5">
          {[
            { value: "", label: "All" },
            ...CONSULATES.map((c) => ({ value: c, label: c })),
          ].map((opt) => {
            const active = values.consulate === opt.value;
            return (
              <button
                key={opt.value || "all"}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...values, consulate: opt.value })}
                className={`min-h-[36px] rounded-[6px] border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white dark:border-[#FAFAFA] dark:bg-[#FAFAFA] dark:text-[#0A0A0A]"
                    : "border-line bg-paper-raised text-ink-700 hover:bg-[rgb(var(--hover))]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-mute">
          Application status
        </span>
        <div role="group" aria-label="Filter by application status" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={!values.visaStatus}
            onClick={() => onChange({ ...values, visaStatus: "" })}
            className={`min-h-[32px] rounded-[5px] border px-2.5 py-1 text-[12px] font-medium transition-colors ${
              !values.visaStatus
                ? "border-slate-900 bg-slate-900 text-white dark:border-[#FAFAFA] dark:bg-[#FAFAFA] dark:text-[#0A0A0A]"
                : "border-line bg-paper-raised text-ink-700 hover:bg-[rgb(var(--hover))]"
            }`}
          >
            All
          </button>
          {VISA_STATUS_ORDER.map((s) => {
            const active = values.visaStatus === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ ...values, visaStatus: active ? "" : s })}
                className={`min-h-[32px] rounded-[5px] border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white dark:border-[#FAFAFA] dark:bg-[#FAFAFA] dark:text-[#0A0A0A]"
                    : "border-line bg-paper-raised text-ink-700 hover:bg-[rgb(var(--hover))]"
                }`}
              >
                {VISA_STATUS_SHORT[s] ?? s}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-university`}
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute"
        >
          University (normalized)
        </label>
        <Select
          id={`${idPrefix}-university`}
          label="University"
          value={values.university}
          onChange={(university) => onChange({ ...values, university })}
          options={[
            { value: "", label: "All universities" },
            ...universityOptions.map((u) => ({
              value: u.value,
              label: u.count ? `${u.label} (${u.count})` : u.label,
            })),
          ]}
          clearable
        />
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-intake`}
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mute"
        >
          Target intake
        </label>
        <Select
          id={`${idPrefix}-intake`}
          label="Intake"
          value={values.intake}
          onChange={(intake) => onChange({ ...values, intake })}
          options={[
            { value: "", label: "All intakes" },
            ...intakeOptions.map((i) => ({
              value: i.value,
              label: i.count ? `${i.label} (${i.count})` : i.label,
            })),
          ]}
          clearable
        />
      </div>
    </div>
  );
}
