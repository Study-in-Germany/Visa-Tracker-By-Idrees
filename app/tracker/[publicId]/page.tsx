import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import Icon from "@/components/ui/Icon";
import { prisma } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache";
import StatusBadge from "@/components/StatusBadge";
import { fmtDate, formatDuration } from "@/lib/format";
import { ACTIVE_STATUSES, JOURNEY_STAGES, VISA_STATUS_LABELS, VISA_STATUS_HEX } from "@/lib/constants";
import { estimateNextStage } from "@/lib/eta";
import { stageProgress } from "@/lib/journey";

export const dynamic = "force-dynamic";

const STAGE_ICONS: Record<string, string> = {
  waitingListDate: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  submissionInviteDate: "M6 2h12M6 22h12M7 2v4l5 6-5 6v4M17 2v4l-5 6 5 6v4",
  documentSubmissionDate: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  correctionRequestDate: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z",
  correctionSubmittedDate: "M5 12l5 5L20 7",
  appointmentDate: "M8 3v4M16 3v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z",
  interviewDate: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M17 11a3 3 0 100-6M22 21a6 6 0 00-4-5.6",
  decisionDate: "M12 22a10 10 0 100-20 10 10 0 000 20zM8 12l3 3 5-6",
};

const getConsulateStageSamples = unstable_cache(
  async (consulate: string, fromKey: string, toKey: string) => {
    const rows = await prisma.applicant.findMany({
      where: {
        approval: "APPROVED",
        consulate,
        [fromKey]: { not: null },
        [toKey]: { not: null },
      },
      select: { [fromKey]: true, [toKey]: true } as any,
    } as any);
    return rows.map((p: any) => ({
      from: p[fromKey] ? (p[fromKey] as Date).toISOString() : null,
      to: p[toKey] ? (p[toKey] as Date).toISOString() : null,
    }));
  },
  ["consulate-eta-samples-v1"],
  { revalidate: 300, tags: [CACHE_TAGS.APPLICANTS] },
);

async function getApplicant(publicId: string) {
  return prisma.applicant.findFirst({
    where: { publicId: publicId.toUpperCase(), approval: "APPROVED" },
    include: { history: { orderBy: { occurredAt: "asc" } } },
  });
}

async function getQueuePosition(applicant: NonNullable<Awaited<ReturnType<typeof getApplicant>>>) {
  if (!applicant.waitingListDate) return null;
  if (!ACTIVE_STATUSES.includes(applicant.visaStatus)) return null;
  const [position, total] = await Promise.all([
    prisma.applicant.count({
      where: { approval: "APPROVED", consulate: applicant.consulate, visaStatus: { in: ACTIVE_STATUSES as any }, waitingListDate: { lte: applicant.waitingListDate } },
    }),
    prisma.applicant.count({
      where: { approval: "APPROVED", consulate: applicant.consulate, visaStatus: { in: ACTIVE_STATUSES as any } },
    }),
  ]);
  return { position, total };
}

async function getEta(applicant: NonNullable<Awaited<ReturnType<typeof getApplicant>>>) {
  const stageKeys = JOURNEY_STAGES.map((s) => s.key) as (keyof typeof applicant)[];
  let fromIdx = -1;
  for (let i = 0; i < stageKeys.length; i++) {
    if (!(applicant as any)[stageKeys[i]]) { fromIdx = i; break; }
  }
  if (fromIdx <= 0) return null;
  const fromKey = stageKeys[fromIdx - 1];
  const toKey = stageKeys[fromIdx];
  const fromDate = (applicant as any)[fromKey] as Date | null;
  if (!fromDate) return null;

  const rawSamples = await getConsulateStageSamples(applicant.consulate, String(fromKey), String(toKey));
  const samples = rawSamples.map((s) => ({
    from: s.from ? new Date(s.from) : null,
    to: s.to ? new Date(s.to) : null,
  }));
  const result = estimateNextStage(samples, fromDate);
  if (!result) return null;
  return { ...result, stageLabel: JOURNEY_STAGES[fromIdx].label };
}

function daysBetween(a: Date | string | null, b: Date | null | string): number | null {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

export default async function ApplicantPage({ params }: { params: { publicId: string } }) {
  const applicant = await getApplicant(params.publicId);
  if (!applicant) notFound();

  const [eta, queue] = await Promise.all([getEta(applicant), getQueuePosition(applicant)]);

  const stages = JOURNEY_STAGES.map((s) => ({ ...s, date: (applicant as any)[s.key] as Date | null }));
  const reached = stages.filter((s) => s.date).length;
  const nextIdx = stages.findIndex((s) => !s.date);
  const progress = stageProgress({ visaStatus: applicant.visaStatus });
  const progressPct = Math.round((progress.done / progress.total) * 100);
  const statusHex = VISA_STATUS_HEX[applicant.visaStatus] || "#6B7280";
  const isActive = ACTIVE_STATUSES.includes(applicant.visaStatus);

  const daysWaiting = applicant.waitingListDate
    ? daysBetween(applicant.waitingListDate, isActive ? new Date() : applicant.decisionDate || new Date())
    : null;

  return (
    <div className="space-y-4">
      <Link href="/tracker" className="inline-flex items-center gap-1.5 text-xs font-medium text-mute hover:text-ink-900">
        <Icon name="chevronLeft" size={13} /> Back to Tracker
      </Link>

      {/* Summary header */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-line bg-paper-raised px-2 py-0.5 font-mono text-[13px] font-semibold text-ink-900">
                {applicant.publicId}
              </span>
              <StatusBadge status={applicant.visaStatus} />
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">
              {applicant.isAnonymous ? "Anonymous applicant" : applicant.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-mute">
              {applicant.university && (
                <span className="flex items-center gap-1.5">
                  <Icon name="school" size={13} className="shrink-0" />
                  {applicant.university}
                </span>
              )}
              {applicant.program && (
                <span className="flex items-center gap-1.5">
                  <Icon name="file" size={13} className="shrink-0" />
                  {applicant.program}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Icon name="building" size={13} className="shrink-0" />
                {applicant.consulate} Embassy
              </span>
              {applicant.intake && (
                <span className="flex items-center gap-1.5">
                  <Icon name="calendar" size={13} className="shrink-0" />
                  {applicant.intake}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {daysWaiting !== null && (
              <div className="rounded-md border border-line bg-paper-raised px-3.5 py-2 text-center min-w-[84px]">
                <p className="text-[15px] font-semibold tabular-nums leading-tight text-ink-900">{formatDuration(daysWaiting)}</p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-mute">
                  {isActive ? "Waiting" : "Total time"}
                </p>
              </div>
            )}
            {queue && (
              <div className="rounded-md border border-line bg-paper-raised px-3.5 py-2 text-center min-w-[84px]">
                <p className="text-[18px] font-semibold tabular-nums leading-none text-ink-900">
                  #{queue.position}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-mute">
                  of {queue.total} active
                </p>
              </div>
            )}
            <div className="rounded-md border border-line bg-paper-raised px-3.5 py-2 text-center min-w-[84px]">
              <p className="text-[18px] font-semibold tabular-nums leading-none text-ink-900">
                {progress.done}/{progress.total}
              </p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-mute">
                {progress.label}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-mute">
            <span>Stage {progress.done} of {progress.total} · {progress.label}</span>
            <span className="tabular-nums">{progressPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-paper-sunk">
            <div
              className="h-full rounded-full"
              style={{ width: `${progressPct}%`, background: statusHex }}
            />
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">Journey milestones</h2>
              <span className="text-xs tabular-nums text-mute">{reached} of {stages.length} dates recorded</span>
            </div>
            <ol className="divide-y divide-line">
              {stages.map((stage, i) => {
                const isDone = !!stage.date;
                const isNext = i === nextIdx && !progress.isTerminal;
                const prevDate = i > 0 ? stages[i - 1].date : null;
                const gap = isDone && prevDate ? daysBetween(prevDate, stage.date) : null;
                const iconPath = STAGE_ICONS[stage.key] || "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2";

                return (
                  <li
                    key={stage.key}
                    className={`flex items-center gap-3.5 px-4 py-3 ${isNext ? "bg-paper-raised" : ""}`}
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border ${
                        isDone
                          ? "border-ink-800 bg-ink-800 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                          : isNext
                          ? "border-blue-600/40 bg-blue-50 text-blue-600"
                          : "border-line bg-paper-raised text-mute"
                      }`}
                    >
                      {isDone ? (
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      ) : (
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d={iconPath} />
                        </svg>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] font-medium ${isDone ? "text-ink-900" : isNext ? "text-ink-900" : "text-mute"}`}>
                        {stage.label}
                        {isNext && (
                          <span className="ml-2 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                            Next
                          </span>
                        )}
                      </p>
                      {gap !== null && gap > 0 && (
                        <p className="text-[11px] tabular-nums text-mute">+{formatDuration(gap)} from previous</p>
                      )}
                    </div>

                    <span className={`shrink-0 text-[13px] tabular-nums ${isDone ? "font-medium text-ink-900" : "text-mute"}`}>
                      {isDone ? fmtDate(stage.date) : "—"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {applicant.history.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-[14px] font-semibold">Status history</h2>
                <span className="text-xs tabular-nums text-mute">{applicant.history.length} update{applicant.history.length !== 1 ? "s" : ""}</span>
              </div>
              <ul className="divide-y divide-line">
                {[...applicant.history].reverse().map((h) => (
                  <li key={h.id} className="flex items-start gap-3 px-4 py-3">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: VISA_STATUS_HEX[h.visaStatus] || "#6B7280" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink-900">{VISA_STATUS_LABELS[h.visaStatus]}</p>
                      {h.note && <p className="mt-0.5 text-xs text-mute">{h.note}</p>}
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-mute">{fmtDate(h.occurredAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-16">
          {queue && (
            <div className="card overflow-hidden">
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-[14px] font-semibold">Queue position</h2>
              </div>
              <div className="p-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums leading-none text-ink-900">
                    #{queue.position}
                  </span>
                  <span className="text-xs text-mute">of {queue.total} active</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-sunk">
                  <div
                    className="h-full rounded-full bg-ink-800"
                    style={{ width: `${Math.round((queue.position / Math.max(queue.total, 1)) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-mute">
                  Ranked by waiting-list date at {applicant.consulate}.
                </p>
              </div>
            </div>
          )}

          {eta && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                <h2 className="text-[14px] font-semibold">Next stage estimate</h2>
                <span className={`badge ${
                  eta.confidence === "High" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                  eta.confidence === "Medium" ? "border-amber-200 bg-amber-50 text-amber-800" :
                  "border-red-200 bg-red-50 text-red-700"
                }`}>{eta.confidence}</span>
              </div>
              <div className="p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-mute">{eta.stageLabel}</p>
                <p className="mt-1 text-[15px] font-semibold tabular-nums text-ink-900">
                  {fmtDate(eta.earliest.toISOString())}
                  <span className="mx-1.5 font-normal text-mute">–</span>
                  {fmtDate(eta.latest.toISOString())}
                </p>
                <p className="mt-2 text-xs text-mute">
                  Based on {eta.sampleSize} {eta.sampleSize === 1 ? "case" : "cases"} at {applicant.consulate}. Median gap: {formatDuration(eta.medianGapDays)}.
                </p>
                <p className="mt-2.5 rounded-md border border-line bg-paper-raised px-2.5 py-2 text-[11px] leading-relaxed text-mute">
                  Community-derived estimate only — not an official embassy timeline.
                </p>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[14px] font-semibold">Details</h2>
            </div>
            <dl className="divide-y divide-line px-4">
              {[
                { label: "University", value: applicant.university },
                { label: "Program", value: applicant.program },
                { label: "Intake", value: applicant.intake },
                { label: "Visa type", value: applicant.visaType },
                { label: "Embassy", value: applicant.consulate },
                { label: "Province", value: applicant.province },
                { label: "WL category", value: applicant.waitingListCategory },
                { label: "Heard via", value: applicant.sourceOfInformation },
              ]
                .filter((d) => d.value)
                .map((d) => (
                  <div key={d.label} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                    <dt className="text-mute">{d.label}</dt>
                    <dd className="truncate font-medium text-ink-900">{d.value}</dd>
                  </div>
                ))}
            </dl>
          </div>

          <div className="card bg-paper-raised p-4">
            <p className="text-[13px] font-semibold text-ink-900">Is this your entry?</p>
            <p className="mt-0.5 text-xs text-mute">Log in with your Tracking ID and access code to update dates.</p>
            <Link href="/login" className="btn-primary mt-3 w-full">
              Applicant login
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
