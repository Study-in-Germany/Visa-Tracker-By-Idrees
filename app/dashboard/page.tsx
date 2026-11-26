"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Panel from "@/components/ui/Panel";
import Icon from "@/components/ui/Icon";
import { Chip } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/States";
import StatusBadge from "@/components/StatusBadge";
import MilestoneEditor from "@/components/tracker/MilestoneEditor";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import EmbassyQueueSection, { type QueueEstimateSummary } from "@/components/dashboard/EmbassyQueueSection";
import ProcessingTimelineSection from "@/components/dashboard/ProcessingTimelineSection";
import { useSetPageTitle } from "@/components/PageTitle";
import { invalidateApi, useApi } from "@/hooks/useApi";
import { fmtDate, formatDuration } from "@/lib/format";
import { APPROVAL_COLORS, APPROVAL_LABELS, ACTIVE_STATUSES, VISA_STATUS_LABELS } from "@/lib/constants";
import { buildApplicantJourney, plausible } from "@/lib/journey";
import type { EmbassyQueueIntelligence } from "@/lib/queue-intelligence";

const DAY = 86_400_000;
const daysBetween = (a: string, b: string | Date) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY));

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0">
      <dt className="shrink-0 text-mute">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-ink-900">
        {value || <span className="font-normal text-mute">—</span>}
      </dd>
    </div>
  );
}

export default function ApplicantDashboardPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<{ applicant: any }>("/api/applicant/me");
  const a = data?.applicant;

  useEffect(() => {
    if (error?.status === 401) router.push("/login");
  }, [error, router]);

  // Put personalized greeting directly into the persistent AppShell header
  const greetingText = useMemo(() => {
    const part = greetingForHour(new Date().getHours());
    const firstName = a?.name ? String(a.name).trim().split(/\s+/)[0] : "";
    return firstName ? `${part}, ${firstName}` : part;
  }, [a?.name]);
  useSetPageTitle(greetingText);

  // Independent fetch for cached public embassy queue intelligence
  const wlParam = a && plausible(a.waitingListDate) ? `&waitingListDate=${String(a.waitingListDate).slice(0, 10)}` : "";
  const intelUrl = a?.consulate
    ? `/api/queue-intelligence?consulate=${encodeURIComponent(a.consulate)}${wlParam}`
    : null;
  const intel = useApi<{ intelligence: EmbassyQueueIntelligence; estimate: QueueEstimateSummary | null }>(intelUrl);

  if (error && !a) {
    return (
      <div className="card">
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  const meLoading = loading && !a;
  const active = a ? ACTIVE_STATUSES.includes(a.visaStatus) : true;
  const waitingDays =
    a && plausible(a.waitingListDate)
      ? daysBetween(a.waitingListDate, active ? new Date() : a.decisionDate || new Date())
      : null;

  const journey = a ? buildApplicantJourney(a) : null;
  const qi = intel.data?.intelligence ?? null;
  const est = intel.data?.estimate ?? null;

  // Stage-aware Card 3: Estimated next milestone
  let nextMilestoneValue = "—";
  let nextMilestoneSupport = "Add timeline dates";
  if (a && journey) {
    if (journey.isTerminal) {
      nextMilestoneValue = VISA_STATUS_LABELS[a.visaStatus] || "Completed";
      nextMilestoneSupport = plausible(a.decisionDate) ? `Decided ${fmtDate(a.decisionDate)}` : "Final outcome recorded";
    } else if (a.visaStatus === "WAITING_LIST") {
      if (est && est.status === "FRONTIER_REACHED") {
        nextMilestoneValue = "Frontier reached";
        nextMilestoneSupport = "Check portal & email for invite";
      } else if (est && est.status === "NORMAL" && est.usableRecords >= 5) {
        nextMilestoneValue = fmtDate(est.bestEstimatedDate);
        nextMilestoneSupport = `Invite window: ~${est.estimatedRemainingDays}d remaining`;
      } else if (qi?.timeline.waitingToInvite.medianDays !== null && qi?.timeline.waitingToInvite.medianDays !== undefined) {
        nextMilestoneValue = `~${formatDuration(qi.timeline.waitingToInvite.medianDays)}`;
        nextMilestoneSupport = `Typical WL → invite (n=${qi.timeline.waitingToInvite.sampleSize})`;
      } else {
        nextMilestoneValue = "Submission invite";
        nextMilestoneSupport = "Insufficient data for date range";
      }
    } else if (a.visaStatus === "APPOINTMENT_SCHEDULED" && plausible(a.appointmentDate)) {
      nextMilestoneValue = fmtDate(a.appointmentDate);
      nextMilestoneSupport = "Scheduled appointment date";
    } else if (a.visaStatus === "SUBMISSION_RECEIVED" || a.visaStatus === "WAITING_FOR_SUBMISSION") {
      const s2a = qi?.timeline.submissionToAppointment;
      nextMilestoneValue = journey.nextStep?.label || "Appointment";
      nextMilestoneSupport =
        s2a && s2a.medianDays !== null
          ? `Typical docs → appt: ${formatDuration(s2a.medianDays)} (n=${s2a.sampleSize})`
          : "Awaiting appointment slot";
    } else if (a.visaStatus === "PROCESSING") {
      const a2d = qi?.timeline.appointmentToDecision;
      nextMilestoneValue = "Visa decision";
      nextMilestoneSupport =
        a2d && a2d.medianDays !== null
          ? `Typical appt → decision: ${formatDuration(a2d.medianDays)} (n=${a2d.sampleSize})`
          : "Application under review";
    } else {
      nextMilestoneValue = journey.nextStep?.label || "In progress";
      nextMilestoneSupport = "Update milestones when received";
    }
  }

  // Stage-aware Card 4: Embassy queue progress
  let queueProgressValue = "—";
  let queueProgressSupport = a ? `${a.consulate} Embassy` : "Loading embassy";
  if (a) {
    const frontierIso = qi?.queueRightNow.latestInvitationWlDate;
    const userWlIso = plausible(a.waitingListDate) ? String(a.waitingListDate).slice(0, 10) : null;

    if (a.visaStatus !== "WAITING_LIST" || plausible(a.submissionInviteDate)) {
      queueProgressValue = "Past waiting list";
      queueProgressSupport = frontierIso
        ? `${a.consulate} invites at ${fmtDate(frontierIso)}`
        : `${a.consulate} Embassy`;
    } else if (frontierIso && userWlIso) {
      const gap = Math.round(
        (new Date(`${userWlIso}T00:00:00Z`).getTime() - new Date(`${frontierIso}T00:00:00Z`).getTime()) / DAY,
      );
      if (gap <= 0) {
        queueProgressValue = "At frontier";
        queueProgressSupport = `Invites at ${fmtDate(frontierIso)}`;
      } else {
        queueProgressValue = `${gap} days gap`;
        queueProgressSupport = `Invites at ${fmtDate(frontierIso)}`;
      }
    } else if (frontierIso) {
      queueProgressValue = fmtDate(frontierIso);
      queueProgressSupport = `Latest ${a.consulate} invites`;
    }
  }

  const onMilestoneSaved = () => {
    invalidateApi("/api/applicant/me");
    invalidateApi("/api/queue-intelligence");
    invalidateApi("/api/applicants");
    invalidateApi("/api/stats");
    reload();
    intel.reload();
  };

  return (
    <div className="space-y-5">
      {/* 1. Statistics Cards */}
      <section aria-label="Application overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DashboardStatCard
          loading={meLoading}
          icon="clock"
          label={active ? "Time spent waiting" : "Total time in process"}
          value={waitingDays !== null ? formatDuration(waitingDays) : "—"}
          supporting={a && plausible(a.waitingListDate) ? `Since ${fmtDate(a.waitingListDate)}` : "Add waiting-list date"}
        />
        <DashboardStatCard
          loading={meLoading}
          icon="checkCircle"
          label="Current stage"
          value={a ? VISA_STATUS_LABELS[a.visaStatus] || a.visaStatus : "—"}
          supporting={journey ? `Step ${journey.completedCount} of ${journey.totalCount} · ${journey.percent}% complete` : ""}
        />
        <DashboardStatCard
          loading={meLoading || (intel.loading && !qi)}
          icon="calendar"
          label="Estimated next milestone"
          value={nextMilestoneValue}
          supporting={nextMilestoneSupport}
        />
        <DashboardStatCard
          loading={meLoading || (intel.loading && !qi)}
          icon="queue"
          label="Embassy queue progress"
          value={queueProgressValue}
          supporting={queueProgressSupport}
        />
      </section>

      {/* 2. Live Embassy Queue Intelligence */}
      {a && (
        <EmbassyQueueSection
          consulate={a.consulate}
          visaStatus={a.visaStatus}
          userWaitingListDate={a.waitingListDate}
          userInviteDate={a.submissionInviteDate}
          intelligence={qi}
          estimate={est}
          loading={intel.loading}
        />
      )}

      {/* 3. Typical Visa Processing Timeline */}
      {a && (
        <ProcessingTimelineSection
          consulate={a.consulate}
          intelligence={qi}
          loading={intel.loading}
        />
      )}

      {/* 4. Personal Journey + Profile (2-column desktop layout) */}
      {a && journey && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel
            title="Personal application journey"
            description={
              journey.nextStep
                ? `Next milestone: ${journey.nextStep.label}`
                : journey.isTerminal
                ? `Application ${VISA_STATUS_LABELS[a.visaStatus]?.toLowerCase() ?? "completed"}`
                : "All applicable milestones recorded"
            }
            actions={
              <div className="flex items-center gap-2">
                <StatusBadge status={a.visaStatus} short />
                <span className="rounded border border-line bg-paper-raised px-2 py-0.5 text-xs font-medium tabular-nums text-ink-800">
                  {journey.completedCount}/{journey.totalCount}
                </span>
              </div>
            }
          >
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-paper-sunk">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${journey.percent}%` }}
              />
            </div>

            <ol className="divide-y divide-line border-t border-line">
              {journey.steps.map((s, i) => (
                <li
                  key={s.key}
                  className={`flex flex-wrap items-center gap-3 py-2.5 px-1 ${
                    s.isNext ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                      s.completed
                        ? "bg-ink-800 text-white dark:bg-zinc-100 dark:text-zinc-950"
                        : s.isNext
                        ? "bg-blue-600 text-white"
                        : "bg-paper-sunk text-mute"
                    }`}
                  >
                    {s.completed ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[13px] ${
                        s.completed || s.isNext ? "font-medium text-ink-900" : "text-mute"
                      }`}
                    >
                      {s.label}
                    </p>
                    {s.gapDays !== null && s.gapDays > 0 && (
                      <p className="text-[11px] tabular-nums text-mute">+{s.gapDays}d from previous</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[13px] tabular-nums ${s.date ? "text-ink-900 font-medium" : "text-mute"}`}>
                    {s.date ? fmtDate(s.date) : s.completed ? "Completed" : s.isNext ? "Next" : "Pending"}
                  </span>
                  <MilestoneEditor
                    milestone={s.key}
                    label={s.label}
                    date={s.date}
                    currentStatus={a.visaStatus}
                    onSaved={onMilestoneSaved}
                  />
                </li>
              ))}
            </ol>

            {journey.canAddCorrection && (
              <div className="mt-3 border-t border-line pt-3">
                <MilestoneEditor
                  milestone="correctionRequestDate"
                  label="Correction requested"
                  date={null}
                  triggerLabel="+ Record a correction request (optional)"
                  onSaved={onMilestoneSaved}
                />
              </div>
            )}
          </Panel>

          <aside className="space-y-4">
            <Panel
              title="Profile"
              actions={
                <Link href="/dashboard/information" className="text-xs font-medium text-blue-600 hover:underline">
                  Edit
                </Link>
              }
            >
              <dl className="text-[13px]">
                <Detail label="Tracking ID" value={a.publicId} />
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
                  <span className="font-medium text-ink-900">
                    {a.isAnonymous ? "Hidden publicly" : "Shown publicly"}
                  </span>
                </div>
              </div>
              {a.approval === "APPROVED" ? (
                <Link href={`/tracker/${a.publicId}`} className="btn-secondary mt-3 w-full !min-h-[34px]">
                  View public page <Icon name="external" size={12} />
                </Link>
              ) : (
                <p className="mt-3 text-xs text-mute">
                  Your public page appears once an admin approves your entry.
                </p>
              )}
            </Panel>

            <Link
              href="/dashboard/updates"
              className="card flex items-center justify-between p-3.5 transition-colors hover:bg-paper-raised"
            >
              <span className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-paper-sunk text-ink-700">
                  <Icon name="bell" size={15} />
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-ink-900">Status history</span>
                  <span className="block text-xs tabular-nums text-mute">{a.history?.length ?? 0} updates</span>
                </span>
              </span>
              <Icon name="chevronRight" size={15} className="text-mute" />
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
