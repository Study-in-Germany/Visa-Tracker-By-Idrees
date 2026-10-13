import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import Icon from "@/components/ui/Icon";
import { prisma } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import { fmtDate } from "@/lib/format";
import { JOURNEY_STAGES } from "@/lib/constants";
import { estimateNextStage } from "@/lib/eta";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = [
  "WAITING_LIST",
  "WAITING_FOR_SUBMISSION",
  "SUBMISSION_RECEIVED",
  "UNDER_CORRECTION",
  "APPOINTMENT_SCHEDULED",
  "PROCESSING",
];

async function getApplicant(publicId: string) {
  const applicant = await prisma.applicant.findFirst({
    where: { publicId: publicId.toUpperCase(), approval: "APPROVED" },
    include: { history: { orderBy: { occurredAt: "asc" } } },
  });
  return applicant;
}

async function getQueuePosition(applicant: NonNullable<Awaited<ReturnType<typeof getApplicant>>>) {
  // Only meaningful for applicants still in the active queue with a known
  // waiting-list date — completed cases (issued/rejected/withdrawn) don't
  // have a "position" anymore.
  if (!applicant.waitingListDate) return null;
  if (!ACTIVE_STATUSES.includes(applicant.visaStatus)) return null;

  const [position, total] = await Promise.all([
    prisma.applicant.count({
      where: {
        approval: "APPROVED",
        consulate: applicant.consulate,
        visaStatus: { in: ACTIVE_STATUSES as any },
        waitingListDate: { lte: applicant.waitingListDate },
      },
    }),
    prisma.applicant.count({
      where: {
        approval: "APPROVED",
        consulate: applicant.consulate,
        visaStatus: { in: ACTIVE_STATUSES as any },
      },
    }),
  ]);

  return { position, total };
}

async function getEta(applicant: NonNullable<Awaited<ReturnType<typeof getApplicant>>>) {
  // Find the first journey stage this applicant hasn't reached yet, and
  // estimate it from other approved applicants at the same consulate.
  const stageKeys = JOURNEY_STAGES.map((s) => s.key) as (keyof typeof applicant)[];
  let fromIdx = -1;
  for (let i = 0; i < stageKeys.length; i++) {
    if (!(applicant as any)[stageKeys[i]]) {
      fromIdx = i;
      break;
    }
  }
  if (fromIdx <= 0) return null; // already at/past the first stage or no data at all

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

export default async function ApplicantPage({ params }: { params: { publicId: string } }) {
  const applicant = await getApplicant(params.publicId);
  if (!applicant) notFound();

  const [eta, queue] = await Promise.all([getEta(applicant), getQueuePosition(applicant)]);

  const reached = JOURNEY_STAGES.filter((st) => (applicant as any)[st.key]).length;

  return (
    <>
      <Link href="/tracker" className="mb-2 inline-flex items-center gap-1 text-xs text-mute hover:text-ink-900">
        <Icon name="chevronLeft" size={14} /> Tracker
      </Link>
      <PageHeader
        eyebrow={applicant.publicId}
        title={applicant.isAnonymous ? "Anonymous applicant" : applicant.name}
        description={[applicant.university || "University not specified", applicant.program].filter(Boolean).join(" · ")}
        actions={<StatusBadge status={applicant.visaStatus} />}
      />

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <Panel title="Journey" description={`${reached} of ${JOURNEY_STAGES.length} stages recorded`}>
            <ol className="relative ml-1.5 space-y-4 border-l border-line-strong pl-5">
              {JOURNEY_STAGES.map((stage) => {
                const value = (applicant as any)[stage.key] as Date | null;
                return (
                  <li key={stage.key} className="relative flex items-baseline justify-between gap-3">
                    <span className={`absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-paper-raised ${value ? "bg-clay-500" : "bg-line-strong"}`} />
                    <span className={value ? "font-medium" : "text-mute"}>{stage.label}</span>
                    <span className={value ? "tabular-nums" : "text-mute"}>{value ? fmtDate(value) : "Not yet"}</span>
                  </li>
                );
              })}
            </ol>
          </Panel>

          {applicant.history.length > 0 && (
            <Panel title="Status history">
              <ul className="divide-y divide-line">
                {applicant.history.map((h) => (
                  <li key={h.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <div>
                      <StatusBadge status={h.visaStatus} />
                      {h.note && <p className="mt-1 text-xs text-mute">{h.note}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-mute">{fmtDate(h.occurredAt)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <aside className="space-y-3">
          {queue && (
            <Panel title="Queue position">
              <p className="text-3xl font-bold tracking-tight">
                #{queue.position}
                <span className="ml-1.5 text-sm font-medium text-mute">of {queue.total}</span>
              </p>
              <p className="mt-1 text-xs text-mute">Active applicants at {applicant.consulate}, ranked by waiting-list date.</p>
            </Panel>
          )}
          {eta && (
            <Panel title={`Estimated: ${eta.stageLabel}`}>
              <p className="text-lg font-semibold leading-snug">
                {fmtDate(eta.earliest.toISOString())} – {fmtDate(eta.latest.toISOString())}
              </p>
              <p className="mt-1 text-xs text-mute">
                Confidence {eta.confidence.toLowerCase()} · {eta.sampleSize} similar {eta.sampleSize === 1 ? "case" : "cases"} at {applicant.consulate}.
              </p>
              <p className="mt-3 text-[11px] text-mute">Unofficial estimate from community data, not a commitment from the consulate.</p>
            </Panel>
          )}
          <Panel title="Details">
            <dl className="grid grid-cols-2 gap-3">
              <Info label="University" value={applicant.university || "—"} />
              <Info label="Program" value={applicant.program || "—"} />
              <Info label="Intake" value={applicant.intake || "—"} />
              <Info label="Visa type" value={applicant.visaType || "—"} />
              <Info label="Embassy" value={applicant.consulate} />
              <Info label="Province" value={applicant.province || "—"} />
              <Info label="Waiting-list category" value={applicant.waitingListCategory || "—"} />
              <Info label="Heard about it via" value={applicant.sourceOfInformation || "—"} />
            </dl>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-mute">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  );
}
