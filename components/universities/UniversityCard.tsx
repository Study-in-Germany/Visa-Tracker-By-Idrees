"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import DeadlineChip from "./DeadlineChip";
import { fmtDay } from "@/lib/deadline";
import { DEGREE_LABELS, institutionChip, institutionLabel, type ProgrammeDto, type UniversityDto } from "@/lib/marketplace";

const COLLAPSED_COUNT = 2;
const host = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");
const place = (u: Pick<UniversityDto, "city" | "state">) => [u.city, u.state].filter((v) => v && v !== "—").join(", ");

/** Logo from Wikimedia Commons when we have one, otherwise the university's initials. */
export function UniLogo({ u, size = 48 }: { u: Pick<UniversityDto, "name" | "shortName" | "logoUrl">; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = (u.shortName || u.name).replace(/[^\p{L}\s]/gu, "").split(/\s+/).filter((w) => w.length > 2 || w === w.toUpperCase()).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "U";
  const box = { width: size, height: size };
  if (u.logoUrl && !failed) {
    return (
      <span style={box} className="grid shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white p-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={u.logoUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="max-h-full max-w-full object-contain" />
      </span>
    );
  }
  return <span style={box} aria-hidden="true" className="grid shrink-0 place-items-center rounded-xl bg-ink-100 text-[14px] font-semibold text-ink-700">{initials}</span>;
}

export function ProgrammeRow({ p, actions }: { p: ProgrammeDto; actions?: React.ReactNode }) {
  const verified = p.verification === "VERIFIED";
  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-snug">{p.name}</p>
          <p className="text-xs text-mute">{[DEGREE_LABELS[p.degreeLevel], p.language, p.applicationMethod].filter(Boolean).join(" · ")}</p>
        </div>
        {actions && <div className="flex shrink-0 gap-1">{actions}</div>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {p.intakes.includes("WINTER") && <DeadlineChip season="Winter" deadline={p.winterDeadline} verified={verified} />}
        {p.intakes.includes("SUMMER") && <DeadlineChip season="Summer" deadline={p.summerDeadline} verified={verified} />}
      </div>
      {p.tuitionNote && <p className="text-xs text-ink-700">Tuition: {p.tuitionNote}</p>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {p.applicationUrl && <a href={p.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[32px] items-center gap-1 font-semibold text-clay-600 hover:underline">Apply <Icon name="external" size={11} /></a>}
        {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[32px] items-center gap-1 font-medium text-ink-700 hover:underline">Programme page <Icon name="external" size={11} /></a>}
        {verified && p.deadlinesVerifiedAt ? (
          <span className="inline-flex items-center gap-1 text-emerald-700"><Icon name="check" size={12} /> Confirmed {fmtDay(p.deadlinesVerifiedAt)}{p.sourceUrl && <> · <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">source</a></>}</span>
        ) : (
          <span className="text-mute">Deadlines not confirmed. Check the official site.</span>
        )}
      </div>
    </li>
  );
}

/** Quick facts as chips: type, size, founding year, doctorate right, programme count. */
function Facts({ u }: { u: UniversityDto }) {
  const chip = "badge border-line-strong bg-paper-sunk text-ink-700";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {u.institutionType && <span className={`badge font-medium ${institutionChip(u.institutionType)}`}>{institutionLabel(u.institutionType)}</span>}
      {u.studentCount ? <span className={chip}><Icon name="users" size={11} /> {u.studentCount.toLocaleString("en-US")}</span> : null}
      {u.foundedYear ? <span className={chip}>Est. {u.foundedYear}</span> : null}
      {u.doctorateRight && <span className="badge border-emerald-300 bg-emerald-50 text-emerald-800">PhD</span>}
      {u.programmeCount > 0 && <span className="badge border-clay-400/40 bg-clay-50 text-clay-600">{u.programmeCount} programme{u.programmeCount === 1 ? "" : "s"}</span>}
    </div>
  );
}

/** Grid card. Cards in a row share one height; the footer always sits at the bottom. */
export default function UniversityCard({ u, actions, programmeActions }: { u: UniversityDto; actions?: React.ReactNode; programmeActions?: (p: ProgrammeDto) => React.ReactNode }) {
  const [all, setAll] = useState(false);
  const shown = all ? u.programmes : u.programmes.slice(0, COLLAPSED_COUNT);
  const hidden = u.programmes.length - shown.length;

  return (
    <article className="card relative flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      <header className="flex items-start gap-3">
        <UniLogo u={u} />
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-[14px] font-semibold leading-snug" title={u.name}>
            {/* stretched link: the whole card opens the detail page, while buttons inside stay clickable */}
            <Link href={`/universities/${u.slug}`} className="after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-clay-500">{u.name}</Link>
          </h2>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-mute">
            <Icon name="pin" size={12} className="shrink-0" />
            <span className="truncate">{place(u) || "Germany"}</span>
            {!u.published && <span className="badge ml-1 border-line-strong bg-paper-sunk text-ink-700">Hidden</span>}
          </p>
        </div>
        {actions && <div className="relative z-10 flex shrink-0 items-center gap-1">{actions}</div>}
      </header>

      <Facts u={u} />
      {u.description && <p className="text-[13px] text-ink-700">{u.description}</p>}

      {u.programmes.length > 0 && (
        <ul className="divide-y divide-line border-t border-line pt-3">
          {shown.map((p) => <ProgrammeRow key={p.id} p={p} actions={programmeActions?.(p)} />)}
        </ul>
      )}
      {u.programmes.length > COLLAPSED_COUNT && (
        <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all} className="relative z-10 inline-flex min-h-[36px] items-center gap-1 self-start text-xs font-semibold text-clay-600 hover:underline">
          {all ? "Show fewer" : `Show ${hidden} more programme${hidden === 1 ? "" : "s"}`}
          <Icon name={all ? "chevronUp" : "chevronDown"} size={13} />
        </button>
      )}

      <a href={u.website} target="_blank" rel="noopener noreferrer" className="relative z-10 mt-auto inline-flex min-h-[40px] items-center justify-between gap-2 rounded-lg border border-line-strong px-3 text-[13px] font-medium text-ink-800 transition-colors hover:bg-paper-sunk">
        <span className="truncate">{host(u.website)}</span>
        <Icon name="external" size={13} className="shrink-0" />
      </a>
    </article>
  );
}

/** Compact one-line row for the list view. Programmes (when there are any) expand underneath. */
export function UniversityRow({ u, actions, programmeActions }: { u: UniversityDto; actions?: React.ReactNode; programmeActions?: (p: ProgrammeDto) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const has = u.programmes.length > 0;
  return (
    <li className="card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <UniLogo u={u} size={40} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[14px] font-semibold" title={u.name}><Link href={`/universities/${u.slug}`} className="hover:underline">{u.name}</Link></h2>
          <p className="flex items-center gap-1 truncate text-xs text-mute"><Icon name="pin" size={11} className="shrink-0" /> {place(u) || "Germany"}</p>
        </div>
        <div className="hidden min-w-0 items-center gap-1.5 md:flex">
          {u.institutionType && <span className={`badge font-medium ${institutionChip(u.institutionType)}`}>{institutionLabel(u.institutionType)}</span>}
          {u.studentCount ? <span className="badge border-line-strong bg-paper-sunk text-ink-700"><Icon name="users" size={11} /> {u.studentCount.toLocaleString("en-US")}</span> : null}
        </div>
        {actions}
        {has && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-full border border-clay-400/40 bg-clay-50 px-3 text-xs font-semibold text-clay-600">
            {u.programmes.length} <span className="hidden sm:inline">programme{u.programmes.length === 1 ? "" : "s"}</span> <Icon name={open ? "chevronUp" : "chevronDown"} size={12} />
          </button>
        )}
        <a href={u.website} target="_blank" rel="noopener noreferrer" aria-label={`${u.name} website`} title={host(u.website)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line-strong text-ink-700 hover:bg-paper-sunk">
          <Icon name="external" size={15} />
        </a>
      </div>
      {open && has && <ul className="divide-y divide-line border-t border-line bg-paper-sunk/30 px-4 py-3">{u.programmes.map((p) => <ProgrammeRow key={p.id} p={p} actions={programmeActions?.(p)} />)}</ul>}
    </li>
  );
}
