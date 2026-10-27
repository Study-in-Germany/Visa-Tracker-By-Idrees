"use client";

import { useEffect, useState } from "react";
import Select from "@/components/ui/Select";
import Toggle from "@/components/ui/Toggle";
import { FilterSection, type ActiveFilter } from "@/components/ui/FilterBar";
import { eur } from "@/lib/marketplace";

/** `cat` is the category strip: "", a listing type, or WANTED (requests from people looking for a place). */
export const LISTING_FILTER_DEFAULTS = { q: "", cat: "", city: "", min: "", max: "", avail: "", anmeldung: "", furnished: "", bills: "", rented: "", saved: "", sort: "newest", page: "" };
export type ListingFilters = typeof LISTING_FILTER_DEFAULTS;

const AVAILABILITY = [
  { value: "", label: "Any time" },
  { value: "now", label: "Available now" },
  { value: "30", label: "Within 1 month" },
  { value: "60", label: "Within 2 months" },
  { value: "90", label: "Within 3 months" },
];
const AVAIL_LABELS = Object.fromEntries(AVAILABILITY.map((a) => [a.value, a.label]));

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "available", label: "Available soonest" },
];

/** Turns the URL's availability choice into the API's availableBy date. */
export function availableBy(avail: string): string {
  if (!avail) return "";
  const d = new Date();
  if (avail !== "now") d.setDate(d.getDate() + Number(avail));
  return d.toISOString().slice(0, 10);
}

/** Maps the category strip onto API filters. */
export function categoryParams(cat: string): Record<string, string> {
  if (cat === "WANTED") return { kind: "SEEKING" };
  return cat ? { kind: "OFFERING", type: cat } : { kind: "OFFERING" };
}

/** Min/max rent. Commits after a short pause so the list doesn't refetch on every keystroke. */
function PriceRange({ min, max, onChange }: { min: string; max: string; onChange: (p: { min: string; max: string }) => void }) {
  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);
  useEffect(() => { setLo(min); setHi(max); }, [min, max]);
  useEffect(() => {
    if (lo === min && hi === max) return;
    const t = setTimeout(() => onChange({ min: lo, max: hi }), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lo, hi]);
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 5);
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <label className="block"><span className="label">Minimum (€)</span><input className="input" inputMode="numeric" placeholder="0" value={lo} onChange={(e) => setLo(digits(e.target.value))} /></label>
      <label className="block"><span className="label">Maximum (€)</span><input className="input" inputMode="numeric" placeholder="Any" value={hi} onChange={(e) => setHi(digits(e.target.value))} /></label>
    </div>
  );
}

/** Controls shown inside the filter sheet. */
export default function ListingFiltersBar({ f, set, cities }: { f: ListingFilters; set: (p: Partial<ListingFilters>) => void; cities: string[] }) {
  return (
    <>
      <FilterSection title="City">
        <Select label="City" value={f.city} onChange={(v) => set({ city: v })} options={[{ value: "", label: "All cities" }, ...cities.map((c) => ({ value: c, label: c }))]} />
      </FilterSection>
      <FilterSection title="Monthly rent or budget">
        <PriceRange min={f.min} max={f.max} onChange={(p) => set(p)} />
      </FilterSection>
      <FilterSection title="Availability">
        <Select label="Availability" value={f.avail} onChange={(v) => set({ avail: v })} options={AVAILABILITY} />
      </FilterSection>
      <FilterSection title="Must have">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle checked={f.anmeldung === "1"} onChange={(v) => set({ anmeldung: v ? "1" : "" })} label="Anmeldung" />
          <Toggle checked={f.furnished === "1"} onChange={(v) => set({ furnished: v ? "1" : "" })} label="Furnished" />
          <Toggle checked={f.bills === "1"} onChange={(v) => set({ bills: v ? "1" : "" })} label="Bills included" />
          <Toggle checked={f.rented === "1"} onChange={(v) => set({ rented: v ? "1" : "" })} label="Show taken too" />
        </div>
      </FilterSection>
    </>
  );
}

export function listingChips(f: ListingFilters, set: (p: Partial<ListingFilters>) => void): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  const add = (id: string, label: string, clear: Partial<ListingFilters>) => chips.push({ id, label, onRemove: () => set(clear) });
  if (f.city) add("city", f.city, { city: "" });
  if (f.min || f.max) add("price", f.min && f.max ? `${eur(+f.min)} – ${eur(+f.max)}` : f.min ? `From ${eur(+f.min)}` : `Up to ${eur(+f.max)}`, { min: "", max: "" });
  if (f.avail) add("avail", AVAIL_LABELS[f.avail], { avail: "" });
  if (f.anmeldung) add("anmeldung", "Anmeldung", { anmeldung: "" });
  if (f.furnished) add("furnished", "Furnished", { furnished: "" });
  if (f.bills) add("bills", "Bills included", { bills: "" });
  if (f.rented) add("rented", "Incl. taken", { rented: "" });
  return chips;
}
