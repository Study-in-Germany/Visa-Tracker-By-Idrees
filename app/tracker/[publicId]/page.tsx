import { notFound } from "next/navigation";
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-sm text-gray-500">{applicant.publicId}</div>
            <h1 className="text-xl font-bold text-navy-950 mt-1">
              {applicant.isAnonymous ? "Anonymous Applicant" : applicant.name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {applicant.university || "University not specified"}
              {applicant.program ? ` · ${applicant.program}` : ""}
            </p>
          </div>
          <StatusBadge status={applicant.visaStatus} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-sm">
          <Info label="Consulate" value={applicant.consulate} />
          <Info label="Intake" value={applicant.intake || "—"} />
          <Info label="Visa Type" value={applicant.visaType || "—"} />
        </div>
      </div>

      {queue && (
        <div className="card p-6 border-l-4 border-gold-500">
          <h2 className="font-bold text-navy-950">Your Queue Position</h2>
          <p className="text-2xl font-extrabold text-navy-950 mt-1">
            #{queue.position} <span className="text-base font-medium text-gray-500">of {queue.total}</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Among active applicants at {applicant.consulate}, ranked by waiting-list join date.
          </p>
        </div>
      )}

      {eta && (
        <div className="card p-6 border-l-4 border-gold-500">
          <h2 className="font-bold text-navy-950">Estimated {eta.stageLabel}</h2>
          <p className="text-2xl font-extrabold text-navy-950 mt-1">
            {fmtDate(eta.earliest.toISOString())} – {fmtDate(eta.latest.toISOString())}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Confidence: <span className="font-semibold">{eta.confidence}</span> (based on{" "}
            {eta.sampleSize} similar {eta.sampleSize === 1 ? "case" : "cases"} at{" "}
            {applicant.consulate})
          </p>
          <p className="text-xs text-gray-400 mt-3">
            This is an unofficial estimate calculated from community-reported data. It does not
            represent a commitment from the German consulate.
          </p>
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-bold text-navy-950 mb-4">Visa Journey Timeline</h2>
        <ol className="space-y-4">
          {JOURNEY_STAGES.map((stage) => {
            const value = (applicant as any)[stage.key] as Date | null;
            return (
              <li key={stage.key} className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    value ? "bg-navy-700" : "bg-gray-200"
                  }`}
                />
                <span className={`flex-1 text-sm ${value ? "text-gray-900" : "text-gray-400"}`}>
                  {stage.label}
                </span>
                <span className="text-sm text-gray-500">{value ? fmtDate(value) : "Pending"}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {applicant.history.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-navy-950 mb-4">Status History</h2>
          <ul className="space-y-3 text-sm">
            {applicant.history.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-3">
                <div>
                  <StatusBadge status={h.visaStatus} />
                  {h.note && <p className="text-gray-500 mt-1">{h.note}</p>}
                </div>
                <span className="text-gray-400 shrink-0">{fmtDate(h.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
      <div className="font-medium text-gray-800">{value}</div>
    </div>
  );
}
