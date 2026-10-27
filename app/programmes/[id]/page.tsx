"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import RichText from "@/components/ui/RichText";
import { ErrorState, LoadingBlock, Notice } from "@/components/ui/States";
import { UniLogo } from "@/components/universities/UniversityCard";
import DeadlineChip from "@/components/universities/DeadlineChip";
import { BookmarkButton, CompareToggle } from "@/components/programmes/ProgrammeActions";
import { DegreeChip, Missing, RouteChip, TuitionCell } from "@/components/programmes/cells";
import { invalidateApi, useApi } from "@/hooks/useApi";
import { useSession } from "@/hooks/useSession";
import { apiFetch } from "@/lib/api";
import { fmtDay } from "@/lib/deadline";
import { INTAKE_LABELS } from "@/lib/marketplace";
import { NOT_SPECIFIED, ROUTE_LABELS, VERIFICATION_REQUIRED, type ProgrammeDetail } from "@/lib/programme-types";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "admission", label: "Admission requirements" },
  { id: "language", label: "Language requirements" },
  { id: "application", label: "Application & deadlines" },
  { id: "fees", label: "Fees" },
] as const;

const yesNo = (v: boolean | null, yes = "Yes", no = "No") => (v == null ? <Missing /> : v ? yes : no);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3.5 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6">
      <dt className="text-[13px] font-medium text-mute">{label}</dt>
      <dd className="min-w-0 break-words text-[14px]">{children}</dd>
    </div>
  );
}
const Rows = ({ children }: { children: React.ReactNode }) => <dl className="divide-y divide-line">{children}</dl>;
const text = (v: string | null | undefined) => (v ? v : <Missing />);

function ExternalLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return <Missing />;
  return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium underline underline-offset-2 hover:text-clay-600">{children} <Icon name="external" size={12} /></a>;
}

function LinkHealth({ status }: { status: number | null }) {
  if (status == null) return <span className="badge border-line-strong bg-paper-sunk text-ink-700">Not checked yet</span>;
  if (status >= 200 && status < 400) return <span className="badge border-emerald-300 bg-emerald-50 text-emerald-800">Links working</span>;
  return <span className="badge border-red-300 bg-red-50 text-red-800">A link needs checking</span>;
}

export default function ProgrammePage({ params }: { params: { id: string } }) {
  const { data, error, loading, reload } = useApi<{ programme: ProgrammeDetail }>(`/api/programmes/${params.id}`);
  const { role } = useSession();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  if (loading && !data) return <LoadingBlock rows={6} />;
  if (error) {
    return (
      <div className="card">
        <ErrorState error={error.status === 404 ? "We couldn't find that programme." : error} onRetry={error.status === 404 ? undefined : reload} />
        <div className="pb-6 text-center"><Link href="/programmes" className="btn-secondary">All programmes</Link></div>
      </div>
    );
  }
  const p = data?.programme;
  if (!p) return null;
  const verified = p.verification === "VERIFIED";
  const uni = p.university;

  async function refresh() {
    setRefreshing(true);
    setRefreshError("");
    try {
      await apiFetch(`/api/programmes/${p!.id}/refresh`, { method: "POST" });
      invalidateApi("/api/programmes");
      reload();
    } catch (e: any) {
      setRefreshError(e?.message || "Couldn't refresh.");
    } finally {
      setRefreshing(false);
    }
  }

  const deadlineRow = (label: string, season: "Winter" | "Summer", deadline: string | null, ok: boolean) =>
    deadline ? <Row label={label}><DeadlineChip season={season} deadline={deadline} verified={ok} /></Row> : <Row label={label}><Missing text={VERIFICATION_REQUIRED} /></Row>;

  return (
    <>
      <PageHeader title={p.name} />
      <Link href="/programmes" className="mb-3 inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-medium text-ink-700 hover:underline"><Icon name="arrowLeft" size={14} /> All programmes</Link>

      <section className="card mb-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <UniLogo u={uni} size={64} />
            <div className="min-w-0">
              <h2 className="text-[20px] font-semibold leading-snug tracking-tight sm:text-[24px]">{p.name}</h2>
              <p className="mt-1 text-[14px] text-mute">
                <Link href={`/universities/${uni.slug}`} className="font-medium text-ink-800 underline-offset-2 hover:underline">{uni.name}</Link> · {uni.city}{uni.state ? `, ${uni.state}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <DegreeChip level={p.degreeLevel} />
                {p.language && <span className="badge border-line-strong bg-paper-sunk text-ink-700">{p.language}</span>}
                {p.field && <span className="badge border-line-strong bg-paper-sunk text-ink-700">{p.field}</span>}
                {p.durationSemesters && <span className="badge border-line-strong bg-paper-sunk text-ink-700">{p.durationSemesters} semesters</span>}
                {p.intakes.map((i) => <span key={i} className="badge border-line-strong bg-paper-sunk text-ink-700">{INTAKE_LABELS[i]} intake</span>)}
                <span className={`badge ${verified ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"}`}>{verified ? <><Icon name="check" size={11} /> Details confirmed</> : "Not fully confirmed"}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <BookmarkButton id={p.id} label />
            <CompareToggle id={p.id} label />
            {p.applicationUrl && <a href={p.applicationUrl} target="_blank" rel="noopener noreferrer" className="btn-gold !min-h-[40px]">Apply <Icon name="external" size={13} /></a>}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card min-w-0">
          <div role="tablist" aria-label="Programme details" className="flex overflow-x-auto border-b border-line px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`relative min-h-[48px] shrink-0 px-4 text-[13px] font-semibold transition-colors ${tab === t.id ? "text-ink-900" : "text-mute hover:text-ink-900"}`}>
                {t.label}
                {tab === t.id && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-ink-900" />}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="px-5 pb-3 pt-1 sm:px-6">
            {tab === "overview" && (
              <Rows>
                <Row label="Degree">{<DegreeChip level={p.degreeLevel} />}</Row>
                <Row label="Subject area">{text(p.field)}</Row>
                <Row label="Teaching language">{text(p.language)}</Row>
                <Row label="Duration">{p.durationSemesters ? `${p.durationSemesters} semesters` : <Missing />}</Row>
                <Row label="Intakes">{p.intakes.length ? p.intakes.map((i) => INTAKE_LABELS[i]).join(" and ") : <Missing />}</Row>
                <Row label="Admission">{p.admissionRestricted == null ? <Missing /> : p.admissionRestricted ? "Restricted (NC / selection)" : "NC-free (no admission restriction)"}</Row>
                <Row label="Remarks">{p.remarks ? <RichText value={p.remarks} /> : <Missing />}</Row>
              </Rows>
            )}
            {tab === "admission" && (
              <Rows>
                <Row label="ECTS required">{p.ectsRequired != null ? `${p.ectsRequired} ECTS` : <Missing />}</Row>
                <Row label="Grade / GPA">{text(p.minGpaNote)}</Row>
                <Row label="GRE">{yesNo(p.requiresGre, "Required", "Not required")}</Row>
                <Row label="Work experience">{text(p.workExperienceNote)}</Row>
                <Row label="Further requirements">{p.requirements ? <RichText value={p.requirements} /> : <Missing />}</Row>
              </Rows>
            )}
            {tab === "language" && (
              <Rows>
                <Row label="Teaching language">{text(p.language)}</Row>
                <Row label="IELTS overall">{p.ieltsOverall != null ? <span className="font-semibold">{p.ieltsOverall.toFixed(1)}</span> : <Missing />}</Row>
                <Row label="IELTS minimum per section">{p.ieltsMinSection != null ? p.ieltsMinSection.toFixed(1) : <Missing />}</Row>
                <Row label="Other accepted certificates">{text(p.languageCertificates)}</Row>
              </Rows>
            )}
            {tab === "application" && (
              <Rows>
                <Row label="Application method"><RouteChip route={p.applicationRoute} /></Row>
                <Row label="Application portal"><ExternalLink href={p.applicationUrl}>{p.applicationUrl ? p.applicationUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : ""}</ExternalLink></Row>
                {p.intakes.includes("WINTER") && deadlineRow("Winter: international (non-EU)", "Winter", p.winterDeadline, verified)}
                {p.intakes.includes("WINTER") && deadlineRow("Winter: EU applicants", "Winter", p.euWinterDeadline, verified)}
                {p.intakes.includes("SUMMER") && deadlineRow("Summer: international (non-EU)", "Summer", p.summerDeadline, verified)}
                {p.intakes.includes("SUMMER") && deadlineRow("Summer: EU applicants", "Summer", p.euSummerDeadline, verified)}
                <Row label="Deadlines confirmed">{p.deadlinesVerifiedAt ? fmtDay(p.deadlinesVerifiedAt) : <Missing text={VERIFICATION_REQUIRED} />}</Row>
              </Rows>
            )}
            {tab === "fees" && (
              <Rows>
                <Row label="Tuition"><TuitionCell p={p} /></Row>
                <Row label="Semester contribution">{p.semesterContributionEur != null ? `€${p.semesterContributionEur.toLocaleString("en-US")} per semester` : <Missing />}</Row>
                <Row label="Notes">{text(p.tuitionNote)}</Row>
              </Rows>
            )}
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="card p-5">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-mute">Sources &amp; verification</h3>
            <Rows>
              <Row label="DAAD listing"><ExternalLink href={p.daadUrl}>View on DAAD</ExternalLink></Row>
              <Row label="Official programme page"><ExternalLink href={p.website}>{uni.name}</ExternalLink></Row>
              <Row label="Application portal"><ExternalLink href={p.applicationUrl}>Open portal</ExternalLink></Row>
              <Row label="Source of these details"><ExternalLink href={p.sourceUrl}>Source page</ExternalLink></Row>
              <Row label="Last checked">{p.lastCheckedAt ? fmtDay(p.lastCheckedAt) : <Missing text={VERIFICATION_REQUIRED} />}</Row>
              <Row label="Link status"><LinkHealth status={p.linkStatus} /></Row>
            </Rows>
            {role === "admin" && (
              <div className="mt-3 space-y-2 border-t border-line pt-3">
                <button type="button" onClick={refresh} disabled={refreshing} className="btn-secondary w-full"><Icon name="clock" size={14} /> {refreshing ? "Checking links…" : "Refresh link check"}</button>
                {refreshError && <Notice tone="error">{refreshError}</Notice>}
                <Link href="/admin/universities" className="btn-secondary w-full">Edit in admin</Link>
              </div>
            )}
          </section>
          <p className="px-1 text-xs leading-relaxed text-mute">
            Always check the official page and the application portal before you apply. Details not published or not yet confirmed are shown as “{NOT_SPECIFIED}” or “{VERIFICATION_REQUIRED}”, never guessed.
          </p>
        </aside>
      </div>
    </>
  );
}
