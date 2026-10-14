import Link from "next/link";
import { prisma } from "@/lib/db";
import { ACTIVE_STATUSES, VISA_STATUS_LABELS, VISA_STATUS_HEX, VISA_STATUS_ORDER, COMMUNITY_LINKS } from "@/lib/constants";
import Icon from "@/components/ui/Icon";
import { Notice } from "@/components/ui/States";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function daysBetween(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
}

async function getOverviewData() {
  try {
    const approved = { approval: "APPROVED" as const };

    const [
      total,
      islamabad,
      karachi,
      active,
      issued,
      rejected,
      withdrawn,
      statusRows,
      processingRows,
      announcements,
      recentApplicants,
    ] = await Promise.all([
      prisma.applicant.count({ where: approved }),
      prisma.applicant.count({ where: { ...approved, consulate: "Islamabad" } }),
      prisma.applicant.count({ where: { ...approved, consulate: "Karachi" } }),
      prisma.applicant.count({ where: { ...approved, visaStatus: { in: ACTIVE_STATUSES as any } } }),
      prisma.applicant.count({ where: { ...approved, visaStatus: "VISA_ISSUED" } }),
      prisma.applicant.count({ where: { ...approved, visaStatus: "VISA_REJECTED" } }),
      prisma.applicant.count({ where: { ...approved, visaStatus: "WITHDRAWN" } }),
      // per-status counts
      prisma.applicant.groupBy({
        by: ["visaStatus"],
        where: approved,
        _count: { _all: true },
      }),
      // for processing times
      prisma.applicant.findMany({
        where: { ...approved },
        select: {
          waitingListDate: true,
          submissionInviteDate: true,
          documentSubmissionDate: true,
          appointmentDate: true,
          decisionDate: true,
        },
      }),
      prisma.announcement.findMany({
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 3,
      }),
      prisma.applicant.findMany({
        where: { ...approved },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          publicId: true,
          university: true,
          consulate: true,
          visaStatus: true,
          waitingListDate: true,
          createdAt: true,
        },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const r of statusRows) statusCounts[r.visaStatus] = r._count._all;

    const wToS = processingRows.map(r => daysBetween(r.waitingListDate, r.submissionInviteDate)).filter((d): d is number => d !== null);
    const sToA = processingRows.map(r => daysBetween(r.documentSubmissionDate, r.appointmentDate)).filter((d): d is number => d !== null);
    const aToD = processingRows.map(r => daysBetween(r.appointmentDate, r.decisionDate)).filter((d): d is number => d !== null);

    return {
      ok: true as const,
      total, islamabad, karachi, active, issued, rejected, withdrawn,
      statusCounts,
      processing: {
        avgWaitingToSubmission: avg(wToS),
        avgSubmissionToAppointment: avg(sToA),
        avgAppointmentToDecision: avg(aToD),
      },
      announcements,
      recentApplicants,
    };
  } catch (e) {
    console.error("[home] overview query failed", e);
    return { ok: false as const };
  }
}

export default async function HomePage() {
  const d = await getOverviewData();

  if (!d.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Where the queue really stands.</h1>
        <Notice tone="error">The database isn&apos;t reachable. Check that DATABASE_URL is set and the schema has been pushed.</Notice>
      </div>
    );
  }

  const decided = d.issued + d.rejected;
  const issueRate = decided > 0 ? Math.round((d.issued / decided) * 100) : null;

  // Build status funnel rows (only statuses with data, in order)
  const funnelStatuses = VISA_STATUS_ORDER.filter(k => (d.statusCounts[k] ?? 0) > 0);
  const maxCount = Math.max(...funnelStatuses.map(k => d.statusCounts[k] ?? 0), 1);

  const processingStages = [
    { label: "Waiting list → invitation", value: d.processing.avgWaitingToSubmission },
    { label: "Documents → appointment", value: d.processing.avgSubmissionToAppointment },
    { label: "Appointment → decision", value: d.processing.avgAppointmentToDecision },
  ];
  const totalWait =
    processingStages.every(s => s.value !== null)
      ? processingStages.reduce((sum, s) => sum + (s.value as number), 0)
      : null;

  return (
    <div className="space-y-6">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Where the queue really stands.
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/tracker" className="btn-gold">
            <Icon name="search" size={14} /> Find my application
          </Link>
          <Link href="/submit" className="btn-secondary">
            <Icon name="plus" size={14} /> Add my timeline
          </Link>
        </div>
      </section>

      {/* ── Top KPIs ─────────────────────────────────────────── */}
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total — spans 2 */}
        <div className="col-span-2 card p-4 flex items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-600">
            <Icon name="users" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">Applicants tracked</p>
            <p className="mt-0.5 text-3xl font-bold leading-none tracking-tight">{d.total.toLocaleString("en-US")}</p>
            <p className="mt-0.5 text-xs text-mute">{d.active} still in the queue</p>
          </div>
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-ink-600" />
        </div>

        {/* Visa issued */}
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <Icon name="checkCircle" size={16} />
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-3 text-2xl font-bold leading-none">{d.issued.toLocaleString("en-US")}</p>
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-mute">Visas issued</p>
          {issueRate !== null && <p className="mt-0.5 text-xs text-mute">{issueRate}% success rate</p>}
        </div>

        {/* Active */}
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ochre-50 text-ochre-700">
              <Icon name="hourglass" size={16} />
            </span>
            <span className="h-2 w-2 rounded-full bg-ochre-500" />
          </div>
          <p className="mt-3 text-2xl font-bold leading-none">{d.active.toLocaleString("en-US")}</p>
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-mute">Active cases</p>
          <p className="mt-0.5 text-xs text-mute">{d.rejected} rejected · {d.withdrawn} withdrawn</p>
        </div>

        {/* Islamabad */}
        <Link href="/tracker?consulate=Islamabad" className="card p-4 transition-colors hover:bg-white">
          <div className="flex items-start justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-clay-50 text-clay-500">
              <Icon name="search" size={16} />
            </span>
            <span className="h-2 w-2 rounded-full bg-clay-500" />
          </div>
          <p className="mt-3 text-2xl font-bold leading-none">{d.islamabad.toLocaleString("en-US")}</p>
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-mute">Islamabad</p>
          <p className="mt-0.5 text-xs text-mute">{Math.round((d.islamabad / Math.max(d.total, 1)) * 100)}% of total</p>
        </Link>

        {/* Karachi */}
        <Link href="/tracker?consulate=Karachi" className="card p-4 transition-colors hover:bg-white">
          <div className="flex items-start justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper-sunk text-ink-700">
              <Icon name="search" size={16} />
            </span>
            <span className="h-2 w-2 rounded-full bg-ink-300" />
          </div>
          <p className="mt-3 text-2xl font-bold leading-none">{d.karachi.toLocaleString("en-US")}</p>
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-mute">Karachi</p>
          <p className="mt-0.5 text-xs text-mute">{Math.round((d.karachi / Math.max(d.total, 1)) * 100)}% of total</p>
        </Link>
      </section>

      {/* ── Status pipeline + Processing times ───────────────── */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">

        {/* Status pipeline — icon chips grid */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Status pipeline</h2>
            <Link href="/tracker" className="text-xs font-medium text-clay-600 hover:underline flex items-center gap-1">
              View all <Icon name="chevronRight" size={13} />
            </Link>
          </div>

          {funnelStatuses.length === 0 ? (
            <p className="text-sm text-mute py-4 text-center">No approved entries yet.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {funnelStatuses.map(k => {
                const count = d.statusCounts[k] ?? 0;
                const pct = d.total > 0 ? Math.round((count / d.total) * 100) : 0;
                const hex = VISA_STATUS_HEX[k] || "#888";
                const STATUS_ICONS: Record<string, string> = {
                  WAITING_LIST: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
                  WAITING_FOR_SUBMISSION: "M6 2h12M6 22h12M7 2v4l5 6-5 6v4M17 2v4l-5 6 5 6v4",
                  SUBMISSION_RECEIVED: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
                  UNDER_CORRECTION: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z",
                  APPOINTMENT_SCHEDULED: "M8 3v4M16 3v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z",
                  PROCESSING: "M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3",
                  VISA_ISSUED: "M12 22a10 10 0 100-20 10 10 0 000 20zM8 12l3 3 5-6",
                  VISA_REJECTED: "M12 22a10 10 0 100-20 10 10 0 000 20zM15 9l-6 6M9 9l6 6",
                  WITHDRAWN: "M9 21H5V3h4M16 17l5-5-5-5M21 12H9",
                  OTHER: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-5M12 8h.01",
                };
                return (
                  <li
                    key={k}
                    className="flex flex-col gap-2 rounded-xl border border-line bg-paper-raised p-3"
                    style={{ borderLeftColor: hex, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={hex} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d={STATUS_ICONS[k] || STATUS_ICONS.OTHER} />
                      </svg>
                      <span className="text-xl font-bold tabular-nums leading-none" style={{ color: hex }}>{count}</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium leading-tight text-ink-800">{VISA_STATUS_LABELS[k]}</p>
                      <p className="text-[11px] text-mute tabular-nums">{pct}% of total</p>
                    </div>
                    <div className="h-1 rounded-full bg-paper-sunk overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(4, pct)}%`, background: hex }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Processing times */}
        <div className="card p-5 flex flex-col">
          <div className="mb-4">
            <h2 className="font-semibold">Avg. wait times</h2>
            <p className="text-xs text-mute mt-0.5">Community average per stage</p>
          </div>

          <ul className="space-y-2.5 flex-1">
            {[
              { icon: "M6 2h12M6 22h12M7 2v4l5 6-5 6v4M17 2v4l-5 6 5 6v4", label: "Waiting → invite", value: d.processing.avgWaitingToSubmission, color: "#d2a63a" },
              { icon: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z", label: "Docs → appointment", value: d.processing.avgSubmissionToAppointment, color: "#4a6350" },
              { icon: "M8 3v4M16 3v4M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z", label: "Appt. → decision", value: d.processing.avgAppointmentToDecision, color: "#2f7d57" },
            ].map(s => (
              <li key={s.label} className="flex items-center gap-3 rounded-lg bg-paper-sunk px-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white">
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={s.icon} />
                  </svg>
                </span>
                <span className="flex-1 text-[13px] text-ink-700 leading-snug">{s.label}</span>
                <span className="shrink-0 text-lg font-bold tabular-nums" style={{ color: s.color }}>
                  {s.value === null ? "—" : s.value}
                  {s.value !== null && <span className="ml-0.5 text-xs font-medium text-mute">d</span>}
                </span>
              </li>
            ))}
          </ul>

          {totalWait !== null && (
            <div className="mt-3 rounded-xl border border-line bg-paper-raised px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-ink-700">Estimated total</span>
              <span className="text-xl font-bold tabular-nums">
                {totalWait}<span className="ml-0.5 text-sm font-medium text-mute">d</span>
              </span>
            </div>
          )}

          <Link href="/queue-progress" className="mt-3 btn-secondary w-full justify-center !min-h-[36px] !text-sm">
            Full queue breakdown <Icon name="chevronRight" size={14} />
          </Link>
        </div>
      </section>

      {/* ── Recent entries + Announcements ───────────────────── */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">

        {/* Recent applicants */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <div>
              <h2 className="font-semibold">Recent entries</h2>
              <p className="text-xs text-mute mt-0.5">Latest approved submissions</p>
            </div>
            <Link href="/tracker" className="text-xs font-medium text-clay-600 hover:underline flex items-center gap-1">
              All entries <Icon name="chevronRight" size={13} />
            </Link>
          </div>
          {d.recentApplicants.length === 0 ? (
            <p className="px-5 py-8 text-sm text-center text-mute">No approved entries yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.recentApplicants.map(a => (
                <li key={a.publicId}>
                  <Link
                    href={`/tracker/${a.publicId}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-paper-sunk transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] font-semibold text-ink-900">{a.publicId}</span>
                        <span className="hidden sm:inline text-mute text-[12px]">·</span>
                        <span className="hidden sm:inline truncate text-[13px] text-ink-700">{a.university || "Unknown university"}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-mute">{a.consulate} · {a.waitingListDate ? fmtDate(a.waitingListDate) : "No date"}</div>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        background: (VISA_STATUS_HEX[a.visaStatus] || "#888") + "22",
                        color: VISA_STATUS_HEX[a.visaStatus] || "#888",
                      }}
                    >
                      {VISA_STATUS_LABELS[a.visaStatus]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Announcements */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <div>
              <h2 className="font-semibold">Announcements</h2>
              <p className="text-xs text-mute mt-0.5">From the community admins</p>
            </div>
            <Link href="/announcements" className="text-xs font-medium text-clay-600 hover:underline flex items-center gap-1">
              All <Icon name="chevronRight" size={13} />
            </Link>
          </div>
          {d.announcements.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Icon name="bell" size={24} className="text-mute mx-auto" />
              <p className="mt-2 text-sm text-mute">No announcements yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {d.announcements.map(a => (
                <li key={a.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {a.pinned && (
                        <span className="rounded bg-clay-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-clay-600">
                          Pinned
                        </span>
                      )}
                      {a.consulate && (
                        <span className="rounded bg-paper-sunk px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-600">
                          {a.consulate}
                        </span>
                      )}
                    </div>
                    <time className="shrink-0 text-[11px] text-mute">{fmtDate(a.createdAt)}</time>
                  </div>
                  <p className="mt-1.5 text-[13px] font-semibold text-ink-900">{a.title}</p>
                  <p className="mt-1 text-xs text-ink-700 line-clamp-2">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Quick-action cards ────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-3" aria-label="What you can do">
        {[
          {
            icon: "search" as const,
            title: "Track your application",
            body: "Enter your Tracking ID to see your queue position, stage timeline, and an estimate for the next step.",
            href: "/tracker",
            cta: "Open tracker",
            tone: "bg-clay-50 text-clay-600",
          },
          {
            icon: "chart" as const,
            title: "Read the trends",
            body: "Compare stage durations and success rates between consulates, filterable by intake month.",
            href: "/analytics",
            cta: "View analytics",
            tone: "bg-ink-50 text-ink-700",
          },
          {
            icon: "plus" as const,
            title: "Share your journey",
            body: "Add your visa timeline. All submissions are reviewed before going live — you can stay anonymous.",
            href: "/submit",
            cta: "Submit an entry",
            tone: "bg-emerald-50 text-emerald-700",
          },
        ].map(f => (
          <Link
            key={f.title}
            href={f.href}
            className="card group flex flex-col gap-3 p-5 transition-colors hover:bg-white"
          >
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${f.tone}`}>
              <Icon name={f.icon} size={20} />
            </span>
            <div className="flex-1">
              <h3 className="font-semibold text-ink-900">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-700 leading-relaxed">{f.body}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink-800 group-hover:text-clay-600 transition-colors">
              {f.cta} <Icon name="chevronRight" size={15} />
            </span>
          </Link>
        ))}
      </section>

      {/* ── Community strip ───────────────────────────────────── */}
      <section className="rounded-xl border border-line bg-paper-raised px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
            <Icon name="users" size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold">Join the community</p>
            <p className="text-xs text-mute">Stay updated on the latest news and connect with others.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={COMMUNITY_LINKS.whatsappCommunity}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary !min-h-[34px] !text-xs"
          >
            WhatsApp Community
          </a>
          <a
            href={COMMUNITY_LINKS.whatsappChannel}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary !min-h-[34px] !text-xs"
          >
            WhatsApp Channel
          </a>
          <a
            href={COMMUNITY_LINKS.gradeCalculator}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary !min-h-[34px] !text-xs"
          >
            Grade calculator
          </a>
        </div>
      </section>

    </div>
  );
}
