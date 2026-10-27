"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { ProgrammeRow, UniLogo } from "@/components/universities/UniversityCard";
import { useApi } from "@/hooks/useApi";
import { fmtDay } from "@/lib/deadline";
import { DEGREE_LABELS, institutionChip, institutionLabel, type UniversityDto } from "@/lib/marketplace";

const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");

function Stat({ icon, label, value }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper-raised p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-paper-sunk text-ink-700"><Icon name={icon} size={18} /></span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">{label}</p>
        <p className="truncate text-[14px] font-semibold">{value}</p>
      </div>
    </div>
  );
}

export default function UniversityPage({ params }: { params: { slug: string } }) {
  const { data, error, loading, reload } = useApi<{ university: UniversityDto }>(`/api/universities/${params.slug}`);
  const [degree, setDegree] = useState("");

  if (loading && !data) return <LoadingBlock rows={5} />;
  if (error) {
    return (
      <div className="card">
        <ErrorState error={error.status === 404 ? "We couldn't find that university." : error} onRetry={error.status === 404 ? undefined : reload} />
        <div className="pb-6 text-center"><Link href="/universities" className="btn-secondary">All universities</Link></div>
      </div>
    );
  }
  const u = data?.university;
  if (!u) return null;

  const degrees = Array.from(new Set(u.programmes.map((p) => p.degreeLevel)));
  const programmes = u.programmes.filter((p) => !degree || p.degreeLevel === degree);
  const place = [u.city, u.state].filter((v) => v && v !== "—").join(", ");

  return (
    <>
      <PageHeader title={u.name} />
      <Link href="/universities" className="mb-3 inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-medium text-ink-700 hover:underline">
        <Icon name="arrowLeft" size={14} /> All universities
      </Link>

      <section className="card mb-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <UniLogo u={u} size={80} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] font-semibold leading-snug tracking-tight sm:text-[24px]">{u.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-[14px] text-mute"><Icon name="pin" size={14} /> {place || "Germany"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {u.institutionType && <span className={`badge font-medium ${institutionChip(u.institutionType)}`}>{institutionLabel(u.institutionType)}</span>}
              {u.sponsorship && <span className="badge border-line-strong bg-paper-sunk text-ink-700 capitalize">{u.sponsorship}</span>}
              {u.doctorateRight && <span className="badge border-emerald-300 bg-emerald-50 text-emerald-800">Can award PhDs</span>}
            </div>
          </div>
          <a href={u.website} target="_blank" rel="noopener noreferrer" className="btn-primary !min-h-[46px] sm:!px-5">
            Visit {host(u.website)} <Icon name="external" size={14} />
          </a>
        </div>
        {u.description && <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-ink-700">{u.description}</p>}
      </section>

      <section aria-label="Key facts" className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon="users" label="Students" value={u.studentCount ? u.studentCount.toLocaleString("en-US") : "Not listed"} />
        <Stat icon="calendar" label="Founded" value={u.foundedYear ? String(u.foundedYear) : "Not listed"} />
        <Stat icon="school" label="Programmes listed" value={String(u.programmeCount)} />
        <Stat icon="shield" label="Details checked" value={u.lastVerifiedAt ? fmtDay(u.lastVerifiedAt) : "Not yet"} />
      </section>

      <section aria-labelledby="programmes-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="programmes-h" className="text-[16px] font-semibold">Programmes &amp; deadlines</h2>
          {degrees.length > 1 && (
            <div role="group" aria-label="Degree" className="flex gap-1.5">
              {["", ...degrees].map((d) => (
                <button key={d || "all"} type="button" aria-pressed={degree === d} onClick={() => setDegree(d)} className={`min-h-[36px] rounded-full border px-3.5 text-[13px] font-medium ${degree === d ? "border-ink-800 bg-ink-800 text-paper-raised" : "border-line-strong bg-paper-raised text-ink-800 hover:bg-paper-sunk"}`}>
                  {d ? DEGREE_LABELS[d] : "All"}
                </button>
              ))}
            </div>
          )}
        </div>
        {programmes.length === 0 ? (
          <p className="rounded-xl border border-line bg-paper-raised px-4 py-3 text-[13px] text-mute">
            No programmes listed yet. See{" "}
            <a href={u.website} target="_blank" rel="noopener noreferrer" className="font-medium text-ink-800 underline underline-offset-2">{host(u.website)}</a> for courses and deadlines.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {programmes.map((p) => (
              <div key={p.id} className="card p-4"><ul><ProgrammeRow p={p} /></ul></div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-8 text-xs text-mute">
        Institution data: {u.source ?? "official sources"}. Deadlines are only marked confirmed once checked against the university&apos;s own page, so always verify before you apply.
      </p>
    </>
  );
}
