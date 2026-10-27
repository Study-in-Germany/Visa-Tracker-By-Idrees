"use client";

import Select from "@/components/ui/Select";
import ChipGroup from "@/components/ui/ChipGroup";
import Toggle from "@/components/ui/Toggle";
import { FilterSection, type ActiveFilter } from "@/components/ui/FilterBar";
import { DEGREE_LABELS, DEGREE_OPTIONS, INTAKE_LABELS } from "@/lib/marketplace";

export const UNI_FILTER_DEFAULTS = { q: "", view: "", state: "", type: "", degree: "", intake: "", language: "", deadline: "", withProgrammes: "", page: "" };
export type UniFilters = typeof UNI_FILTER_DEFAULTS;

const INTAKES = [{ value: "", label: "Any intake" }, { value: "WINTER", label: "Winter" }, { value: "SUMMER", label: "Summer" }];
const LANGUAGES = [{ value: "", label: "Any language" }, { value: "English", label: "English" }, { value: "German", label: "German" }];
const DEADLINES = [
  { value: "", label: "Any deadline" },
  { value: "upcoming", label: "Still open" },
  { value: "30", label: "Within 30 days" },
  { value: "60", label: "Within 60 days" },
  { value: "90", label: "Within 90 days" },
];
const DEADLINE_LABELS = Object.fromEntries(DEADLINES.map((d) => [d.value, d.label]));

/** Controls shown inside the filter sheet. */
export default function UniversityFilters({ f, set, states, types }: { f: UniFilters; set: (p: Partial<UniFilters>) => void; states: string[]; types: string[] }) {
  const opts = (all: string, list: string[]) => [{ value: "", label: all }, ...list.map((v) => ({ value: v, label: v }))];
  return (
    <>
      <FilterSection title="Institution">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Select label="Federal state" value={f.state} onChange={(v) => set({ state: v })} options={opts("All states", states)} />
          <Select label="Type" value={f.type} onChange={(v) => set({ type: v })} options={opts("All types", types)} />
        </div>
      </FilterSection>
      <FilterSection title="Degree">
        <ChipGroup label="Degree" options={DEGREE_OPTIONS} value={f.degree} onChange={(v) => set({ degree: v })} />
      </FilterSection>
      <FilterSection title="Programme">
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Select label="Intake" value={f.intake} onChange={(v) => set({ intake: v })} options={INTAKES} />
          <Select label="Teaching language" value={f.language} onChange={(v) => set({ language: v })} options={LANGUAGES} />
          <Select label="Application deadline" value={f.deadline} onChange={(v) => set({ deadline: v })} options={DEADLINES} />
        </div>
      </FilterSection>
      <Toggle checked={f.withProgrammes === "1"} onChange={(v) => set({ withProgrammes: v ? "1" : "" })} label="Only with programme details" />
    </>
  );
}

export function uniChips(f: UniFilters, set: (p: Partial<UniFilters>) => void): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  const add = (id: keyof UniFilters, label: string) => chips.push({ id, label, onRemove: () => set({ [id]: "" } as Partial<UniFilters>) });
  if (f.state) add("state", f.state);
  // type and "with programmes" are shown as quick chips above the list, so they are not repeated here
  if (f.degree) add("degree", f.degree.split(",").map((d) => DEGREE_LABELS[d]).join(" / "));
  if (f.intake) add("intake", `${INTAKE_LABELS[f.intake]} intake`);
  if (f.language) add("language", f.language);
  if (f.deadline) add("deadline", `Deadline: ${DEADLINE_LABELS[f.deadline]}`);
  return chips;
}
