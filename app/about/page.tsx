import Link from "next/link";
import { prisma } from "@/lib/db";
import { ACTIVE_STATUSES, COMMUNITY_LINKS, SITE_NAME } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import Icon, { IconName } from "@/components/ui/Icon";
import { LogoMark } from "@/components/Logo";

export const dynamic = "force-dynamic";

async function getStats() {
  try {
    const approved = { approval: "APPROVED" as const };
    const [total, active, issued, universities] = await Promise.all([
      prisma.applicant.count({ where: approved }),
      prisma.applicant.count({ where: { ...approved, visaStatus: { in: ACTIVE_STATUSES as any } } }),
      prisma.applicant.count({ where: { ...approved, visaStatus: "VISA_ISSUED" } }),
      prisma.applicant.findMany({ where: { ...approved, university: { not: null } }, distinct: ["university"], select: { university: true } }),
    ]);
    return { total, active, issued, universities: universities.length };
  } catch (e) {
    console.error("[about] stats query failed", e);
    return null;
  }
}

const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: "send", title: "Applicants share", body: "Students add their own dates: waiting list, invitation, documents, appointment, decision." },
  { icon: "shield", title: "Admins review", body: "Every entry is checked before it is visible. Nothing goes public automatically." },
  { icon: "chart", title: "Patterns appear", body: "Approved entries become queue movement, stage durations and embassy comparisons." },
  { icon: "clock", title: "You plan ahead", body: "Use the numbers and your own estimate to judge how long your next step may take." },
];

const PUBLIC_ITEMS = ["Tracking ID", "University and program", "Embassy and intake", "Journey dates and status"];
const PRIVATE_ITEMS = ["Your email address", "Your access code", "Admin notes about your entry", "Your name, if you choose to hide it"];

export default async function AboutPage() {
  const stats = await getStats();

  return (
    <>
      <PageHeader title={`About ${SITE_NAME}`} description="A community-run tracker for the German national student visa in Pakistan." />

      {/* Mission */}
      <section className="card mb-3 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <LogoMark size={56} className="shrink-0" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug">Real timelines from real applicants, instead of rumours.</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-ink-700">
            Waiting for a visa appointment is mostly guesswork. {SITE_NAME} puts applicant-reported journeys side by side so everyone can see how long each stage is actually taking, at each embassy, right now.
          </p>
        </div>
        <Link href="/analytics" className="btn-primary shrink-0 sm:ml-auto">See the numbers</Link>
      </section>

      {stats && (
        <section aria-label="Community numbers" className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon="users" tone="sage" label="Journeys shared" value={stats.total} />
          <StatCard icon="hourglass" tone="warn" label="Still waiting" value={stats.active} />
          <StatCard icon="checkCircle" tone="good" label="Visas issued" value={stats.issued} />
          <StatCard icon="layers" tone="accent" label="Universities" value={stats.universities} />
        </section>
      )}

      {/* How it works */}
      <Panel title="How it works" className="mb-3">
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-clay-50 text-clay-500">
                <Icon name={s.icon} size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">Step {i + 1}</p>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="mt-0.5 text-[13px] text-mute">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      {/* Privacy */}
      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <Panel title="Visible on the public tracker">
          <ul className="space-y-2">
            {PUBLIC_ITEMS.map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[13px]">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Icon name="check" size={12} strokeWidth={3} /></span>
                {t}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Always private">
          <ul className="space-y-2">
            {PRIVATE_ITEMS.map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[13px]">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-paper-sunk text-ink-700"><Icon name="shield" size={12} /></span>
                {t}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Join + disclaimer */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Be part of it">
          <p className="text-[13px] text-ink-700">The more journeys are shared, the more accurate the estimates get. Adding yours takes about two minutes.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/submit" className="btn-gold"><Icon name="plus" size={14} /> Submit your journey</Link>
            <a href={COMMUNITY_LINKS.whatsappCommunity} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              WhatsApp community <Icon name="external" size={12} />
            </a>
          </div>
        </Panel>
        <section className="card border-ochre-500/30 bg-ochre-50/60 p-4">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ochre-700">
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
