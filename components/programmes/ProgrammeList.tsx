"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { UniLogo } from "@/components/universities/UniversityCard";
import { BookmarkButton, CompareToggle } from "./ProgrammeActions";
import { DeadlineCell, DegreeChip, IeltsCell, RouteChip, TuitionCell, UpdatedCell } from "./cells";
import type { ProgrammeRow } from "@/lib/programme-types";

type SortProps = { sort: string; dir: string; onSort: (key: string) => void };

function Th({ label, sortKey, sort, dir, onSort, className = "" }: { label: string; sortKey?: string } & SortProps & { className?: string }) {
  const active = !!sortKey && sort === sortKey;
  return (
    <th scope="col" aria-sort={active ? (dir === "desc" ? "descending" : "ascending") : undefined} className={`px-4 py-3 font-semibold ${className}`}>
      {sortKey ? (
        <button type="button" onClick={() => onSort(sortKey)} className="inline-flex min-h-[28px] items-center gap-1 uppercase tracking-wider hover:text-ink-900">
          {label}
          {active && <Icon name={dir === "desc" ? "chevronDown" : "chevronUp"} size={13} />}
        </button>
      ) : label}
    </th>
  );
}

/** Desktop: full-width sortable table. Clicking a row opens the programme; the heart and compare buttons act without leaving the list. */
export function ProgrammeTable({ rows, ...sortProps }: { rows: ProgrammeRow[] } & SortProps) {
  const router = useRouter();
  return (
    <div className="card hidden overflow-x-auto md:block">
      <table className="w-full min-w-[960px] text-[13px]">
        <caption className="sr-only">Programmes</caption>
        <thead className="border-b border-line bg-paper-sunk/60 text-left text-[11px] uppercase tracking-wider text-mute">
          <tr>
            <Th label="Programme" sortKey="name" {...sortProps} className="w-[28%]" />
            <Th label="University" sortKey="university" {...sortProps} className="w-[22%]" />
            <Th label="IELTS" sortKey="ielts" {...sortProps} />
            <Th label="Deadline (non-EU)" sortKey="deadline" {...sortProps} />
            <Th label="Apply via" {...sortProps} />
            <Th label="Tuition" {...sortProps} />
            <Th label="Updated" sortKey="updated" {...sortProps} />
            <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((p) => (
            <tr key={p.id} onClick={() => router.push(`/programmes/${p.id}`)} className="cursor-pointer align-top transition-colors hover:bg-paper-sunk/50">
              <td className="px-4 py-3.5">
                <Link href={`/programmes/${p.id}`} onClick={(e) => e.stopPropagation()} className="text-[14px] font-semibold leading-snug hover:underline">{p.name}</Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><DegreeChip level={p.degreeLevel} />{p.language && <span className="text-xs text-mute">{p.language}</span>}{p.field && <span className="text-xs text-mute">· {p.field}</span>}</div>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <UniLogo u={p.university} size={32} />
                  <div className="min-w-0"><p className="font-medium leading-snug">{p.university.name}</p><p className="text-xs text-mute">{p.university.city}</p></div>
                </div>
              </td>
              <td className="px-4 py-3.5"><IeltsCell value={p.ieltsOverall} /></td>
              <td className="px-4 py-3.5"><DeadlineCell p={p} /></td>
              <td className="px-4 py-3.5"><RouteChip route={p.applicationRoute} /></td>
              <td className="px-4 py-3.5"><TuitionCell p={p} /></td>
              <td className="px-4 py-3.5"><UpdatedCell p={p} /></td>
              <td className="px-3 py-3"><div className="flex items-center gap-1"><BookmarkButton id={p.id} /><CompareToggle id={p.id} /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Phones: one card per programme with the facts that matter most. */
export function ProgrammeCards({ rows }: { rows: ProgrammeRow[] }) {
  return (
    <ul className="space-y-3 md:hidden">
      {rows.map((p) => (
        <li key={p.id} className="card relative p-4">
          <div className="flex items-start gap-3">
            <UniLogo u={p.university} size={40} />
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold leading-snug">
                <Link href={`/programmes/${p.id}`} className="after:absolute after:inset-0">{p.name}</Link>
              </h2>
              <p className="mt-0.5 text-xs text-mute">{p.university.name} · {p.university.city}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <DegreeChip level={p.degreeLevel} />
            {p.language && <span className="badge border-line-strong bg-paper-sunk text-ink-700">{p.language}</span>}
            <RouteChip route={p.applicationRoute} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-line pt-3 text-[13px]">
            <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-mute">IELTS</dt><dd className="mt-1"><IeltsCell value={p.ieltsOverall} /></dd></div>
            <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-mute">Tuition</dt><dd className="mt-1"><TuitionCell p={p} /></dd></div>
            <div className="col-span-2"><dt className="text-[11px] font-semibold uppercase tracking-wider text-mute">Deadline (non-EU)</dt><dd className="mt-1"><DeadlineCell p={p} /></dd></div>
          </dl>
          <div className="relative z-10 mt-3 flex items-center justify-between border-t border-line pt-2">
            <UpdatedCell p={p} />
            <div className="flex items-center gap-1"><BookmarkButton id={p.id} /><CompareToggle id={p.id} /></div>
          </div>
        </li>
      ))}
    </ul>
  );
}
