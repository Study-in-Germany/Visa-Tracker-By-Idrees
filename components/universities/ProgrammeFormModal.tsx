"use client";

import { useEffect, useState } from "react";
import FormModal from "@/components/ui/FormModal";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import Toggle from "@/components/ui/Toggle";
import DatePicker from "@/components/ui/DatePicker";
import { apiFetch, jsonInit } from "@/lib/api";
import { toDateInput } from "@/lib/deadline";
import { DEGREE_OPTIONS, type ProgrammeDto } from "@/lib/marketplace";
import { ROUTE_OPTIONS } from "@/lib/programme-types";

type Tri = "" | "yes" | "no";
const TRI = [{ value: "", label: "Not specified" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }];
const tri = (v: unknown): Tri => (v === true ? "yes" : v === false ? "no" : "");
const triOut = (v: Tri) => (v === "yes" ? true : v === "no" ? false : null);
const numOut = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

const blank = {
  name: "", degreeLevel: "MASTER", language: "", intakes: ["WINTER"] as string[], summerDeadline: "", winterDeadline: "", website: "", published: true, markVerified: true,
  field: "", durationSemesters: "", euSummerDeadline: "", euWinterDeadline: "", applicationRoute: "", applicationUrl: "", sourceUrl: "", daadUrl: "",
  ieltsOverall: "", ieltsMinSection: "", languageCertificates: "", ectsRequired: "", minGpaNote: "", requiresGre: "" as Tri, workExperienceNote: "",
  requirements: "", remarks: "", admissionRestricted: "" as Tri, tuitionFree: "" as Tri, tuitionFeeEur: "", semesterContributionEur: "", tuitionNote: "",
};

const sectionCls = "space-y-4 rounded-xl border border-line p-4";
const h = "text-xs font-semibold uppercase tracking-wider text-mute";

/** Admin form to add or edit a programme, including its admission details. Anything left empty is shown publicly as "Not specified". */
export default function ProgrammeFormModal({ open, onClose, universityId, programme, onSaved }: { open: boolean; onClose: () => void; universityId: string; programme?: (ProgrammeDto & Record<string, any>) | null; onSaved: () => void }) {
  const [f, setF] = useState(blank);
  const [detail, setDetail] = useState<Record<string, any> | null>(null);

  // The list payload carries only summary fields; load the full record when editing.
  useEffect(() => {
    if (!open || !programme) { setDetail(null); return; }
    apiFetch<{ programme: Record<string, any> }>(`/api/programmes/${programme.id}`).then((r) => setDetail(r.programme)).catch(() => setDetail(null));
  }, [open, programme]);

  useEffect(() => {
    if (!open) return;
    if (!programme) { setF(blank); return; }
    const d = { ...programme, ...(detail ?? {}) };
    const s = (v: unknown) => (v == null ? "" : String(v));
    setF({
      name: d.name, degreeLevel: d.degreeLevel, language: s(d.language), intakes: d.intakes, summerDeadline: toDateInput(d.summerDeadline), winterDeadline: toDateInput(d.winterDeadline),
      website: s(d.website), published: d.published ?? true, markVerified: false,
      field: s(d.field), durationSemesters: s(d.durationSemesters), euSummerDeadline: toDateInput(d.euSummerDeadline), euWinterDeadline: toDateInput(d.euWinterDeadline),
      applicationRoute: s(d.applicationRoute), applicationUrl: s(d.applicationUrl), sourceUrl: s(d.sourceUrl), daadUrl: s(d.daadUrl),
      ieltsOverall: s(d.ieltsOverall), ieltsMinSection: s(d.ieltsMinSection), languageCertificates: s(d.languageCertificates), ectsRequired: s(d.ectsRequired),
      minGpaNote: s(d.minGpaNote), requiresGre: tri(d.requiresGre), workExperienceNote: s(d.workExperienceNote), requirements: s(d.requirements), remarks: s(d.remarks),
      admissionRestricted: tri(d.admissionRestricted), tuitionFree: tri(d.tuitionFree), tuitionFeeEur: s(d.tuitionFeeEur), semesterContributionEur: s(d.semesterContributionEur), tuitionNote: s(d.tuitionNote),
    });
  }, [open, programme, detail]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggleIntake = (v: string, on: boolean) => set("intakes", on ? [...f.intakes, v] : f.intakes.filter((i) => i !== v));
  const input = (k: keyof typeof f, label: string, opts: { id?: string; placeholder?: string; inputMode?: "numeric" | "decimal"; hint?: string; error?: string; type?: string } = {}) => (
    <Field label={label} htmlFor={`p-${k}`} hint={opts.hint} error={opts.error}>
      <input id={`p-${k}`} className="input" type={opts.type} inputMode={opts.inputMode} placeholder={opts.placeholder} value={f[k] as string} onChange={(e) => set(k, e.target.value as never)} />
    </Field>
  );

  return (
    <FormModal
      open={open}
      onClose={onClose}
      size="lg"
      title={programme ? "Edit programme" : "Add programme"}
      submitLabel={programme ? "Save changes" : "Add programme"}
      onSubmit={async () => {
        const payload = {
          ...f,
          durationSemesters: numOut(f.durationSemesters), ieltsOverall: numOut(f.ieltsOverall), ieltsMinSection: numOut(f.ieltsMinSection), ectsRequired: numOut(f.ectsRequired),
          tuitionFeeEur: numOut(f.tuitionFeeEur), semesterContributionEur: numOut(f.semesterContributionEur),
          requiresGre: triOut(f.requiresGre), admissionRestricted: triOut(f.admissionRestricted), tuitionFree: triOut(f.tuitionFree),
        };
        await apiFetch(programme ? `/api/programmes/${programme.id}` : `/api/universities/${universityId}/programmes`, jsonInit(programme ? "PATCH" : "POST", payload));
        onSaved();
      }}
    >
      {({ errors }) => (
        <>
          <div className={sectionCls}>
            <h3 className={h}>Programme</h3>
            <Field label="Programme name" htmlFor="p-name" required error={errors.name}>
              <input id="p-name" className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="M.Sc. Computer Science" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Degree" htmlFor="p-degree" required error={errors.degreeLevel}><Select id="p-degree" label="Degree" value={f.degreeLevel} onChange={(v) => set("degreeLevel", v)} options={DEGREE_OPTIONS} /></Field>
              {input("field", "Subject area", { placeholder: "Computer Science", error: errors.field })}
              {input("language", "Teaching language", { placeholder: "English", error: errors.language })}
              {input("durationSemesters", "Duration (semesters)", { inputMode: "numeric", placeholder: "4", error: errors.durationSemesters })}
            </div>
            <fieldset>
              <legend className="label">Intakes <span className="text-clay-500">*</span></legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle checked={f.intakes.includes("WINTER")} onChange={(v) => toggleIntake("WINTER", v)} label="Winter intake" />
                <Toggle checked={f.intakes.includes("SUMMER")} onChange={(v) => toggleIntake("SUMMER", v)} label="Summer intake" />
              </div>
              {errors.intakes && <p role="alert" className="mt-1 text-xs text-red-700">{errors.intakes}</p>}
            </fieldset>
          </div>

          <div className={sectionCls}>
            <h3 className={h}>Deadlines</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Winter: international (non-EU)" htmlFor="p-wd" error={errors.winterDeadline}><DatePicker id="p-wd" label="Winter deadline, non-EU" value={f.winterDeadline} onChange={(v) => set("winterDeadline", v)} /></Field>
              <Field label="Summer: international (non-EU)" htmlFor="p-sd" error={errors.summerDeadline}><DatePicker id="p-sd" label="Summer deadline, non-EU" value={f.summerDeadline} onChange={(v) => set("summerDeadline", v)} /></Field>
              <Field label="Winter: EU applicants" htmlFor="p-ewd" error={errors.euWinterDeadline}><DatePicker id="p-ewd" label="Winter deadline, EU" value={f.euWinterDeadline} onChange={(v) => set("euWinterDeadline", v)} /></Field>
              <Field label="Summer: EU applicants" htmlFor="p-esd" error={errors.euSummerDeadline}><DatePicker id="p-esd" label="Summer deadline, EU" value={f.euSummerDeadline} onChange={(v) => set("euSummerDeadline", v)} /></Field>
            </div>
          </div>

          <div className={sectionCls}>
            <h3 className={h}>Application</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Application method" htmlFor="p-route"><Select id="p-route" label="Application method" value={f.applicationRoute} onChange={(v) => set("applicationRoute", v)} options={[{ value: "", label: "Not specified" }, ...ROUTE_OPTIONS]} /></Field>
              {input("applicationUrl", "Application portal link", { type: "url", placeholder: "https://", error: errors.applicationUrl })}
              {input("website", "Official programme page", { type: "url", placeholder: "https://", error: errors.website })}
              {input("sourceUrl", "Page these details come from", { type: "url", placeholder: "https://", error: errors.sourceUrl })}
            </div>
            {input("daadUrl", "DAAD listing (reference link only)", { type: "url", placeholder: "https://www2.daad.de/…/detail/9965/", hint: "Only the link is stored. DAAD content itself is not copied.", error: errors.daadUrl })}
          </div>

          <div className={sectionCls}>
            <h3 className={h}>Language</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {input("ieltsOverall", "IELTS overall", { inputMode: "decimal", placeholder: "6.5", error: errors.ieltsOverall })}
              {input("ieltsMinSection", "IELTS minimum per section", { inputMode: "decimal", placeholder: "6.0", error: errors.ieltsMinSection })}
            </div>
            {input("languageCertificates", "Other accepted certificates", { placeholder: "TOEFL iBT 88, Cambridge C1", error: errors.languageCertificates })}
          </div>

          <div className={sectionCls}>
            <h3 className={h}>Admission requirements</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {input("ectsRequired", "ECTS in the subject", { inputMode: "numeric", placeholder: "60", error: errors.ectsRequired })}
              {input("minGpaNote", "Grade / GPA", { placeholder: "Min. 2.5 (German scale)", error: errors.minGpaNote })}
              <Field label="GRE" htmlFor="p-gre"><Select id="p-gre" label="GRE" value={f.requiresGre} onChange={(v) => set("requiresGre", v as Tri)} options={TRI} /></Field>
              {input("workExperienceNote", "Work experience", { placeholder: "None / 1 year", error: errors.workExperienceNote })}
              <Field label="Admission" htmlFor="p-nc"><Select id="p-nc" label="Admission restricted" value={f.admissionRestricted} onChange={(v) => set("admissionRestricted", v as Tri)} options={[{ value: "", label: "Not specified" }, { value: "yes", label: "Restricted (NC)" }, { value: "no", label: "NC-free" }]} /></Field>
            </div>
            <Field label="Further requirements" htmlFor="p-req" error={errors.requirements} hint="Documents, subject background, motivation letter…"><textarea id="p-req" className="input min-h-[110px]" maxLength={3000} value={f.requirements} onChange={(e) => set("requirements", e.target.value)} /></Field>
            <Field label="Remarks" htmlFor="p-rem" error={errors.remarks} hint="Eligibility notes and important conditions"><textarea id="p-rem" className="input min-h-[90px]" maxLength={2000} value={f.remarks} onChange={(e) => set("remarks", e.target.value)} /></Field>
          </div>

          <div className={sectionCls}>
            <h3 className={h}>Fees</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Tuition" htmlFor="p-tf"><Select id="p-tf" label="Tuition-free" value={f.tuitionFree} onChange={(v) => set("tuitionFree", v as Tri)} options={[{ value: "", label: "Not specified" }, { value: "yes", label: "Tuition-free" }, { value: "no", label: "Has tuition fees" }]} /></Field>
              {input("tuitionFeeEur", "Tuition (€ / semester)", { inputMode: "numeric", error: errors.tuitionFeeEur })}
              {input("semesterContributionEur", "Semester contribution (€)", { inputMode: "numeric", error: errors.semesterContributionEur })}
            </div>
            {input("tuitionNote", "Fee notes", { placeholder: "e.g. €1,500 per semester for non-EU students", error: errors.tuitionNote })}
          </div>

          <div className="space-y-2">
            <Toggle checked={f.markVerified} onChange={(v) => set("markVerified", v)} label="I checked these details on the official page" hint="Marks the deadlines as confirmed today" />
            <Toggle checked={f.published} onChange={(v) => set("published", v)} label="Visible to the public" />
          </div>
        </>
      )}
    </FormModal>
  );
}
