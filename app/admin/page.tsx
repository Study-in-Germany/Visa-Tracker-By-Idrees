"use client";

import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { ErrorState } from "@/components/ui/States";
import { Chip } from "@/components/ui/Chip";
import { useApi } from "@/hooks/useApi";
import type { Analytics, ApplicantsResponse } from "@/lib/types";

export default function AdminDashboardPage() {
  const stats = useApi<Analytics>("/api/analytics");
  const pending = useApi<ApplicantsResponse>("/api/applicants?approval=PENDING_REVIEW&page=1&pageSize=1");
  const pendingCount = pending.data?.count;
  const error = stats.error || pending.error;

  return (
    <>
      <PageHeader eyebrow="Admin" title="Dashboard" description="Approved entries only, except the review queue." />

      {error ? (
        <div className="card"><ErrorState error={error} onRetry={() => { stats.reload(); pending.reload(); }} /></div>
      ) : (
        <div className="space-y-6">
          {pendingCount !== undefined && pendingCount > 0 && (
            <div className="card flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-clay-500 p-4">
              <p className="text-sm">
                <strong>{pendingCount}</strong> submission{pendingCount === 1 ? "" : "s"} waiting for review.
              </p>
              <Link href="/admin/applicants?approval=PENDING_REVIEW" className="btn-gold">Review now</Link>
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <div className="col-span-2">
              <StatCard variant="wide" icon="users" tone="sage" label="Approved applicants" value={stats.data?.total} loading={stats.loading && !stats.data} hint="Visible publicly" />
            </div>
            <StatCard icon="inbox" tone="accent" label="Pending review" value={pendingCount} loading={pending.loading && !pending.data} href="/admin/applicants?approval=PENDING_REVIEW" />
            <StatCard icon="hourglass" tone="warn" label="Active" value={stats.data?.activeApplicants} loading={stats.loading && !stats.data} />
            <StatCard icon="checkCircle" tone="good" label="Visa issued" value={stats.data?.visaIssued} loading={stats.loading && !stats.data} />
            <StatCard icon="check" tone="neutral" label="Completed" value={stats.data?.completedCases} loading={stats.loading && !stats.data} />
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Link href="/admin/applicants" className="card block p-5 transition-colors hover:bg-paper-sunk">
              <h2 className="text-lg font-semibold">Applicants</h2>
              <p className="mt-1 text-sm text-ink-700">Approve submissions, edit records, update statuses.</p>
              {pendingCount ? <Chip tone="warn" className="mt-3">{pendingCount} pending</Chip> : null}
            </Link>
            <Link href="/admin/announcements" className="card block p-5 transition-colors hover:bg-paper-sunk">
              <h2 className="text-lg font-semibold">Announcements</h2>
              <p className="mt-1 text-sm text-ink-700">Publish updates for the community.</p>
            </Link>
          </section>
        </div>
      )}
    </>
  );
}
