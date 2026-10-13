"use client";

import { useState } from "react";
import Select from "@/components/ui/Select";
import { INTAKE_SEASONS, intakeYearOptions } from "@/lib/options";

const parse = (v: string) => {
  const m = /^(Winter|Summer)\s+(\d{4})$/i.exec(v.trim());
  return m ? { season: m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), year: m[2] } : { season: "", year: "" };
};

/** Season + year dropdowns that read and write a single "Winter 2026" string. Emits "" until both are chosen. */
export default function IntakeSelect({ value, onChange, idPrefix = "intake" }: { value: string; onChange: (v: string) => void; idPrefix?: string }) {
  const initial = parse(value);
  const [season, setSeason] = useState(initial.season);
  const [year, setYear] = useState(initial.year);
  const years = intakeYearOptions();
  // Older free-text value that does not fit the pattern: show it as-is until the user picks a new one.
  const legacy = value && !initial.season ? value : "";

  const emit = (s: string, y: string) => onChange(s && y ? `${s} ${y}` : "");

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select id={`${idPrefix}-season`} label="Intake season" value={season} onChange={(v) => { setSeason(v); emit(v, year); }} options={INTAKE_SEASONS} placeholder={legacy || "Season"} />
      <Select id={`${idPrefix}-year`} label="Intake year" value={year} onChange={(v) => { setYear(v); emit(season, v); }} options={years} placeholder="Year" />
    </div>
  );
}
