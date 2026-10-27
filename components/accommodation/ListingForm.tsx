"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import Toggle from "@/components/ui/Toggle";
import DatePicker from "@/components/ui/DatePicker";
import Icon from "@/components/ui/Icon";
import dynamic from "next/dynamic";
import { Notice } from "@/components/ui/States";
import PhotoUploader from "./PhotoUploader";
import { ApiError, apiFetch, jsonInit } from "@/lib/api";
import { invalidateApi } from "@/hooks/useApi";
import { toDateInput } from "@/lib/deadline";
import { GENDER_PREFERENCE_OPTIONS, LISTING_TYPE_OPTIONS, type ListingDetailDto, type ListingImageDto } from "@/lib/marketplace";

// The editor is large and browser-only, so it loads on demand. The placeholder has the editor's exact height to avoid a layout jump.
const RichTextEditor = dynamic(() => import("@/components/ui/RichTextEditor"), { ssr: false, loading: () => <div className="h-[340px] animate-pulse rounded-lg bg-paper-sunk" aria-hidden="true" /> });

type Errors = Record<string, string>;
const digits = (v: string, max = 5) => v.replace(/\D/g, "").slice(0, max);

const SEEKING_TEMPLATE = `## Looking for
• Private room in a shared apartment / student accommodation
• Safe and convenient location
• **Anmeldung** available

## Contact
If you have a room available or know of suitable accommodation, please message me.`;

const KINDS = [
  { value: "OFFERING", title: "I have a place", hint: "Rent out a room or apartment", icon: "home" as const },
  { value: "SEEKING", title: "I'm looking for a place", hint: "Let others know what you need", icon: "search" as const },
];

/** Create or edit a listing. Pass `listing` to edit. Listings go live as soon as they are published. */
export default function ListingForm({ listing }: { listing?: ListingDetailDto }) {
  const router = useRouter();
  const editing = !!listing;
  const [images, setImages] = useState<ListingImageDto[]>(listing?.images ?? []);
  const [f, setF] = useState({
    kind: listing?.kind ?? "OFFERING",
    title: listing?.title ?? "",
    type: listing?.type ?? "ROOM",
    city: listing?.city ?? "",
    district: listing?.district ?? "",
    rentEur: listing?.rentEur != null ? String(listing.rentEur) : "",
    depositEur: listing?.depositEur != null ? String(listing.depositEur) : "",
    billsIncluded: listing?.billsIncluded ?? false,
    furnished: listing?.furnished ?? false,
    anmeldung: listing?.anmeldung ?? false,
    sizeSqm: listing?.sizeSqm != null ? String(listing.sizeSqm) : "",
    minStayMonths: listing?.minStayMonths != null ? String(listing.minStayMonths) : "",
    genderPreference: listing?.genderPreference ?? "ANY",
    availableFrom: toDateInput(listing?.availableFrom),
    description: listing?.description ?? "",
    contactName: listing?.contact?.contactName ?? "",
    contactPhone: listing?.contact?.contactPhone ?? "",
    contactEmail: listing?.contact?.contactEmail ?? "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const seeking = f.kind === "SEEKING";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: Errors = {};
    if (!seeking && !f.rentEur) local.rentEur = "Enter the monthly rent";
    if (!f.availableFrom) local.availableFrom = "Choose a date";
    if (!seeking && images.length === 0) local.imageIds = "Add at least one photo";
    if (Object.keys(local).length) { setErrors(local); setFormError("Please fix the highlighted fields."); return; }

    setBusy(true);
    setErrors({});
    setFormError("");
    const num = (v: string) => (v ? Number(v) : null);
    const payload = {
      kind: f.kind, title: f.title, type: f.type, city: f.city, district: f.district,
      rentEur: num(f.rentEur), depositEur: seeking ? null : num(f.depositEur),
      billsIncluded: f.billsIncluded, furnished: f.furnished, anmeldung: f.anmeldung,
      sizeSqm: seeking ? null : num(f.sizeSqm), minStayMonths: num(f.minStayMonths), genderPreference: f.genderPreference,
      availableFrom: f.availableFrom, description: f.description,
      contactName: f.contactName, contactPhone: f.contactPhone, contactEmail: f.contactEmail,
      imageIds: seeking ? [] : images.map((i) => i.id),
    };
    try {
      if (editing) {
        await apiFetch(`/api/listings/${listing!.id}`, jsonInit("PATCH", payload));
        invalidateApi("/api/listings");
        router.push(`/accommodation/${listing!.id}`);
      } else {
        const { id } = await apiFetch<{ id: string }>("/api/listings", jsonInit("POST", payload));
        invalidateApi("/api/listings");
        router.push(`/accommodation/${id}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`); return; }
      if (err instanceof ApiError && err.fields) setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k, v[0]])));
      setFormError(err instanceof ApiError && !err.fields ? err.message : "Please fix the highlighted fields.");
      setBusy(false);
    }
  }

  const section = "card space-y-4 p-4 sm:p-5";
  const heading = "text-xs font-semibold uppercase tracking-wider text-mute";

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        {!editing && (
          <div role="radiogroup" aria-label="What do you want to post?" className="grid gap-2 sm:grid-cols-2">
            {KINDS.map((k) => (
              <button key={k.value} type="button" role="radio" aria-checked={f.kind === k.value} onClick={() => { set("kind", k.value); if (k.value === "SEEKING" && !f.description) set("description", SEEKING_TEMPLATE); }}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${f.kind === k.value ? "border-ink-800 bg-paper-sunk ring-1 ring-ink-800" : "border-line-strong bg-paper-raised hover:bg-paper-sunk"}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-paper text-ink-800"><Icon name={k.icon} size={18} /></span>
                <span><span className="block text-[14px] font-semibold">{k.title}</span><span className="block text-xs text-mute">{k.hint}</span></span>
              </button>
            ))}
          </div>
        )}

        {!seeking && (
          <section className={section}>
            <h2 className={heading}>Photos</h2>
            <PhotoUploader value={images} onChange={setImages} error={errors.imageIds} listingId={listing?.id} />
          </section>
        )}

        <section className={section}>
          <h2 className={heading}>{seeking ? "Your request" : "The place"}</h2>
          <Field label="Title" htmlFor="l-title" required error={errors.title}>
            <input id="l-title" className="input" maxLength={100} placeholder={seeking ? "e.g. Looking for a room in Dresden from September" : "e.g. Bright room near TU Berlin"} value={f.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={seeking ? "Looking for" : "Type"} htmlFor="l-type" required error={errors.type}>
              <Select id="l-type" label="Accommodation type" value={f.type} onChange={(v) => set("type", v)} options={LISTING_TYPE_OPTIONS} />
            </Field>
            <Field label={seeking ? "Move-in date" : "Available from"} htmlFor="l-avail" required error={errors.availableFrom}>
              <DatePicker id="l-avail" label={seeking ? "Move-in date" : "Available from"} value={f.availableFrom} onChange={(v) => set("availableFrom", v)} />
            </Field>
            <Field label="City" htmlFor="l-city" required error={errors.city}>
              <input id="l-city" className="input" maxLength={60} placeholder="Dresden" value={f.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" />
            </Field>
            <Field label={seeking ? "Preferred area" : "Area / district"} htmlFor="l-district" hint={seeking ? "Optional" : "Optional. Don't include the street address."} error={errors.district}>
              <input id="l-district" className="input" maxLength={60} value={f.district} onChange={(e) => set("district", e.target.value)} />
            </Field>
            <Field label={seeking ? "Maximum budget (€ / month)" : "Monthly rent (€)"} htmlFor="l-rent" required={!seeking} hint={seeking ? "Optional" : undefined} error={errors.rentEur}>
              <input id="l-rent" className="input" inputMode="numeric" placeholder={seeking ? "500" : "450"} value={f.rentEur} onChange={(e) => set("rentEur", digits(e.target.value))} />
            </Field>
            {!seeking && (
              <Field label="Deposit (€)" htmlFor="l-deposit" hint="Optional" error={errors.depositEur}>
                <input id="l-deposit" className="input" inputMode="numeric" placeholder="900" value={f.depositEur} onChange={(e) => set("depositEur", digits(e.target.value))} />
              </Field>
            )}
            {!seeking && (
              <Field label="Size (m²)" htmlFor="l-size" hint="Optional" error={errors.sizeSqm}>
                <input id="l-size" className="input" inputMode="numeric" placeholder="14" value={f.sizeSqm} onChange={(e) => set("sizeSqm", digits(e.target.value, 3))} />
              </Field>
            )}
            <Field label={seeking ? "How long will you stay? (months)" : "Minimum stay (months)"} htmlFor="l-stay" hint="Optional" error={errors.minStayMonths}>
              <input id="l-stay" className="input" inputMode="numeric" placeholder="12" value={f.minStayMonths} onChange={(e) => set("minStayMonths", digits(e.target.value, 2))} />
            </Field>
            <Field label={seeking ? "Housemate preference" : "Who is it for?"} htmlFor="l-gender" error={errors.genderPreference}>
              <Select id="l-gender" label="Gender preference" value={f.genderPreference} onChange={(v) => set("genderPreference", v)} options={GENDER_PREFERENCE_OPTIONS} />
            </Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Toggle checked={f.anmeldung} onChange={(v) => set("anmeldung", v)} label={seeking ? "Anmeldung required" : "Anmeldung possible"} hint="Registration of your address in Germany" />
            <Toggle checked={f.furnished} onChange={(v) => set("furnished", v)} label={seeking ? "Furnished preferred" : "Furnished"} />
            <Toggle checked={f.billsIncluded} onChange={(v) => set("billsIncluded", v)} label={seeking ? "Bills included preferred" : "Bills included"} hint="Heating, water, internet" />
          </div>
          <Field label={seeking ? "Details" : "Description"} htmlFor="l-desc" required error={errors.description} hint="Use the toolbar for bold, italic, headings and lists.">
            <RichTextEditor id="l-desc" value={f.description} onChange={(v) => set("description", v)} error={errors.description} placeholder={seeking ? "What are you looking for? Who are you? Anything the landlord should know." : "Who lives there, distance to the university, rules, what's nearby…"} />
          </Field>
        </section>

        <section className={section}>
          <div>
            <h2 className={heading}>Contact</h2>
            <p className="mt-1 text-xs text-mute">Only signed-in users can see these details. Add a phone / WhatsApp number or an email (or both).</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" htmlFor="l-cname" required error={errors.contactName}>
              <input id="l-cname" className="input" maxLength={80} value={f.contactName} onChange={(e) => set("contactName", e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Phone / WhatsApp" htmlFor="l-cphone" error={errors.contactPhone}>
              <input id="l-cphone" className="input" type="tel" placeholder="+49 151 2345678" value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} autoComplete="tel" />
            </Field>
            <Field label="Email" htmlFor="l-cemail" error={errors.contactEmail}>
              <input id="l-cemail" className="input" type="email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} autoComplete="email" />
            </Field>
          </div>
        </section>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-20">
        <div className="card space-y-3 p-4">
          <h2 className="text-[14px] font-semibold">{editing ? "Save your changes" : "Ready to publish?"}</h2>
          <p className="text-xs text-mute">{editing ? "Changes show immediately." : "Your post goes live straight away. You can edit, hide or delete it any time from My listings."}</p>
          {formError && <Notice tone="error">{formError}</Notice>}
          <button type="submit" className="btn-gold !min-h-[44px] w-full" disabled={busy}>{busy ? "Publishing…" : editing ? "Save changes" : "Publish"}</button>
          <button type="button" className="btn-secondary w-full" onClick={() => router.back()} disabled={busy}>Cancel</button>
        </div>
        <ul className="space-y-1.5 px-1 text-xs text-mute">
          <li className="flex gap-2"><Icon name="check" size={13} className="mt-0.5 shrink-0" /> {seeking ? "Say when you move in, your budget and whether you need Anmeldung." : "Clear photos and an honest description get the most replies."}</li>
          <li className="flex gap-2"><Icon name="check" size={13} className="mt-0.5 shrink-0" /> Share your phone or WhatsApp only through this form.</li>
          <li className="flex gap-2"><Icon name="check" size={13} className="mt-0.5 shrink-0" /> Never ask for or send money before seeing the place.</li>
        </ul>
      </aside>
    </form>
  );
}
