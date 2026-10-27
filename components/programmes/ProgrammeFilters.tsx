"use client";

import Select from "@/components/ui/Select";
import ChipGroup from "@/components/ui/ChipGroup";
import Toggle from "@/components/ui/Toggle";
import { FilterSection, type ActiveFilter } from "@/components/ui/FilterBar";
import { DEGREE_LABELS, DEGREE_OPTIONS, INTAKE_LABELS } from "@/lib/marketplace";
import { ROUTE_LABELS, ROUTE_OPTIONS, type ProgrammeFacets } from "@/lib/programme-types";

export const PROGRAMME_FILTER_DEFAULTS = { q: "", degree: "", intake: "", language: "", ielts: "", tuitionFree: "", route: "", deadline: "", uni: "", city: "", field: "", sort: "updated", dir: "", saved: "", page: "" };
export type ProgrammeFilters = typeof PROGRAMME_FILTER_DEFAULTS;

const INTAKES = [{ value: "", label: "Any intake" }, { value: "WINTER", label: "Winter" }, { value: "SUMMER", label: "Summer" }];
const LANGUAGES = [{ value: "", label: "Any language" }, { value: "English", label: "English" }, { value: "German", label: "German" }];
const IELTS = [{ value: "", label: "Any" }, ...["5.5", "6.0", "6.5", "7.0"].map((v) => ({ value: v, label: `Up to ${v}` }))];
const DEADLINES = [
  { value: "", label: "Any deadline" }, { value: "open", label: "Still open" }, { value: "30", label: "Within 30 days" },
  { value: "60", label: "Within 60 days" }, { value: "90", label: "Within 90 days" },
];
const DEADLINE_LABELS = Object.fromEntries(DEADLINES.map((d) => [d.value, d.label]));

export const PROGRAMME_SORTS = [
  { value: "updated", label: "Recently updated" },
  { value: "university", label: "University (A–Z)" },
  { value: "deadline", label: "Deadline (soonest)" },
  { value: "ielts", label: "IELTS (lowest first)" },
  { value: "name", label: "Programme (A–Z)" },
];

const opts = (all: string, list: string[]) => [{ value: "", label: all }, ...list.map((v) => ({ value: v, label: v }))];

/** Controls shown inside the filter sheet. */
export default function ProgrammeFiltersForm({ f, set, facets }: { f: ProgrammeFilters; set: (p: Partial<ProgrammeFilters>) => void; facets?: ProgrammeFacets }) {
  return (
    <>
      <FilterSection title="Where">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Select label="University" value={f.uni} onChange={(v) => set({ uni: v })} options={[{ value: "", label: "All universities" }, ...(facets?.universities ?? []).map((u) => ({ value: u.id, label: u.name }))]} />
          <Select label="City" value={f.city} onChange={(v) => set({ city: v })} options={opts("All cities", facets?.cities ?? [])} />
        </div>
      </FilterSection>
      <FilterSection title="Degree and subject">
        <ChipGroup label="Degree" options={DEGREE_OPTIONS} value={f.degree} onChange={(v) => set({ degree: v })} />
        <div className="mt-2.5"><Select label="Subject or field of study" value={f.field} onChange={(v) => set({ field: v })} options={opts("Any subject", facets?.fields ?? [])} /></div>
      </FilterSection>
      <FilterSection title="Study">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Select label="Intake" value={f.intake} onChange={(v) => set({ intake: v })} options={INTAKES} />
          <Select label="Teaching language" value={f.language} onChange={(v) => set({ language: v })} options={LANGUAGES} />
        </div>
      </FilterSection>
      <FilterSection title="Admission">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Select label="IELTS requirement" value={f.ielts} onChange={(v) => set({ ielts: v })} options={IELTS} />
          <Select label="Application method" value={f.route} onChange={(v) => set({ route: v })} options={[{ value: "", label: "Any method" }, ...ROUTE_OPTIONS]} />
          <Select label="Application deadline" value={f.deadline} onChange={(v) => set({ deadline: v })} options={DEADLINES} />
        </div>
        <p className="mt-2 text-xs text-mute">Programmes that haven&apos;t published a requirement or deadline are left out when you filter by it.</p>
      </FilterSection>
      <Toggle checked={f.tuitionFree === "1"} onChange={(v) => set({ tuitionFree: v ? "1" : "" })} label="Tuition-free only" />
    </>
  );
}

export function programmeChips(f: ProgrammeFilters, set: (p: Partial<ProgrammeFilters>) => void, facets?: ProgrammeFacets): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  const add = (id: string, label: string, clear: Partial<ProgrammeFilters>) => chips.push({ id, label, onRemove: () => set(clear) });
  if (f.degree) add("degree", f.degree.split(",").map((d) => DEGREE_LABELS[d]).join(" / "), { degree: "" });
  if (f.uni) add("uni", facets?.universities.find((u) => u.id === f.uni)?.name ?? "University", { uni: "" });
  if (f.city) add("city", f.city, { city: "" });
  if (f.field) add("field", f.field, { field: "" });
  if (f.intake) add("intake", `${INTAKE_LABELS[f.intake]} intake`, { intake: "" });
  if (f.language) add("language", f.language, { language: "" });
  if (f.ielts) add("ielts", `IELTS ≤ ${f.ielts}`, { ielts: "" });
  if (f.route) add("route", ROUTE_LABELS[f.route], { route: "" });
  if (f.deadline) add("deadline", `Deadline: ${DEADLINE_LABELS[f.deadline]}`, { deadline: "" });
  if (f.tuitionFree) add("tuitionFree", "Tuition-free", { tuitionFree: "" });
  return chips;
}
