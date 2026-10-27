"use client";

import { useEffect, useState } from "react";
import FormModal from "@/components/ui/FormModal";
import Field from "@/components/ui/Field";
import Checkbox from "@/components/ui/Checkbox";
import { apiFetch, jsonInit } from "@/lib/api";
import type { UniversityDto } from "@/lib/marketplace";

const blank = { name: "", city: "", state: "", website: "https://", description: "", published: true };

/** Admin form to add or edit a university. */
export default function UniversityFormModal({ open, onClose, university, onSaved }: { open: boolean; onClose: () => void; university?: UniversityDto | null; onSaved: () => void }) {
  const [f, setF] = useState(blank);
  useEffect(() => {
    if (open) setF(university ? { name: university.name, city: university.city, state: university.state ?? "", website: university.website, description: university.description ?? "", published: university.published } : blank);
  }, [open, university]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={university ? "Edit university" : "Add university"}
      submitLabel={university ? "Save changes" : "Add university"}
      onSubmit={async () => {
        await apiFetch(university ? `/api/universities/${university.id}` : "/api/universities", jsonInit(university ? "PATCH" : "POST", f));
        onSaved();
      }}
    >
      {({ errors }) => (
        <>
          <Field label="Name" htmlFor="u-name" required error={errors.name}>
            <input id="u-name" className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Technical University of Munich" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" htmlFor="u-city" required error={errors.city}>
              <input id="u-city" className="input" value={f.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="State" htmlFor="u-state" error={errors.state}>
              <input id="u-state" className="input" value={f.state} onChange={(e) => set("state", e.target.value)} placeholder="Bavaria" />
            </Field>
          </div>
          <Field label="Official website" htmlFor="u-web" required error={errors.website}>
            <input id="u-web" className="input" type="url" value={f.website} onChange={(e) => set("website", e.target.value)} />
          </Field>
          <Field label="Short description" htmlFor="u-desc" hint="Optional" error={errors.description}>
            <textarea id="u-desc" className="input" rows={3} maxLength={1000} value={f.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Checkbox checked={f.published} onChange={(v) => set("published", v)} label="Visible to the public" description="Untick to hide it while you prepare the details" />
        </>
      )}
    </FormModal>
  );
}
