import Link from "next/link";
import { getCachedOverviewData } from "@/lib/overview";
import { VISA_STATUS_LABELS, VISA_STATUS_HEX, VISA_STATUS_ORDER, COMMUNITY_LINKS } from "@/lib/constants";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/StatusBadge";
import { Notice } from "@/components/ui/States";
import { fmtDate } from "@/lib/format";

export const revalidate = 60;

function fmtShortDate(iso: string | null) {
  if (!iso) return "—";
  return fmtDate(iso);
}

function fmtRelative(iso: string) {
  const diffDays = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
  return fmtDate(iso);
}

export default async function HomePage() {
  let d: Awaited<ReturnType<typeof getCachedOverviewData>> | null = null;
  try {
    d = await getCachedOverviewData();
  } catch (e) {
    console.error("[home] overview query failed", e);
  }

  if (!d || !d.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">Visa Tracker Overview</h1>
        <Notice tone="error">The database isn&apos;t reachable. Check that DATABASE_URL is set and the schema has been pushed.</Notice>
      </div>
    );
  }

  const decided = d.issued + d.rejected;
  const issueRate = decided > 0 ? Math.round((d.issued / decided) * 100) : null;
  const funnelStatuses = VISA_STATUS_ORDER.filter((k) => k !== "OTHER" || (d.statusCounts[k] ?? 0) > 0);

  const waitRows = [
    { label: "Waiting list → Invitation", metric: d.processing.waitingToInvite },
    { label: "Submission → Appointment", metric: d.processing.submissionToAppointment },
    { label: "Appointment → Decision", metric: d.processing.appointmentToDecision },
    { label: "Estimated total duration", metric: d.processing.totalEstimated, bold: true },
  ];

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold tracking-tight text-ink-900">
            German Student Visa Queue Overview
          </h2>
          <p className="mt-0.5 text-[13px] text-mute">
            Community-reported timelines for Islamabad &amp; Karachi. Unofficial data — not affiliated with any embassy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/tracker" className="btn-primary">
            <Icon name="search" size={14} /> Open tracker
          </Link>
          <Link href="/submit" className="btn-secondary">
            <Icon name="plus" size={14} /> Submit timeline
          </Link>
        </div>
      </section>

      {/* ── 1. Current Embassy Queue Position ───────────────────────────── */}
      <section aria-label="Observed embassy queue positions" className="grid gap-3 md:grid-cols-2">
        {d.embassies.map((emb) => (
          <div key={emb.consulate} className="card bg-paper-raised p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[14px] font-semibold text-ink-900">{emb.consulate} Embassy</h3>
                  <span className="rounded border border-line bg-card px-1.5 py-0.5 text-[10px] font-medium text-mute">
                    Community-reported · Unofficial
                  </span>
                </div>
                <p className="mt-2 text-xs text-mute">Latest observed waiting-list date invited</p>
                <p className="mt-0.5 text-[24px] font-semibold leading-tight tracking-tight tabular-nums text-ink-900">
                  {fmtShortDate(emb.latestInvitedWlDate)}
                </p>
              </div>
              <Link
                href={`/tracker?consulate=${encodeURIComponent(emb.consulate)}`}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                View queue <Icon name="chevronRight" size={13} />
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2.5 text-xs text-mute tabular-nums">
              <span>Latest invite: <strong className="font-medium text-ink-800">{fmtShortDate(emb.latestInviteDate)}</strong></span>
              <span>Observed invites: <strong className="font-medium text-ink-800">{emb.confirmedCount}</strong></span>
              <span>Active in queue: <strong className="font-medium text-ink-800">{emb.activeInEmbassy}</strong></span>
            </div>
          </div>
        ))}
      </section>

      {/* ── 2. Applicant Statistics (Preserved 6-col card structure) ────── */}
      <section aria-label="Applicant statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 card flex items-center gap-4 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-paper-sunk text-ink-800">
            <Icon name="users" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-mute">Applicants tracked</p>
            <p className="mt-0.5 text-3xl font-bold leading-none tracking-tight tabular-nums text-ink-900">
              {d.total.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-xs tabular-nums text-mute">{d.active} active in queue</p>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-start justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <Icon name="checkCircle" size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold leading-none tabular-nums text-ink-900">{d.issued.toLocaleString("en-US")}</p>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-mute">Visas issued</p>
          {issueRate !== null && <p className="mt-0.5 text-xs tabular-nums text-mute">{issueRate}% of decided</p>}
        </div>

        <div className="card p-4">
          <div className="flex items-start justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-700">
              <Icon name="hourglass" size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold leading-none tabular-nums text-ink-900">{d.active.toLocaleString("en-US")}</p>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-mute">Active cases</p>
          <p className="mt-0.5 text-xs tabular-nums text-mute">{d.rejected} rejected · {d.withdrawn} withdrawn</p>
        </div>

        <Link href="/tracker?consulate=Islamabad" className="card p-4 transition-colors hover:bg-paper-raised">
          <div className="flex items-start justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper-sunk text-ink-700">
              <Icon name="building" size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold leading-none tabular-nums text-ink-900">{d.islamabad.toLocaleString("en-US")}</p>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-mute">Islamabad</p>
          <p className="mt-0.5 text-xs tabular-nums text-mute">{Math.round((d.islamabad / Math.max(d.total, 1)) * 100)}% of total</p>
        </Link>

        <Link href="/tracker?consulate=Karachi" className="card p-4 transition-colors hover:bg-paper-raised">
          <div className="flex items-start justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-paper-sunk text-ink-700">
              <Icon name="building" size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold leading-none tabular-nums text-ink-900">{d.karachi.toLocaleString("en-US")}</p>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-mute">Karachi</p>
          <p className="mt-0.5 text-xs tabular-nums text-mute">{Math.round((d.karachi / Math.max(d.total, 1)) * 100)}% of total</p>
        </Link>
      </section>

      {/* ── 3 & 4. Latest Invitations & Recent Appointments ─────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="text-[14px] font-semibold text-ink-900">Latest submission invitations</h2>
              <p className="text-xs text-mute">Most recent confirmed invitation dates</p>
            </div>
            <Link href="/tracker?visaStatus=WAITING_FOR_SUBMISSION" className="text-xs font-medium text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {d.latestInvitations.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-mute">No confirmed invitations recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="border-b border-line bg-paper-raised text-left text-[11px] font-medium uppercase tracking-wider text-mute">
                  <tr>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-3 py-2">Embassy</th>
                    <th className="px-3 py-2">WL Date</th>
                    <th className="px-3 py-2">Invited</th>
                    <th className="px-4 py-2 text-right">Wait</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {d.latestInvitations.map((row) => (
                    <tr key={row.publicId} className="hover:bg-paper-sunk/60">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium">
                        <Link href={`/tracker/${row.publicId}`} className="text-blue-600 hover:underline">
                          {row.publicId}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-ink-700">{row.consulate}</td>
                      <td className="px-3 py-2.5 tabular-nums text-ink-700">{fmtDate(row.waitingListDate)}</td>
                      <td className="px-3 py-2.5 tabular-nums font-medium text-ink-900">{fmtDate(row.submissionInviteDate)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-mute">{row.waitDays}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="text-[14px] font-semibold text-ink-900">Recent appointment updates</h2>
              <p className="text-xs text-mute">Applicants with scheduled embassy appointments</p>
            </div>
            <Link href="/tracker?visaStatus=APPOINTMENT_SCHEDULED" className="text-xs font-medium text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {d.recentAppointments.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-mute">No appointment updates recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="border-b border-line bg-paper-raised text-left text-[11px] font-medium uppercase tracking-wider text-mute">
                  <tr>
                    <th className="px-4 py-2">ID</th>
                    <th className="px-3 py-2">Embassy</th>
                    <th className="px-3 py-2">WL Date</th>
                    <th className="px-3 py-2">Appointment</th>
                    <th className="px-4 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {d.recentAppointments.map((row) => (
                    <tr key={row.publicId} className="hover:bg-paper-sunk/60">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium">
                        <Link href={`/tracker/${row.publicId}`} className="text-blue-600 hover:underline">
                          {row.publicId}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-ink-700">{row.consulate}</td>
                      <td className="px-3 py-2.5 tabular-nums text-mute">{fmtShortDate(row.waitingListDate)}</td>
                      <td className="px-3 py-2.5 tabular-nums font-medium text-ink-900">{fmtDate(row.appointmentDate)}</td>
                      <td className="px-4 py-2.5 text-right"><StatusBadge status={row.visaStatus} short /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── 5. Compact Status Pipeline + Average Waiting Times ──────────── */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold text-ink-900">Status breakdown</h2>
              <p className="text-xs text-mute">Distribution across all approved entries</p>
            </div>
            <Link href="/tracker" className="text-xs font-medium text-blue-600 hover:underline">
              Filter in tracker
            </Link>
          </div>
          {d.total === 0 ? (
            <p className="py-4 text-center text-xs text-mute">No approved entries yet.</p>
          ) : (
            <>
              <div className="mb-3.5 flex h-2 overflow-hidden rounded-full bg-paper-sunk" role="img" aria-label="Applicants by status">
                {funnelStatuses
                  .filter((k) => (d.statusCounts[k] ?? 0) > 0)
                  .map((k) => (
                    <span
                      key={k}
                      title={`${VISA_STATUS_LABELS[k]}: ${d.statusCounts[k]}`}
                      style={{ flexGrow: d.statusCounts[k], background: VISA_STATUS_HEX[k] || "#6B7280" }}
                    />
                  ))}
              </div>
              <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {funnelStatuses.map((k) => {
                  const count = d.statusCounts[k] ?? 0;
                  const pct = Math.round((count / Math.max(d.total, 1)) * 100);
                  return (
                    <Link
                      key={k}
                      href={`/tracker?visaStatus=${k}`}
                      className={`flex items-center justify-between gap-2 rounded px-1.5 py-1.5 text-[13px] transition-colors hover:bg-paper-sunk ${
                        count === 0 ? "opacity-50" : ""
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: VISA_STATUS_HEX[k] || "#6B7280" }} />
                        <span className="truncate text-ink-800">{VISA_STATUS_LABELS[k]}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-ink-900 font-medium">
                        {count.toLocaleString("en-US")}
                        <span className="ml-1.5 text-xs font-normal text-mute">{pct}%</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="card flex flex-col justify-between p-4">
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-ink-900">Average waiting times</h2>
              <Link href="/queue-progress" className="text-xs font-medium text-blue-600 hover:underline">
                Breakdown
              </Link>
            </div>
            <div className="divide-y divide-line border-t border-line">
              {waitRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                  <div className="min-w-0">
                    <p className={row.bold ? "font-semibold text-ink-900" : "text-ink-700"}>{row.label}</p>
                    <p className="text-[11px] tabular-nums text-mute">
                      {row.metric.sampleSize === 0
                        ? "Insufficient data"
                        : `Observed sample: n = ${row.metric.sampleSize}${!row.metric.reliable ? " (low sample)" : ""}`}
                    </p>
                  </div>
                  <span className={`shrink-0 tabular-nums ${row.bold ? "text-[16px] font-semibold text-ink-900" : "font-medium text-ink-900"}`}>
                    {row.metric.avgDays === null ? "—" : `${row.metric.avgDays}d`}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-mute">
            Observed community averages from approved timelines. Estimates with small sample sizes may shift as new data arrives.
          </p>
        </div>
      </section>

      {/* ── 6. Recent Applicant Activity Table + Announcements ──────────── */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h2 className="text-[14px] font-semibold text-ink-900">Recent applicant activity</h2>
              <p className="text-xs text-mute">Latest approved records and timeline updates</p>
            </div>
            <Link href="/tracker" className="text-xs font-medium text-blue-600 hover:underline">
              All applicants
            </Link>
          </div>
          {d.recentActivity.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-mute">No approved entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="border-b border-line bg-paper-raised text-left text-[11px] font-medium uppercase tracking-wider text-mute">
                  <tr>
                    <th className="px-4 py-2">Tracking ID</th>
                    <th className="px-3 py-2">University</th>
                    <th className="px-3 py-2">Embassy</th>
                    <th className="px-3 py-2">Waiting List</th>
                    <th className="px-3 py-2">Updated</th>
                    <th className="px-4 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {d.recentActivity.map((a) => (
                    <tr key={a.publicId} className="hover:bg-paper-sunk/60">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium">
                        <Link href={`/tracker/${a.publicId}`} className="text-blue-600 hover:underline">
                          {a.publicId}
                        </Link>
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 text-ink-800">{a.university || "—"}</td>
                      <td className="px-3 py-2.5 text-ink-700">{a.consulate}</td>
                      <td className="px-3 py-2.5 tabular-nums text-mute">{fmtShortDate(a.waitingListDate)}</td>
                      <td className="px-3 py-2.5 tabular-nums text-mute">{fmtRelative(a.updatedAt)}</td>
                      <td className="px-4 py-2.5 text-right"><StatusBadge status={a.visaStatus} short /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[14px] font-semibold text-ink-900">Announcements</h2>
            <Link href="/announcements" className="text-xs font-medium text-blue-600 hover:underline">
              All
            </Link>
          </div>
          {d.announcements.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-mute">No announcements yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.announcements.map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-mute">
                    <div className="flex items-center gap-1.5">
                      {a.pinned && (
                        <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                          Pinned
                        </span>
                      )}
                      {a.consulate && (
                        <span className="rounded border border-line bg-paper-raised px-1.5 py-0.5 text-[10px] font-medium text-ink-700">
                          {a.consulate}
                        </span>
                      )}
                    </div>
                    <time className="tabular-nums">{fmtDate(a.createdAt)}</time>
                  </div>
                  <p className="mt-1 text-[13px] font-semibold text-ink-900">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-mute">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Compact quick-links & community footer ──────────────────────── */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-mute">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Link href="/visa-estimator" className="inline-flex items-center gap-1.5 hover:text-ink-900">
            <Icon name="pulse" size={13} /> Visa estimator
          </Link>
          <Link href="/queue-progress" className="inline-flex items-center gap-1.5 hover:text-ink-900">
            <Icon name="queue" size={13} /> Queue progress
          </Link>
          <Link href="/analytics" className="inline-flex items-center gap-1.5 hover:text-ink-900">
            <Icon name="chart" size={13} /> Analytics
          </Link>
          <Link href="/universities" className="inline-flex items-center gap-1.5 hover:text-ink-900">
            <Icon name="school" size={13} /> Universities
          </Link>
          <Link href="/admission-guide" className="inline-flex items-center gap-1.5 hover:text-ink-900">
            <Icon name="file" size={13} /> Admission guide
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <a href={COMMUNITY_LINKS.whatsappCommunity} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
            WhatsApp Community <Icon name="external" size={11} />
          </a>
          <a href={COMMUNITY_LINKS.whatsappChannel} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
            WhatsApp Channel <Icon name="external" size={11} />
          </a>
        </div>
      </footer>
    </div>
  );
}
