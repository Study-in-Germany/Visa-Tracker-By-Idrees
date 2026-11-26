import Link from "next/link";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/cache";
import { ACTIVE_STATUSES, COMMUNITY_LINKS, SITE_NAME } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import Icon, { IconName } from "@/components/ui/Icon";
import { LogoMark } from "@/components/Logo";

export const revalidate = 60;

const getAboutStats = unstable_cache(
  async () => {
    const approved = { approval: "APPROVED" as const };
    const [total, active, issued, universities] = await Promise.all([
      prisma.applicant.count({ where: approved }),
      prisma.applicant.count({ where: { ...approved, visaStatus: { in: ACTIVE_STATUSES as any } } }),
      prisma.applicant.count({ where: { ...approved, visaStatus: "VISA_ISSUED" } }),
      prisma.applicant.findMany({ where: { ...approved, university: { not: null } }, distinct: ["university"], select: { university: true } }),
    ]);
    return { total, active, issued, universities: universities.length };
  },
  ["about-stats-v1"],
  { revalidate: 60, tags: [CACHE_TAGS.APPLICANTS] },
);

async function getStats() {
  try {
    return await getAboutStats();
  } catch (e) {
    console.error("[about] stats query failed", e);
    return null;
  }
}

const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: "send", title: "Applicants share", body: "Students submit waiting list, invitation, submission, appointment, and decision dates." },
  { icon: "shield", title: "Admins review", body: "Every entry is checked before publication. Nothing goes public automatically." },
  { icon: "chart", title: "Patterns appear", body: "Approved entries power queue frontiers, stage durations, and embassy comparisons." },
  { icon: "clock", title: "Track progress", body: "Compare timelines and estimate expected waiting windows using observed history." },
];

const PUBLIC_ITEMS = ["Tracking ID", "University and program", "Embassy and intake", "Journey dates and status"];
const PRIVATE_ITEMS = ["Your email address", "Your access code", "Admin notes about your entry", "Your name, if you choose to hide it"];

export default async function AboutPage() {
  const stats = await getStats();

  return (
    <>
      <PageHeader title={`About ${SITE_NAME}`} description="A community-run tracker for the German national student visa in Pakistan." />

      <section className="card mb-4 flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <LogoMark size={48} className="shrink-0" />
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-snug text-ink-900">Community-reported timelines, structured for clarity.</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-ink-600">
            {SITE_NAME} aggregates verified applicant-submitted journeys so students can inspect current embassy queue movement and stage durations.
          </p>
        </div>
        <Link href="/analytics" className="btn-primary shrink-0 sm:ml-auto">View analytics</Link>
      </section>

      {stats && (
        <section aria-label="Community numbers" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon="users" tone="sage" label="Journeys shared" value={stats.total} />
          <StatCard icon="hourglass" tone="warn" label="Still waiting" value={stats.active} />
          <StatCard icon="checkCircle" tone="good" label="Visas issued" value={stats.issued} />
          <StatCard icon="layers" tone="accent" label="Universities" value={stats.universities} />
        </section>
      )}

      <Panel title="How it works" className="mb-4">
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-paper-sunk text-ink-700">
                <Icon name={s.icon} size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">Step {i + 1}</p>
                <h3 className="text-[13px] font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-0.5 text-[12.5px] text-mute">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Panel title="Visible on the public tracker">
          <ul className="space-y-2">
            {PUBLIC_ITEMS.map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[13px]">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700"><Icon name="check" size={12} strokeWidth={3} /></span>
                {t}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Always private">
          <ul className="space-y-2">
            {PRIVATE_ITEMS.map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[13px]">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-paper-sunk text-ink-700"><Icon name="shield" size={12} /></span>
                {t}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Contribute">
          <p className="text-[13px] text-ink-700">Sharing your dates improves queue visibility and waiting-time estimates for everyone.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/submit" className="btn-primary"><Icon name="plus" size={14} /> Submit entry</Link>
            <a href={COMMUNITY_LINKS.whatsappCommunity} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              WhatsApp community <Icon name="external" size={12} />
            </a>
          </div>
        </Panel>
        <section className="card border-line bg-paper-raised p-4">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-700">
            <Icon name="alert" size={13} /> Disclaimer
          </h2>
          <p className="mt-2 text-[13px] text-ink-700">
            This project is independent and community-run. It is not affiliated with or endorsed by the German Federal Foreign Office, any German consulate or any embassy. All figures and estimates are unofficial and for general guidance only.
          </p>
        </section>
      </div>
    </>
  );
}
