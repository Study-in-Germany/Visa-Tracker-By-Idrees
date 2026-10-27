"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { UniLogo } from "@/components/universities/UniversityCard";
import { Missing, RouteChip, TuitionCell, DeadlineCell } from "@/components/programmes/cells";
import { CompareToggle } from "@/components/programmes/ProgrammeActions";
import { useApi } from "@/hooks/useApi";
import { fmtDay } from "@/lib/deadline";
import { DEGREE_LABELS } from "@/lib/marketplace";
import { VERIFICATION_REQUIRED, type ProgrammeDetail, type ProgrammeList } from "@/lib/programme-types";

type Row = { label: string; cell: (p: ProgrammeDetail) => React.ReactNode };

const num = (v: number | null, suffix = "") => (v == null ? <Missing /> : `${v}${suffix}`);
const txt = (v: string | null) => (v ? v : <Missing />);
const day = (v: string | null) => (v ? fmtDay(v) : <Missing text={VERIFICATION_REQUIRED} />);

const SECTIONS: { title: string; rows: Row[] }[] = [
  { title: "Overview", rows: [
    { label: "Degree", cell: (p) => DEGREE_LABELS[p.degreeLevel] },
    { label: "Subject area", cell: (p) => txt(p.field) },
    { label: "Teaching language", cell: (p) => txt(p.language) },
    { label: "Duration", cell: (p) => num(p.durationSemesters, " semesters") },
    { label: "Intakes", cell: (p) => p.intakes.map((i) => (i === "WINTER" ? "Winter" : "Summer")).join(", ") || <Missing /> },
    { label: "Admission", cell: (p) => (p.admissionRestricted == null ? <Missing /> : p.admissionRestricted ? "Restricted" : "NC-free") },
  ] },
  { title: "Requirements", rows: [
    { label: "ECTS required", cell: (p) => num(p.ectsRequired, " ECTS") },
    { label: "Grade / GPA", cell: (p) => txt(p.minGpaNote) },
    { label: "GRE", cell: (p) => (p.requiresGre == null ? <Missing /> : p.requiresGre ? "Required" : "Not required") },
    { label: "Work experience", cell: (p) => txt(p.workExperienceNote) },
  ] },
  { title: "Language", rows: [
    { label: "IELTS overall", cell: (p) => (p.ieltsOverall == null ? <Missing /> : <b>{p.ieltsOverall.toFixed(1)}</b>) },
    { label: "IELTS per section", cell: (p) => (p.ieltsMinSection == null ? <Missing /> : p.ieltsMinSection.toFixed(1)) },
    { label: "Other certificates", cell: (p) => txt(p.languageCertificates) },
  ] },
  { title: "Application", rows: [
    { label: "Apply via", cell: (p) => <RouteChip route={p.applicationRoute} /> },
    { label: "Deadlines (non-EU)", cell: (p) => <DeadlineCell p={p} /> },
    { label: "Winter, EU", cell: (p) => day(p.euWinterDeadline) },
    { label: "Summer, EU", cell: (p) => day(p.euSummerDeadline) },
  ] },
  { title: "Fees", rows: [
    { label: "Tuition", cell: (p) => <TuitionCell p={p} /> },
    { label: "Semester contribution", cell: (p) => num(p.semesterContributionEur, " € / semester") },
  ] },
  { title: "Verification", rows: [
    { label: "Details confirmed", cell: (p) => (p.verification === "VERIFIED" ? "Yes" : <Missing text="Not yet" />) },
    { label: "Last checked", cell: (p) => day(p.lastCheckedAt) },
  ] },
];

function Compare() {
  const ids = (useSearchParams().get("ids") || "").split(",").filter(Boolean).slice(0, 3);
  const { data, error, loading, reload } = useApi<ProgrammeList>(ids.length ? `/api/programmes?ids=${ids.join(",")}&pageSize=3` : null);
  // The list endpoint returns summaries; fetch each programme's full details for the comparison.
  const details = useApi<{ programmes: ProgrammeDetail[] }>(null);
  void details;
  return <Table ids={ids} listLoading={loading} listError={error} reload={reload} order={data?.items.map((i) => i.id) ?? ids} />;
}

function Table({ ids, listLoading, listError, reload, order }: { ids: string[]; listLoading: boolean; listError: Error | null; reload: () => void; order: string[] }) {
  const a = useApi<{ programme: ProgrammeDetail }>(order[0] ? `/api/programmes/${order[0]}` : null);
  const b = useApi<{ programme: ProgrammeDetail }>(order[1] ? `/api/programmes/${order[1]}` : null);
  const c = useApi<{ programme: ProgrammeDetail }>(order[2] ? `/api/programmes/${order[2]}` : null);
  const programmes = [a, b, c].map((r) => r.data?.programme).filter(Boolean) as ProgrammeDetail[];

  if (ids.length < 2) return <div className="card"><EmptyState title="Pick at least two programmes" hint="Use the compare button on programmes in the list." action={<Link href="/programmes" className="btn-primary mt-1">Browse programmes</Link>} /></div>;
  if (listError) return <div className="card"><ErrorState error={listError} onRetry={reload} /></div>;
  if ((listLoading || [a, b, c].some((r) => r.loading)) && programmes.length === 0) return <LoadingBlock rows={8} />;
  if (programmes.length === 0) return <div className="card"><EmptyState title="Those programmes are no longer available" action={<Link href="/programmes" className="btn-secondary mt-1">Back to programmes</Link>} /></div>;

  const cols = `180px repeat(${programmes.length}, minmax(220px, 1fr))`;
  return (
    <div className="card overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid border-b border-line" style={{ gridTemplateColumns: cols }}>
          <div className="p-4" />
          {programmes.map((p) => (
            <div key={p.id} className="border-l border-line p-4">
              <div className="flex items-start gap-3">
                <UniLogo u={p.university} size={36} />
                <div className="min-w-0">
                  <Link href={`/programmes/${p.id}`} className="text-[14px] font-semibold leading-snug hover:underline">{p.name}</Link>
                  <p className="mt-0.5 text-xs text-mute">{p.university.name} · {p.university.city}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CompareToggle id={p.id} label />
                {p.applicationUrl && <a href={p.applicationUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary !min-h-[40px]">Apply <Icon name="external" size={12} /></a>}
              </div>
            </div>
          ))}
        </div>
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <div className="bg-paper-sunk/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-mute">{s.title}</div>
            {s.rows.map((r) => (
              <div key={r.label} className="grid border-t border-line text-[13px]" style={{ gridTemplateColumns: cols }}>
                <div className="p-4 font-medium text-mute">{r.label}</div>
                {programmes.map((p) => <div key={p.id} className="min-w-0 break-words border-l border-line p-4">{r.cell(p)}</div>)}
              </div>
            ))}
          </div>
        ))}
        <div className="grid border-t border-line text-[13px]" style={{ gridTemplateColumns: cols }}>
          <div className="p-4 font-medium text-mute">Sources</div>
          {programmes.map((p) => (
            <div key={p.id} className="space-y-1.5 border-l border-line p-4">
              {p.daadUrl ? <a href={p.daadUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline underline-offset-2">DAAD listing <Icon name="external" size={11} /></a> : null}
              {p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline underline-offset-2">Official page <Icon name="external" size={11} /></a> : null}
              {!p.daadUrl && !p.website && <Missing />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <>
      <PageHeader title="Compare programmes" />
      <Link href="/programmes" className="mb-3 inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-medium text-ink-700 hover:underline"><Icon name="arrowLeft" size={14} /> All programmes</Link>
      <Suspense fallback={<LoadingBlock rows={8} />}>
        <Compare />
      </Suspense>
    </>
  );
}
