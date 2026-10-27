import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { prisma } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import { fmtDate, formatDuration } from "@/lib/format";
import { JOURNEY_STAGES, VISA_STATUS_LABELS, VISA_STATUS_HEX } from "@/lib/constants";
import { estimateNextStage } from "@/lib/eta";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = [
  "WAITING_LIST", "WAITING_FOR_SUBMISSION", "SUBMISSION_RECEIVED",
  "UNDER_CORRECTION", "APPOINTMENT_SCHEDULED", "PROCESSING",
];

// Icons for each stage
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
  const peers = await prisma.applicant.findMany({
    where: { approval: "APPROVED", consulate: applicant.consulate },
    select: { [fromKey]: true, [toKey]: true } as any,
  } as any);
  const samples = peers.map((p: any) => ({ from: p[fromKey], to: p[toKey] }));
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
  const progressPct = Math.round((reached / stages.length) * 100);
  const statusHex = VISA_STATUS_HEX[applicant.visaStatus] || "#888";
  const isActive = ACTIVE_STATUSES.includes(applicant.visaStatus);

  // Days waiting (from waiting-list date to now or decision)
  const daysWaiting = applicant.waitingListDate
    ? daysBetween(applicant.waitingListDate, isActive ? new Date() : applicant.decisionDate || new Date())
    : null;

  return (
    <div className="space-y-4">

      {/* ── Back crumb ─────────────────────────────────────── */}
      <Link href="/tracker" className="inline-flex items-center gap-1.5 text-xs font-medium text-mute hover:text-ink-900 transition-colors">
        <Icon name="chevronLeft" size={13} /> Back to Tracker
      </Link>

      {/* ── Hero card ──────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-line bg-paper-raised p-5 sm:p-6"
        style={{ borderLeftColor: statusHex, borderLeftWidth: 4 }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {/* Eyebrow */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-lg bg-paper-sunk px-2.5 py-1 font-mono text-[13px] font-bold text-ink-700">
                {applicant.publicId}
              </span>
              <StatusBadge status={applicant.visaStatus} />
            </div>
            {/* Name */}
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {applicant.isAnonymous ? "Anonymous applicant" : applicant.name}
            </h1>
            {/* Sub info */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-600">
              {applicant.university && (
                <span className="flex items-center gap-1.5">
                  <Icon name="book" size={13} className="shrink-0 text-mute" />
                  {applicant.university}
                </span>
              )}
              {applicant.program && (
                <span className="flex items-center gap-1.5">
                  <Icon name="file" size={13} className="shrink-0 text-mute" />
                  {applicant.program}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Icon name="search" size={13} className="shrink-0 text-mute" />
                {applicant.consulate} Embassy
              </span>
              {applicant.intake && (
                <span className="flex items-center gap-1.5">
                  <Icon name="calendar" size={13} className="shrink-0 text-mute" />
                  {applicant.intake}
                </span>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {daysWaiting !== null && (
              <div className="rounded-xl border border-line bg-paper-sunk px-4 py-2.5 text-center min-w-[80px]">
                <p className="text-base font-bold leading-tight">{formatDuration(daysWaiting)}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-mute">
                  {isActive ? "Waiting" : "Total time"}
                </p>
              </div>
            )}
            {queue && (
              <div className="rounded-xl border border-line bg-paper-sunk px-4 py-2.5 text-center min-w-[80px]">
                <p className="text-xl font-bold tabular-nums leading-none" style={{ color: statusHex }}>
                  #{queue.position}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-mute">
                  of {queue.total} active
                </p>
              </div>
            )}
            <div className="rounded-xl border border-line bg-paper-sunk px-4 py-2.5 text-center min-w-[80px]">
              <p className="text-xl font-bold tabular-nums leading-none">{reached}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-mute">
                of {stages.length} stages
              </p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              Journey progress
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-mute">{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-paper-sunk">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: statusHex }}
            />
          </div>
          {nextIdx >= 0 && (
            <p className="mt-1.5 text-[11px] text-mute">
              Next: <span className="font-semibold text-ink-700">{stages[nextIdx].label}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── Main grid ──────────────────────────────────────── */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">

        {/* LEFT — Timeline + history */}
        <div className="space-y-4">

          {/* Journey timeline */}
          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-semibold">Journey timeline</h2>
              <p className="text-xs text-mute mt-0.5">{reached} of {stages.length} stages recorded</p>
            </div>
            <ol className="divide-y divide-line">
              {stages.map((stage, i) => {
                const isDone = !!stage.date;
                const isNext = i === nextIdx;
                const prevDate = i > 0 ? stages[i - 1].date : null;
                const gap = isDone && prevDate ? daysBetween(prevDate, stage.date) : null;
                const iconPath = STAGE_ICONS[stage.key] || "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2";

                return (
                  <li
                    key={stage.key}
                    className={`flex items-center gap-4 px-5 py-3.5 ${isNext ? "bg-ochre-50/40" : ""}`}
                  >
                    {/* Icon circle */}
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 ${
                        isDone
                          ? "border-transparent text-white"
                          : isNext
                          ? "border-ochre-400 text-ochre-600 bg-ochre-50"
                          : "border-line bg-paper-sunk text-mute"
                      }`}
                      style={isDone ? { background: statusHex, borderColor: statusHex } : {}}
                    >
                      {isDone ? (
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      ) : (
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d={iconPath} />
                        </svg>
                      )}
                    </span>

                    {/* Label + gap */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold ${isDone ? "text-ink-900" : isNext ? "text-ochre-700" : "text-mute"}`}>
                        {stage.label}
                        {isNext && (
                          <span className="ml-2 rounded-full bg-ochre-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ochre-700">
                            Next
                          </span>
                        )}
                      </p>
                      {gap !== null && gap > 0 && (
                        <p className="text-[11px] text-mute">+{formatDuration(gap)} from previous</p>
                      )}
                    </div>

                    {/* Date */}
                    <span className={`shrink-0 text-sm tabular-nums ${isDone ? "font-semibold text-ink-900" : "text-mute"}`}>
                      {isDone ? fmtDate(stage.date) : "Not yet"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Status history */}
          {applicant.history.length > 0 && (
            <div className="card overflow-hidden">
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-semibold">Status history</h2>
                <p className="text-xs text-mute mt-0.5">{applicant.history.length} update{applicant.history.length !== 1 ? "s" : ""}</p>
              </div>
              <ul className="divide-y divide-line">
                {[...applicant.history].reverse().map((h) => (
                  <li key={h.id} className="flex items-start gap-4 px-5 py-3.5">
                    <span
                      className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: VISA_STATUS_HEX[h.visaStatus] || "#888" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold">{VISA_STATUS_LABELS[h.visaStatus]}</p>
                      {h.note && <p className="mt-0.5 text-xs text-mute">{h.note}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-mute">{fmtDate(h.occurredAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* RIGHT — Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-16">

          {/* Queue position */}
          {queue && (
            <div className="card overflow-hidden">
              <div className="border-b border-line px-5 py-4">
                <h2 className="font-semibold">Queue position</h2>
              </div>
              <div className="p-5">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black tabular-nums leading-none" style={{ color: statusHex }}>
                    #{queue.position}
                  </span>
                  <span className="mb-1 text-sm text-mute">of {queue.total} active</span>
                </div>
                {/* Position bar */}
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-paper-sunk">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((queue.position / Math.max(queue.total, 1)) * 100)}%`,
                      background: statusHex,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-mute">
                  Ranked by waiting-list date at {applicant.consulate}.
                </p>
              </div>
            </div>
          )}

          {/* ETA */}
          {eta && (
            <div className="card overflow-hidden">
              <div className="border-b border-line px-5 py-4 flex items-center justify-between gap-2">
                <h2 className="font-semibold">Next stage estimate</h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  eta.confidence === "High" ? "bg-emerald-50 text-emerald-700" :
                  eta.confidence === "Medium" ? "bg-ochre-50 text-ochre-700" :
                  "bg-red-50 text-red-600"
                }`}>{eta.confidence}</span>
              </div>
              <div className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mute mb-1">{eta.stageLabel}</p>
                <p className="text-lg font-bold leading-snug text-ink-900">
                  {fmtDate(eta.earliest.toISOString())}
                  <span className="text-sm font-normal text-mute mx-1.5">–</span>
                  {fmtDate(eta.latest.toISOString())}
                </p>
                <p className="mt-2 text-xs text-mute">
                  Based on {eta.sampleSize} similar {eta.sampleSize === 1 ? "case" : "cases"} at {applicant.consulate}. Median wait: {formatDuration(eta.medianGapDays)}.
                </p>
                <p className="mt-2 rounded-lg bg-paper-sunk px-3 py-2 text-[11px] text-mute leading-relaxed">
                  Unofficial estimate from community data only — not a commitment from the consulate.
                </p>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-semibold">Details</h2>
            </div>
            <dl className="divide-y divide-line px-5">
              {[
                { icon: "book", label: "University", value: applicant.university },
                { icon: "file", label: "Program", value: applicant.program },
                { icon: "calendar", label: "Intake", value: applicant.intake },
                { icon: "layers", label: "Visa type", value: applicant.visaType },
                { icon: "search", label: "Embassy", value: applicant.consulate },
                { icon: "users", label: "Province", value: applicant.province },
                { icon: "queue", label: "WL category", value: applicant.waitingListCategory },
                { icon: "bell", label: "Heard via", value: applicant.sourceOfInformation },
              ]
                .filter(d => d.value)
                .map(d => (
                  <div key={d.label} className="flex items-center gap-3 py-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-paper-sunk text-mute">
                      <Icon name={d.icon as any} size={13} />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-wider text-mute">{d.label}</dt>
                      <dd className="truncate text-[13px] font-semibold">{d.value}</dd>
                    </div>
                  </div>
                ))}
            </dl>
          </div>

          {/* Login CTA */}
          <div className="rounded-xl border border-line bg-paper-raised p-4 text-center">
            <Icon name="user" size={20} className="mx-auto text-mute mb-2" />
            <p className="text-[13px] font-semibold">Is this your entry?</p>
            <p className="text-xs text-mute mt-0.5 mb-3">Log in to update your dates and status.</p>
            <Link href="/login" className="btn-gold w-full justify-center">
              Applicant login
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
