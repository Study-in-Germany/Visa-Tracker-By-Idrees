"use client";

import { FilterChip } from "./Chip";

type Opt = { value: string; label: string };

/** Multi-select chips. `value` and `onChange` use a comma-separated string so it maps straight onto the URL. */
export default function ChipGroup({ options, value, onChange, label }: { options: Opt[]; value: string; onChange: (v: string) => void; label: string }) {
  const selected = value ? value.split(",") : [];
  const toggle = (v: string) => onChange((selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]).join(","));
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      {options.map((o) => (
        <FilterChip key={o.value} label={o.label} active={selected.includes(o.value)} onClick={() => toggle(o.value)} />
      ))}
    </div>
  );
}
