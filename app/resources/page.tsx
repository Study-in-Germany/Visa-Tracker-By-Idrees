import Link from "next/link";
import { COMMUNITY_LINKS } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import Icon, { IconName } from "@/components/ui/Icon";

type Item = { title: string; body: string; href: string; cta: string; icon: IconName; external?: boolean };

const COMMUNITY: Item[] = [
  { title: "WhatsApp community", body: "Ask questions and talk to other applicants in the Study in Germany group.", href: COMMUNITY_LINKS.whatsappCommunity, cta: "Join community", icon: "users", external: true },
  { title: "WhatsApp channel", body: "Announcements and quick updates, without the chat noise.", href: COMMUNITY_LINKS.whatsappChannel, cta: "Follow channel", icon: "bell", external: true },
  { title: "German grade calculator", body: "Convert your grades to the German scale universities use (modified Bavarian formula).", href: COMMUNITY_LINKS.gradeCalculator, cta: "Open calculator", icon: "chart", external: true },
];

const TOOLS: Item[] = [
  { title: "Visa tracker", body: "See where other applicants are in the queue and search by Tracking ID.", href: "/tracker", cta: "Open tracker", icon: "search" },
  { title: "Queue progress", body: "How fast the waiting list is moving at each embassy.", href: "/queue-progress", cta: "See progress", icon: "queue" },
  { title: "Universities", body: "German universities, programmes and application deadlines in one place.", href: "/universities", cta: "Browse universities", icon: "school" },
  { title: "Accommodation", body: "Find a room, or tell people what you are looking for.", href: "/accommodation", cta: "Find a place", icon: "home" },
  { title: "Analytics", body: "Processing times and outcomes, month by month.", href: "/analytics", cta: "View analytics", icon: "pulse" },
  { title: "Submit your entry", body: "Add your own journey so the next applicant knows what to expect.", href: "/submit", cta: "Submit entry", icon: "plus" },
];

function Card({ r }: { r: Item }) {
  const inner = (
    <>
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-clay-50 text-clay-500 transition-transform group-hover:scale-105"><Icon name={r.icon} size={20} /></span>
      <h3 className="mt-4 text-[15px] font-semibold">{r.title}</h3>
      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-mute">{r.body}</p>
      <span className="mt-4 inline-flex min-h-[32px] items-center gap-1.5 text-[13px] font-semibold text-ink-900">
        {r.cta} <Icon name={r.external ? "external" : "chevronRight"} size={13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </>
  );
  const cls = "group card flex flex-col p-5 transition-shadow hover:shadow-md active:scale-[0.99]";
  return r.external ? (
    <a href={r.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  ) : (
    <Link href={r.href} className={cls}>{inner}</Link>
  );
}

function Section({ title, items }: { title: string; items: Item[] }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-mute">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {items.map((r) => <Card key={r.title} r={r} />)}
      </div>
    </section>
  );
}

export default function ResourcesPage() {
  return (
    <>
      <PageHeader title="Resources" />
      <Section title="Community" items={COMMUNITY} />
      <Section title="Tools on this site" items={TOOLS} />
    </>
  );
}
