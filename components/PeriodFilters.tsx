"use client";

import DateRangePicker from "@/components/ui/DateRangePicker";
import Select from "@/components/ui/Select";
import { CONSULATES } from "@/lib/constants";
import type { Period } from "@/lib/period";

export const CONSULATE_OPTIONS = [{ value: "", label: "All embassies" }, ...CONSULATES.map((c) => ({ value: c, label: c }))];

/** Period + consulate controls, sized for a page header's action slot (top right). */
export default function PeriodFilters({ period, onPeriod, consulate, onConsulate }: { period: Period; onPeriod: (p: Period) => void; consulate: string; onConsulate: (c: string) => void }) {
  return (
    <>
      <DateRangePicker value={period} onChange={onPeriod} />
      <Select variant="pill" label="Consulate" prefix="Embassy" value={consulate} onChange={onConsulate} options={CONSULATE_OPTIONS} className="w-full sm:w-auto" />
    </>
  );
}
