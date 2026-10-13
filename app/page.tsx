import Link from "next/link";
import { prisma } from "@/lib/db";
import { ACTIVE_STATUSES } from "@/lib/constants";
import StatCard from "@/components/ui/StatCard";
import Panel from "@/components/ui/Panel";
import { Notice } from "@/components/ui/States";
import Icon from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

async function getOverview() {
  try {
    const approved = { approval: "APPROVED" as const };
    const [total, islamabad, karachi, active, issued] = await Promise.all([
      prisma.applicant.count({ where: approved }),
      prisma.applicant.count({ where: { ...approved, consulate: "Islamabad" } }),
      prisma.applicant.count({ where: { ...approved, consulate: "Karachi" } }),
      prisma.applicant.count({ where: { ...approved, visaStatus: { in: ACTIVE_STATUSES as any } } }),
      prisma.applicant.count({ where: { ...approved, visaStatus: "VISA_ISSUED" } }),
    ]);
    return { ok: true as const, total, islamabad, karachi, active, issued };
  } catch (e) {
    console.error("[home] overview query failed", e);
    return { ok: false as const };
  }
}

export default async function HomePage() {
  const stats = await getOverview();

  return (
    <div className="space-y-6">
      <section className="max-w-3xl">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">Where the queue really stands.</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/tracker" className="btn-gold">Find my application</Link>
          <Link href="/submit" className="btn-secondary">Add my timeline</Link>
        </div>
      </section>

      <section aria-label="Overview">
        {stats.ok ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <div className="col-span-2">
              <StatCard variant="wide" icon="users" tone="sage" label="Applicants tracked" value={stats.total} hint={`${stats.active.toLocaleString("en-US")} still waiting`} />
            </div>
            <StatCard icon="checkCircle" tone="good" label="Visas issued" value={stats.issued} />
            <StatCard icon="hourglass" tone="warn" label="Active cases" value={stats.active} />
            <StatCard icon="search" tone="accent" label="Islamabad" value={stats.islamabad} href="/tracker" />
            <StatCard icon="search" tone="neutral" label="Karachi" value={stats.karachi} href="/tracker" />
          </div>
        ) : (
          <Notice tone="error">The database isn&apos;t reachable, so live figures can&apos;t be shown. Check that DATABASE_URL is set and the schema has been pushed.</Notice>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { icon: "search", title: "Check your status", body: "Enter a Tracking ID for the timeline, queue position and an estimate for the next step.", href: "/tracker", cta: "Open tracker" },
          { icon: "chart", title: "Read the trends", body: "Stage durations and consulate comparisons, filterable by the month people joined the list.", href: "/analytics", cta: "View analytics" },
          { icon: "plus", title: "Contribute", body: "Submissions are reviewed before they appear, and you can stay anonymous.", href: "/submit", cta: "Submit an entry" },
        ].map((f) => (
          <Panel key={f.title} className="flex flex-col">
            <Icon name={f.icon as any} className="text-clay-500" />
            <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
            <p className="mt-1 flex-1 text-sm text-ink-700">{f.body}</p>
            <Link href={f.href} className="mt-4 inline-flex min-h-[40px] items-center gap-1 text-sm font-semibold text-ink-800 hover:underline">
              {f.cta} <Icon name="chevronRight" size={16} />
            </Link>
          </Panel>
        ))}
      </section>
    </div>
  );
}
