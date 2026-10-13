"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import Icon from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { ErrorState, LoadingBlock } from "@/components/ui/States";
import StatusBadge from "@/components/StatusBadge";
import { useApi } from "@/hooks/useApi";
import { fmtDate } from "@/lib/format";
import { APPROVAL_COLORS, APPROVAL_LABELS, ACTIVE_STATUSES, JOURNEY_STAGES } from "@/lib/constants";

const DAY = 86_400_000;
const daysBetween = (a: string, b: string | Date) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY));

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0">
      <dt className="shrink-0 text-mute">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium">{value || <span className="font-normal text-mute">—</span>}</dd>
    </div>
  );
}

export default function MyJourneyPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<{ applicant: any }>("/api/applicant/me");

  useEffect(() => {
    if (error?.status === 401) router.push("/login");
  }, [error, router]);

  if (loading && !data) return <LoadingBlock />;
  if (error) return <div className="card"><ErrorState error={error} onRetry={reload} /></div>;
  const a = data?.applicant;
  if (!a) return null;

  const stages = JOURNEY_STAGES.map((s) => ({ ...s, date: a[s.key] as string | null }));
  const done = stages.filter((s) => s.date).length;
  const nextIdx = stages.findIndex((s) => !s.date);
  const active = ACTIVE_STATUSES.includes(a.visaStatus);
  const waitingDays = a.waitingListDate ? daysBetween(a.waitingListDate, active ? new Date() : a.decisionDate || new Date()) : null;
  const lastUpdateDays = daysBetween(a.updatedAt, new Date());

  // days since the previous recorded stage
  let prev: string | null = null;
  const gaps = stages.map((s) => {
    if (!s.date) return null;
    const gap = prev ? daysBetween(prev, s.date) : null;
    prev = s.date;
    return gap;
  });

  return (
    <>
      <PageHeader
        eyebrow={a.publicId}
        title={a.name}
        description={[a.university, a.consulate && `${a.consulate} embassy`].filter(Boolean).join(" · ")}
        actions={
          <>
            <StatusBadge status={a.visaStatus} />
            <Link href="/dashboard/information" className="btn-secondary !min-h-[32px]"><Icon name="edit" size={13} /> Edit details</Link>
          </>
        }
      />

      <section aria-label="Summary" className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="clock" tone="warn" label={active ? "Days waiting" : "Days in process"} value={waitingDays} hint={a.waitingListDate ? `since ${fmtDate(a.waitingListDate)}` : "add your waiting-list date"} />
        <StatCard icon="checkCircle" tone="good" label="Stages recorded" value={done} hint={`of ${stages.length}`} />
        <StatCard icon="send" tone="sage" label="Status updates" value={a.history?.length ?? 0} />
        <StatCard icon="edit" tone="neutral" label="Last edited (days ago)" value={lastUpdateDays} />
      </section>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title="Journey"
          description={nextIdx >= 0 ? `Next to record: ${stages[nextIdx].label}` : "Every stage is recorded"}
          actions={<span className="rounded-md bg-paper-sunk px-2 py-1 text-xs font-semibold tabular-nums">{done}/{stages.length}</span>}
        >
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-paper-sunk">
            <div className="h-full rounded-full bg-clay-500 transition-all" style={{ width: `${(done / stages.length) * 100}%` }} />
          </div>

          <ol className="space-y-1.5">
            {stages.map((s, i) => {
              const isNext = i === nextIdx;
              return (
                <li
                  key={s.key}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                    s.date ? "border-line bg-paper-raised" : isNext ? "border-clay-400/50 bg-clay-50/60" : "border-dashed border-line-strong bg-transparent"
                  }`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${s.date ? "bg-emerald-600 text-white" : isNext ? "bg-clay-500 text-white" : "bg-paper-sunk text-mute"}`}>
                    {s.date ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[13px] ${s.date ? "font-medium" : isNext ? "font-medium text-ink-900" : "text-mute"}`}>{s.label}</span>
                  <span className="flex shrink-0 items-center gap-2 text-right">
                    {gaps[i] !== null && gaps[i]! > 0 && <span className="hidden rounded bg-paper-sunk px-1.5 py-0.5 text-[11px] tabular-nums text-mute sm:inline">+{gaps[i]} d</span>}
                    <span className={`text-[13px] tabular-nums ${s.date ? "" : "text-mute"}`}>{s.date ? fmtDate(s.date) : isNext ? "Next" : "Not yet"}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>

        <aside className="space-y-3">
          <Panel title="Profile" actions={<Link href="/dashboard/information" className="text-xs font-medium text-clay-600 hover:underline">Edit</Link>}>
            <dl className="text-[13px]">
              <Detail label="University" value={a.university} />
              <Detail label="Program" value={a.program} />
              <Detail label="Intake" value={a.intake} />
              <Detail label="Visa type" value={a.visaType} />
              <Detail label="Embassy" value={a.consulate} />
              <Detail label="Province" value={a.province} />
            </dl>
          </Panel>

          <Panel title="Visibility">
            <div className="space-y-2.5 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-mute">Review</span>
                <Chip className={APPROVAL_COLORS[a.approval]}>{APPROVAL_LABELS[a.approval] || a.approval}</Chip>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-mute">Your name</span>
                <span className="font-medium">{a.isAnonymous ? "Hidden publicly" : "Shown publicly"}</span>
              </div>
            </div>
            {a.approval === "APPROVED" ? (
              <Link href={`/tracker/${a.publicId}`} className="btn-secondary mt-3 w-full !min-h-[32px]">
                View public page <Icon name="external" size={12} />
              </Link>
            ) : (
              <p className="mt-3 text-xs text-mute">Your public page appears once an admin approves your entry.</p>
            )}
          </Panel>

          <Link href="/dashboard/updates" className="card flex items-center justify-between p-3.5 transition-colors hover:bg-white">
            <span className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper-sunk text-ink-700"><Icon name="bell" size={16} /></span>
              <span>
                <span className="block text-[13px] font-semibold">Status history</span>
                <span className="block text-xs text-mute">{a.history?.length ?? 0} updates</span>
              </span>
            </span>
            <Icon name="chevronRight" size={16} className="text-mute" />
          </Link>
        </aside>
      </div>
    </>
  );
}
