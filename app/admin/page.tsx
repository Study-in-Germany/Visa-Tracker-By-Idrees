"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";
import { ErrorState } from "@/components/ui/States";
import { AttentionTile, DailyBars, Kpi, QuickLink, Section, timeAgo } from "@/components/admin/parts";
import AddApplicantModal from "@/components/admin/AddApplicantModal";
import { useApi } from "@/hooks/useApi";
import { VISA_STATUS_HEX, VISA_STATUS_LABELS, VISA_STATUS_ORDER } from "@/lib/constants";

type Overview = {
  applicants: { pending: number; approved: number; rejected: number; total: number; byVisaStatus: Record<string, number> };
  universities: { total: number; published: number; programmes: number };
  listings: { byStatus: Record<string, number>; total: number; openReports: number };
  announcements: { total: number; latest: { id: string; title: string; pinned: boolean; createdAt: string }[] };
  series: { date: string; count: number }[];
  queue: {
    applicants: { id: string; publicId: string; name: string; university: string | null; consulate: string; createdAt: string }[];
    listings: { id: string; title: string; city: string; createdAt: string }[];
  };
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function StatusMix({ by }: { by: Record<string, number> }) {
  const rows = VISA_STATUS_ORDER.map((k) => ({ k, n: by[k] ?? 0 })).filter((r) => r.n > 0);
  const total = rows.reduce((s, r) => s + r.n, 0);
  if (!total) return <p className="py-8 text-center text-sm text-mute">No approved applicants yet.</p>;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-paper-sunk" role="img" aria-label="Visa status distribution">
        {rows.map((r) => <span key={r.k} title={`${VISA_STATUS_LABELS[r.k]}: ${r.n}`} style={{ width: `${(r.n / total) * 100}%`, background: VISA_STATUS_HEX[r.k] }} />)}
      </div>
      <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.k} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: VISA_STATUS_HEX[r.k] }} /><span className="truncate">{VISA_STATUS_LABELS[r.k]}</span></span>
            <span className="tabular-nums text-mute">{r.n} <span className="text-[11px]">· {Math.round((r.n / total) * 100)}%</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="flex items-center gap-2 px-4 py-6 text-sm text-mute"><Icon name="checkCircle" size={16} className="text-green-600" /> {text}</p>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<Overview>("/api/admin/overview");
  const [adding, setAdding] = useState(false);
  const l = data?.listings;
  const live = l?.byStatus.APPROVED ?? 0;
  const last7 = data?.series.slice(-7).reduce((s, d) => s + d.count, 0) ?? 0;
  const last30 = data?.series.reduce((s, d) => s + d.count, 0) ?? 0;
  const todo = (data?.applicants.pending ?? 0) + (l?.byStatus.PENDING_REVIEW ?? 0) + (l?.openReports ?? 0);

  return (
    <>
      <PageHeader title="Dashboard" />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">{greeting()}</h2>
          <p className="mt-0.5 text-[13px] text-mute">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {data && <> · {todo ? `${todo} item${todo === 1 ? "" : "s"} need${todo === 1 ? "s" : ""} your attention` : "you're all caught up"}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={14} /> Add applicant</button>
          <Link href="/admin/universities" className="btn-secondary"><Icon name="school" size={14} /> Universities</Link>
          <Link href="/admin/announcements" className="btn-secondary"><Icon name="bell" size={14} /> Announce</Link>
        </div>
      </div>

      {error && !data ? (
        <div className="card"><ErrorState error={error} onRetry={reload} /></div>
      ) : (
        <div className="space-y-5">
          <section aria-label="Needs attention" className="grid gap-3 md:grid-cols-3">
            <AttentionTile icon="inbox" tone="clay" count={data?.applicants.pending} loading={loading && !data} label="applicants to review" hint="New submissions waiting for approval" href="/admin/applicants?approval=PENDING_REVIEW" />
            <AttentionTile icon="home" tone="amber" count={l?.byStatus.PENDING_REVIEW} loading={loading && !data} label="listings to review" hint="Accommodation waiting for a decision" href="/admin/accommodation" />
            <AttentionTile icon="flag" tone="red" count={l?.openReports} loading={loading && !data} label="open reports" hint="Users flagged these listings" href="/admin/accommodation" />
          </section>

          <section aria-label="Totals" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi icon="users" label="Applicants" value={data?.applicants.total} sub={data ? `${data.applicants.approved} approved` : undefined} href="/admin/applicants" />
            <Kpi icon="checkCircle" tone="green" label="Visa issued" value={data ? (data.applicants.byVisaStatus.VISA_ISSUED ?? 0) : undefined} sub="of approved entries" />
            <Kpi icon="school" tone="blue" label="Universities" value={data?.universities.total} sub={data ? `${data.universities.published} published` : undefined} href="/admin/universities" />
            <Kpi icon="book" tone="blue" label="Programmes" value={data?.universities.programmes} href="/admin/universities" />
            <Kpi icon="home" tone="amber" label="Live listings" value={data ? live : undefined} sub={data ? `${l?.total ?? 0} in total` : undefined} href="/admin/accommodation" />
            <Kpi icon="bell" tone="clay" label="Announcements" value={data?.announcements.total} href="/admin/announcements" />
          </section>

          <div className="grid gap-5 xl:grid-cols-5">
            <Section className="xl:col-span-3" title="New submissions" hint={data ? `${last7} in the last 7 days · ${last30} in 30 days` : undefined}>
              {data ? <DailyBars data={data.series} /> : <div className="h-[158px] animate-pulse rounded-lg bg-paper-sunk" />}
            </Section>
            <Section className="xl:col-span-2" title="Visa status" hint="Approved applicants">
              {data ? <StatusMix by={data.applicants.byVisaStatus} /> : <div className="h-[158px] animate-pulse rounded-lg bg-paper-sunk" />}
            </Section>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section flush title="Applicant review queue" hint="Newest submissions first" action={<Link href="/admin/applicants?approval=PENDING_REVIEW" className="text-xs font-semibold text-clay-600 hover:underline">View all</Link>}>
              {data && data.queue.applicants.length === 0 ? <Empty text="No submissions waiting." /> : (
                <ul className="divide-y divide-line">
                  {(data?.queue.applicants ?? []).map((a) => (
                    <li key={a.id}>
                      <Link href={`/admin/applicants/${a.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-paper">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-[13px] font-semibold text-ink-700">{(a.name.trim()[0] || "?").toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold">{a.name}</span>
                          <span className="block truncate text-xs text-mute"><span className="font-mono">{a.publicId}</span> · {a.university || a.consulate}</span>
                        </span>
                        <span className="shrink-0 text-xs text-mute">{timeAgo(a.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <div className="space-y-5">
              <Section flush title="Accommodation to review" action={<Link href="/admin/accommodation" className="text-xs font-semibold text-clay-600 hover:underline">Open</Link>}>
                {data && data.queue.listings.length === 0 ? <Empty text="No listings waiting." /> : (
                  <ul className="divide-y divide-line">
                    {(data?.queue.listings ?? []).map((x) => (
                      <li key={x.id}>
                        <Link href="/admin/accommodation" className="flex items-center gap-3 px-4 py-2.5 hover:bg-paper">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700"><Icon name="home" size={16} /></span>
                          <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{x.title}</span><span className="block truncate text-xs text-mute">{x.city}</span></span>
                          <span className="shrink-0 text-xs text-mute">{timeAgo(x.createdAt)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section flush title="Latest announcements" action={<Link href="/admin/announcements" className="text-xs font-semibold text-clay-600 hover:underline">Manage</Link>}>
                {data && data.announcements.latest.length === 0 ? <p className="px-4 py-6 text-sm text-mute">Nothing published yet.</p> : (
                  <ul className="divide-y divide-line">
                    {(data?.announcements.latest ?? []).map((x) => (
                      <li key={x.id} className="flex items-center gap-2 px-4 py-2.5 text-[13px]">
                        {x.pinned && <Icon name="pin" size={13} className="shrink-0 text-clay-500" />}
                        <span className="min-w-0 flex-1 truncate font-medium">{x.title}</span>
                        <span className="shrink-0 text-xs text-mute">{timeAgo(x.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          </div>

          <section aria-label="Shortcuts">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-mute">Manage</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <QuickLink href="/admin/applicants" icon="users" title="Applicants" desc="Approve, edit, add or delete records" />
              <QuickLink href="/admin/universities" icon="school" title="Universities & programmes" desc="Maintain the directory" />
              <QuickLink href="/admin/accommodation" icon="home" title="Accommodation" desc="Moderate listings and reports" />
              <QuickLink href="/admin/announcements" icon="bell" title="Announcements" desc="Publish and pin updates" />
              <QuickLink href="/admin/imports" icon="layers" title="Update data" desc="Refresh universities and programmes" />
              <QuickLink href="/admin/import" icon="upload" title="Import applicants" desc="Bulk upload from a spreadsheet" />
              <QuickLink href="/admin/settings" icon="settings" title="Settings" desc="Password, security and appearance" />
              <QuickLink href="/tracker" icon="external" title="View public site" desc="See what visitors see" />
            </div>
          </section>
        </div>
      )}

      <AddApplicantModal open={adding} onClose={() => setAdding(false)} onCreated={(id) => router.push(`/admin/applicants/${id}`)} />
    </>
  );
}
