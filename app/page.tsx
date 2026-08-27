import Link from "next/link";
import { prisma } from "@/lib/db";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

async function getOverview() {
  try {
    const [total, islamabad, karachi, pending, issued] = await Promise.all([
      prisma.applicant.count({ where: { approval: "APPROVED" } }),
      prisma.applicant.count({ where: { approval: "APPROVED", consulate: "Islamabad" } }),
      prisma.applicant.count({ where: { approval: "APPROVED", consulate: "Karachi" } }),
      prisma.applicant.count({
        where: {
          approval: "APPROVED",
          visaStatus: { notIn: ["VISA_ISSUED", "VISA_REJECTED", "WITHDRAWN"] },
        },
      }),
      prisma.applicant.count({ where: { approval: "APPROVED", visaStatus: "VISA_ISSUED" } }),
    ]);
    return { total, islamabad, karachi, pending, issued };
  } catch {
    // DB not connected yet (e.g. first deploy before env vars are set)
    return { total: 0, islamabad: 0, karachi: 0, pending: 0, issued: 0 };
  }
}

export default async function HomePage() {
  const stats = await getOverview();

  return (
    <div className="space-y-14">
      <section className="text-center max-w-3xl mx-auto pt-6">
        <p className="inline-block text-xs font-semibold tracking-wide uppercase text-navy-700 bg-navy-50 border border-navy-100 px-3 py-1 rounded-full mb-4">
          🇩🇪 {SITE_NAME}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-950 leading-tight">
          Track your German visa journey with real applicant data.
        </h1>
        <p className="mt-4 text-gray-600 text-base sm:text-lg">
          Monitor queue movement, processing trends, estimated timelines, and visa outcomes —
          built by and for the Study in Germany community.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/tracker" className="btn-gold px-6 py-3 text-base">
            Track My Application
          </Link>
          <Link href="/analytics" className="btn-secondary px-6 py-3 text-base">
            Explore Statistics
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-navy-950 mb-4">Current Visa Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard label="Total Applicants" value={stats.total} />
          <StatCard label="Islamabad" value={stats.islamabad} />
          <StatCard label="Karachi" value={stats.karachi} />
          <StatCard label="Pending Cases" value={stats.pending} />
          <StatCard label="Visas Issued" value={stats.issued} />
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-6">
        <FeatureCard
          title="Search your status"
          body="Enter your Tracking ID to see your live status, timeline, and an estimated next-step date."
          href="/tracker"
          cta="Open Tracker"
        />
        <FeatureCard
          title="See the bigger picture"
          body="Queue analytics, processing-time trends, and Islamabad vs Karachi comparisons — updated as new entries come in."
          href="/analytics"
          cta="View Analytics"
        />
        <FeatureCard
          title="Submit your journey"
          body="Add your own entry — it stays private until reviewed, then appears anonymously on the public tracker."
          href="/submit"
          cta="Submit Entry"
        />
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-extrabold text-navy-950">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function FeatureCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="card p-6 flex flex-col">
      <h3 className="font-bold text-navy-950">{title}</h3>
      <p className="text-sm text-gray-600 mt-2 flex-1">{body}</p>
      <Link href={href} className="btn-primary mt-4 self-start">
        {cta}
      </Link>
    </div>
  );
}
