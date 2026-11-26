"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/States";
import { fmtDate } from "@/lib/format";
import { DONE_STATUSES, plausible } from "@/lib/journey";
import type { EmbassyQueueIntelligence } from "@/lib/queue-intelligence";

export type QueueEstimateSummary = {
  status: "NORMAL" | "FRONTIER_REACHED" | "INSUFFICIENT_DATA";
  bestEstimatedDate: string;
  likelyWindow50: { from: string; to: string };
  estimatedRemainingDays: number;
  usableRecords: number;
  confidence: string;
};

function shortMonthYear(ms: number, includeYear: boolean): string {
  const d = new Date(ms);
  return d.toLocaleDateString("en-GB", {
    month: "short",
    ...(includeYear ? { year: "2-digit" } : {}),
    timeZone: "UTC",
  });
}

function shortDayMonth(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default function EmbassyQueueSection({
  consulate,
  visaStatus,
  userWaitingListDate,
  userInviteDate,
  intelligence,
  estimate,
  loading,
}: {
  consulate: string;
  visaStatus: string;
  userWaitingListDate?: string | null;
  userInviteDate?: string | null;
  intelligence: EmbassyQueueIntelligence | null;
  estimate: QueueEstimateSummary | null;
  loading: boolean;
}) {
  const q = intelligence?.queueRightNow;
  const userWlIso = plausible(userWaitingListDate) ? userWaitingListDate!.slice(0, 10) : null;
  const frontierIso = q?.latestInvitationWlDate ?? null;

  const alreadyInvited =
    visaStatus !== "WAITING_LIST" ||
    plausible(userInviteDate) ||
    DONE_STATUSES.has(visaStatus);

  // Build horizontal calendar axis dynamically across months/years
  const calendar = useMemo(() => {
    if (!frontierIso && !userWlIso) return null;

    const now = new Date();
    const frontierMs = frontierIso ? new Date(`${frontierIso}T00:00:00Z`).getTime() : null;
    const userMs = userWlIso ? new Date(`${userWlIso}T00:00:00Z`).getTime() : null;
    const earliestMs = q?.earliestObservedWlDate
      ? new Date(`${q.earliestObservedWlDate}T00:00:00Z`).getTime()
      : null;

    const candidates = [frontierMs, userMs, earliestMs].filter((v): v is number => v !== null);
    const minCandidate = Math.min(...candidates);
    const maxCandidate = Math.max(...candidates, now.getTime());

    const startDate = new Date(minCandidate);
    startDate.setUTCDate(1);
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(maxCandidate);
    endDate.setUTCMonth(endDate.getUTCMonth() + 2, 1);
    endDate.setUTCHours(0, 0, 0, 0);

    // Cap span to 24 months max so labels stay readable even with old historical records
    const maxStart = new Date(endDate);
    maxStart.setUTCMonth(maxStart.getUTCMonth() - 18);
    if (startDate < maxStart) {
      startDate.setTime(maxStart.getTime());
    }

    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const spanMs = Math.max(1, endMs - startMs);

    const clampPct = (ms: number) => Math.max(0, Math.min(100, ((ms - startMs) / spanMs) * 100));

    // Generate evenly spaced month ticks (every 1, 2, or 3 months depending on span)
    const totalMonths =
      (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
      (endDate.getUTCMonth() - startDate.getUTCMonth());
    const step = totalMonths > 12 ? 3 : totalMonths > 7 ? 2 : 1;

    const ticks: { label: string; pct: number; key: string }[] = [];
    const cursor = new Date(startDate);
    let idx = 0;
    while (cursor.getTime() <= endMs) {
      const pct = clampPct(cursor.getTime());
      const includeYear = idx === 0 || cursor.getUTCMonth() === 0 || totalMonths <= 6;
      ticks.push({
        key: `${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}`,
        label: shortMonthYear(cursor.getTime(), includeYear),
        pct,
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + step);
      idx++;
    }

    const frontierPct = frontierMs !== null ? clampPct(frontierMs) : null;
    const userPct = userMs !== null ? clampPct(userMs) : null;

    const gapDays =
      frontierMs !== null && userMs !== null
        ? Math.round((userMs - frontierMs) / 86_400_000)
        : null;

    return { ticks, frontierPct, userPct, gapDays };
  }, [frontierIso, userWlIso, q?.earliestObservedWlDate]);

  if (loading && !intelligence) {
    return (
      <section className="card p-5 space-y-4" aria-busy="true">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="grid gap-4 border-y border-line py-3 sm:grid-cols-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-16 w-full" />
      </section>
    );
  }

  if (!intelligence) return null;

  const markersClose =
    calendar?.frontierPct !== null &&
    calendar?.userPct !== null &&
    calendar !== null &&
    Math.abs(calendar.frontierPct - calendar.userPct) < 18;

  return (
    <section className="card p-5 space-y-4" aria-label="Current embassy queue">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">Current embassy queue</h2>
          <p className="mt-0.5 text-xs text-mute">
            {consulate} Embassy · {intelligence.recordsUsed.toLocaleString("en-US")} approved community records
            {intelligence.lastUpdatedAt ? ` · Updated ${fmtDate(intelligence.lastUpdatedAt)}` : ""}
          </p>
        </div>
        <span className="text-[11px] text-mute">Community-reported · Unofficial</span>
      </div>

      {/* 3-metric summary strip */}
      <div className="grid grid-cols-1 gap-4 border-y border-line py-3.5 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line">
        <div className="sm:pr-4">
          <p className="text-xs font-medium text-mute">Submission invitations</p>
          <p className="mt-1 text-[16px] font-semibold tabular-nums text-ink-900">
            {q?.latestInvitationWlDate ? fmtDate(q.latestInvitationWlDate) : "Insufficient data"}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-mute">
            {q?.inviteSampleSize
              ? `Latest WL date invited (n = ${q.inviteSampleSize})`
              : "No confirmed invitations yet"}
          </p>
        </div>

        <div className="sm:px-4">
          <p className="text-xs font-medium text-mute">Appointments</p>
          <p className="mt-1 text-[16px] font-semibold tabular-nums text-ink-900">
            {q?.latestAppointmentSubmissionDate ? fmtDate(q.latestAppointmentSubmissionDate) : "Insufficient data"}
          </p>
          <p className="mt-0.5 text-[11px] tabular-nums text-mute">
            {q?.appointmentSampleSize
              ? `Latest submission date booked (n = ${q.appointmentSampleSize})`
              : "No confirmed appointments yet"}
          </p>
        </div>

        <div className="sm:pl-4">
          <p className="text-xs font-medium text-mute">Weekly queue movement</p>
          <p className="mt-1 text-[16px] font-semibold tabular-nums text-ink-900">
            {q?.weeklyMovementDays !== null && q?.weeklyMovementDays !== undefined
              ? `~${q.weeklyMovementDays} days / week`
              : "Insufficient data"}
          </p>
          <p className="mt-0.5 text-[11px] text-mute">
            {q?.weeklyMovementBasis === "recent"
              ? "4-week rolling WL progression"
              : q?.weeklyMovementBasis === "baseline"
              ? "6-month historical WL pace"
              : "Needs more recent invitations"}
          </p>
        </div>
      </div>

      {/* Horizontal calendar-based queue visualization */}
      {calendar && (
        <div className="space-y-2 pt-1">
          {/* Top marker labels */}
          <div className="relative h-5 text-[11px] font-medium tabular-nums">
            {calendar.frontierPct !== null && frontierIso && (
              <span
                className="absolute -translate-x-1/2 whitespace-nowrap text-blue-600"
                style={{ left: `${Math.min(90, Math.max(10, calendar.frontierPct))}%` }}
                title={`Latest observed invitations: ${fmtDate(frontierIso)}`}
              >
                Invites · {shortDayMonth(frontierIso)}
              </span>
            )}
            {!markersClose && calendar.userPct !== null && userWlIso && (
              <span
                className="absolute -translate-x-1/2 whitespace-nowrap text-ink-900"
                style={{ left: `${Math.min(92, Math.max(8, calendar.userPct))}%` }}
                title={`Your waiting-list date: ${fmtDate(userWlIso)}`}
              >
                You · {shortDayMonth(userWlIso)}
              </span>
            )}
          </div>

          {/* Progress track */}
          <div className="relative h-2.5 w-full rounded-full bg-paper-sunk">
            {/* Observed cleared segment */}
            {calendar.frontierPct !== null && (
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-blue-600"
                style={{ width: `${calendar.frontierPct}%` }}
              />
            )}

            {/* Remaining waiting gap between frontier and applicant */}
            {!alreadyInvited &&
              calendar.frontierPct !== null &&
              calendar.userPct !== null &&
              calendar.userPct > calendar.frontierPct && (
                <div
                  className="absolute inset-y-0 bg-blue-100 dark:bg-blue-950/70"
                  style={{
                    left: `${calendar.frontierPct}%`,
                    width: `${calendar.userPct - calendar.frontierPct}%`,
                  }}
                />
              )}

            {/* Frontier marker dot */}
            {calendar.frontierPct !== null && frontierIso && (
              <span
                title={`Observed invitation frontier: ${fmtDate(frontierIso)}`}
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-blue-600"
                style={{ left: `${calendar.frontierPct}%` }}
              />
            )}

            {/* User marker dot */}
            {calendar.userPct !== null && userWlIso && (
              <span
                title={`Your waiting-list registration: ${fmtDate(userWlIso)}`}
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-ink-900 dark:bg-zinc-100"
                style={{ left: `${calendar.userPct}%` }}
              />
            )}
          </div>

          {/* Bottom user label if close to frontier so labels never overlap */}
          {markersClose && calendar.userPct !== null && userWlIso && (
            <div className="relative h-4 text-[11px] font-medium tabular-nums">
              <span
                className="absolute -translate-x-1/2 whitespace-nowrap text-ink-900"
                style={{ left: `${Math.min(92, Math.max(8, calendar.userPct))}%` }}
              >
                You · {shortDayMonth(userWlIso)}
              </span>
            </div>
          )}

          {/* Month axis ticks */}
          <div className="relative h-5 border-t border-line pt-1 text-[11px] text-mute">
            {calendar.ticks.map((t, i) => (
              <span
                key={t.key}
                className={`absolute whitespace-nowrap ${
                  i === 0 ? "translate-x-0" : i === calendar.ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
                }`}
                style={{ left: `${t.pct}%` }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Personalized queue explanation */}
      <div className="space-y-1 rounded-md border border-line bg-paper-raised px-3.5 py-2.5 text-xs leading-relaxed text-ink-700">
        {alreadyInvited ? (
          <p>
            {userWlIso
              ? `You registered on ${fmtDate(userWlIso)} and have already moved past the waiting-list stage. `
              : "Your application has moved past the waiting-list stage. "}
            {q?.latestAppointmentSubmissionDate
              ? `Reported appointments at ${consulate} are currently reaching documents submitted around ${fmtDate(q.latestAppointmentSubmissionDate)}.`
              : frontierIso
              ? `Community-reported submission invitations at ${consulate} are currently around ${fmtDate(frontierIso)}.`
              : ""}
          </p>
        ) : userWlIso && frontierIso ? (
          <p>
            You joined the waiting list on <strong className="font-medium text-ink-900">{fmtDate(userWlIso)}</strong>.
            The latest reported submission invitations at {consulate} are reaching applicants who registered around{" "}
            <strong className="font-medium text-ink-900">{fmtDate(frontierIso)}</strong>
            {calendar?.gapDays !== null && calendar?.gapDays !== undefined && calendar.gapDays > 0
              ? ` (${calendar.gapDays} calendar days between both dates).`
              : " — your registration date is at or past the observed frontier."}
          </p>
        ) : (
          <p>
            {userWlIso
              ? `You joined the waiting list on ${fmtDate(userWlIso)}. `
              : "Add your waiting-list registration date in your journey below to compare your position against the embassy queue. "}
            {frontierIso
              ? `Latest community-reported submission invitations at ${consulate} are reaching ${fmtDate(frontierIso)}.`
              : `Insufficient confirmed invitation dates at ${consulate} to display a queue frontier yet.`}
          </p>
        )}

        {!alreadyInvited && estimate && estimate.status === "NORMAL" && estimate.usableRecords >= 5 && (
          <p className="text-ink-800">
            Estimated invitation window:{" "}
            <strong className="font-medium tabular-nums text-ink-900">
              {fmtDate(estimate.likelyWindow50.from)} – {fmtDate(estimate.likelyWindow50.to)}
            </strong>{" "}
            <span className="text-mute">
              (50% historical range, median {fmtDate(estimate.bestEstimatedDate)}, based on {estimate.usableRecords} records).
            </span>
          </p>
        )}

        <p className="text-[11px] text-mute">
          Community-derived figures for reference only — not an official embassy queue or guaranteed processing date.
        </p>
      </div>
    </section>
  );
}
