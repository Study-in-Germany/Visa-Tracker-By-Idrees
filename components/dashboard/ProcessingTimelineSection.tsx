"use client";

import { Skeleton } from "@/components/ui/States";
import type { DurationDistribution, EmbassyQueueIntelligence } from "@/lib/queue-intelligence";

function formatApproxDuration(days: number | null): string {
  if (days === null) return "Insufficient data";
  if (days < 14) return `~${days} ${days === 1 ? "day" : "days"}`;
  if (days < 60) {
    const weeks = Math.round((days / 7) * 2) / 2;
    return `~${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  }
  const months = Math.round((days / 30.4) * 10) / 10;
  return `~${months} ${months === 1 ? "month" : "months"}`;
}

function formatRange(d: DurationDistribution): string {
  if (!d.hasData) return "No completed records yet";
  if (d.p25Days === null || d.p75Days === null || d.p25Days === d.p75Days) {
    return `${d.sampleSize} ${d.sampleSize === 1 ? "record" : "records"}`;
  }
  const unit = (days: number) => {
    if (days < 14) return `${days}d`;
    if (days < 60) return `${Math.round(days / 7)}w`;
    return `${Math.round((days / 30.4) * 10) / 10}m`;
  };
  return `Typical ${unit(d.p25Days)}–${unit(d.p75Days)} · n=${d.sampleSize}${!d.sufficient ? " (low sample)" : ""}`;
}

export default function ProcessingTimelineSection({
  consulate,
  intelligence,
  loading,
}: {
  consulate: string;
  intelligence: EmbassyQueueIntelligence | null;
  loading: boolean;
}) {
  if (loading && !intelligence) {
    return (
      <section className="card p-5 space-y-4" aria-busy="true">
        <Skeleton className="h-5 w-56" />
        <div className="grid gap-3 md:grid-cols-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </section>
    );
  }

  if (!intelligence) return null;

  const t = intelligence.timeline;
  const c = intelligence.corrections;

  const nodes = ["Waiting list", "Invitation", "Submission", "Appointment", "Decision"];
  const transitions: { label: string; dist: DurationDistribution }[] = [
    { label: "Waiting list → Invitation", dist: t.waitingToInvite },
    { label: "Invitation → Submission", dist: t.inviteToSubmission },
    { label: "Submission → Appointment", dist: t.submissionToAppointment },
    { label: "Appointment → Decision", dist: t.appointmentToDecision },
  ];

  const hasCorrectionStats =
    c.ratePercent !== null || c.resolutionTime.sampleSize >= 3 || c.correctionToAppointment.sampleSize >= 3;

  return (
    <section className="card p-5 space-y-4" aria-label="Typical visa processing timeline">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">Typical visa processing timeline</h2>
          <p className="mt-0.5 text-xs text-mute">
            Median observed step durations (25th–75th percentile range) at {consulate} Embassy
          </p>
        </div>
      </div>

      {/* Desktop horizontal connected timeline */}
      <div className="hidden md:block">
        <div className="relative flex items-center justify-between px-2">
          <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-line-strong" aria-hidden="true" />
          {nodes.map((node, i) => (
            <div key={node} className="relative z-10 flex flex-col items-center bg-card px-2">
              <span className="grid h-6 w-6 place-items-center rounded-full border border-line-strong bg-paper-raised text-[11px] font-semibold tabular-nums text-ink-800">
                {i + 1}
              </span>
              <span className="mt-1.5 whitespace-nowrap text-xs font-medium text-ink-900">{node}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-3 border-t border-line pt-3">
          {transitions.map((tr) => (
            <div key={tr.label} className="min-w-0">
              <p className="text-[11px] font-medium text-mute">{tr.label}</p>
              <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink-900">
                {formatApproxDuration(tr.dist.medianDays)}
              </p>
              <p className="mt-0.5 text-[11px] tabular-nums text-mute">{formatRange(tr.dist)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile vertical connected timeline */}
      <ol className="space-y-3 border-l border-line-strong pl-4 md:hidden">
        {transitions.map((tr) => (
          <li key={tr.label} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-ink-800">{tr.label}</span>
              <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-900">
                {formatApproxDuration(tr.dist.medianDays)}
              </span>
            </div>
            <p className="text-[11px] tabular-nums text-mute">{formatRange(tr.dist)}</p>
          </li>
        ))}
      </ol>

      {/* Optional correction requests informational note */}
      <div className="border-t border-line pt-3 text-xs text-mute">
        {hasCorrectionStats ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="font-medium text-ink-800">Correction requests (optional branch):</span>
            {c.ratePercent !== null && (
              <span className="tabular-nums">
                {c.ratePercent}% of submitted applicants ({c.correctionCount}/{c.submittedBaseCount})
              </span>
            )}
            {c.resolutionTime.sampleSize >= 3 && (
              <span className="tabular-nums">
                Resolution: {formatApproxDuration(c.resolutionTime.medianDays)} (n={c.resolutionTime.sampleSize})
              </span>
            )}
            {c.correctionToAppointment.sampleSize >= 3 && (
              <span className="tabular-nums">
                Resubmitted → appointment: {formatApproxDuration(c.correctionToAppointment.medianDays)} (n={c.correctionToAppointment.sampleSize})
              </span>
            )}
          </div>
        ) : (
          <p>
            Correction requests are an optional branch and only apply if the embassy asks for updated documents (currently {c.correctionCount} recorded cases at {consulate}).
          </p>
        )}
      </div>
    </section>
  );
}
