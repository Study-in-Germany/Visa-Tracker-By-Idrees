import Link from "next/link";
import { COMMUNITY_LINKS } from "@/lib/constants";
import { WHATSAPP_CHANNELS, WHATSAPP_COMMUNITIES } from "@/lib/whatsapp";
import PageHeader from "@/components/ui/PageHeader";
import Icon, { type IconName } from "@/components/ui/Icon";
import WhatsAppResourceCard from "@/components/resources/WhatsAppResourceCard";

type ToolItem = {
  title: string;
  body: string;
  href: string;
  icon: IconName;
};

const TOOLS: ToolItem[] = [
  {
    title: "My Journey",
    body: "Browse approved timelines and search by Tracking ID.",
    href: "/tracker",
    icon: "route",
  },
  {
    title: "Queue progress",
    body: "How fast the waiting list is moving at each embassy.",
    href: "/queue-progress",
    icon: "queue",
  },
  {
    title: "Universities",
    body: "German universities, programmes, and deadlines in one place.",
    href: "/universities",
    icon: "school",
  },
  {
    title: "Accommodation",
    body: "Find a room, or post what you are looking for.",
    href: "/accommodation",
    icon: "building",
  },
  {
    title: "Analytics",
    body: "Processing times and outcomes, month by month.",
    href: "/analytics",
    icon: "chart",
  },
  {
    title: "Submit your entry",
    body: "Add your timeline so other applicants know what to expect.",
    href: "/submit",
    icon: "filePlus",
  },
];

export default function ResourcesPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Resources" />

      {/* Section 1: WhatsApp channels */}
      <section aria-label="WhatsApp channels">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-mute">
          WhatsApp channels
        </h2>
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-4">
          {WHATSAPP_CHANNELS.map((item) => (
            <WhatsAppResourceCard
              key={item.id}
              kind={item.kind}
              classification={item.classification}
              title={item.title}
              description={item.description}
              metaLabel={item.metaLabel}
              metaIcon={item.metaIcon}
              ctaLabel={item.ctaLabel}
              href={item.href}
              variant={item.variant}
            />
          ))}
        </div>
      </section>

      {/* Section 2: WhatsApp communities */}
      <section aria-label="WhatsApp communities">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-mute">
          WhatsApp communities
        </h2>
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3 md:gap-4">
          {WHATSAPP_COMMUNITIES.map((item) => (
            <WhatsAppResourceCard
              key={item.id}
              kind={item.kind}
              classification={item.classification}
              title={item.title}
              description={item.description}
              metaLabel={item.metaLabel}
              metaIcon={item.metaIcon}
              ctaLabel={item.ctaLabel}
              href={item.href}
              variant={item.variant}
            />
          ))}
        </div>
        <p className="mt-2.5 text-[12px] text-mute">
          Community-operated WhatsApp resources. Independent from WhatsApp and the German Embassy.
        </p>
      </section>

      {/* Section 2: Featured external tool */}
      <section aria-label="Featured tool">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-mute">
          Featured tool
        </h2>
        <article className="group relative flex flex-col gap-4 rounded-[18px] border border-line bg-card p-4 transition-colors hover:bg-[rgb(var(--hover))] sm:p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-paper-sunk text-ink-800">
              <Icon name="calculator" size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[17px] font-semibold leading-snug text-ink-900">
                German grade calculator
              </h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-mute">
                Convert your grades to the German scale universities use (modified Bavarian formula).
              </p>
            </div>
          </div>

          <a
            href={COMMUNITY_LINKS.gradeCalculator}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open German grade calculator (opens in new tab)"
            className="btn-secondary inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold after:absolute after:inset-0 after:rounded-[18px] md:w-auto"
          >
            <span>Open calculator</span>
            <Icon name="arrowUpRight" size={16} />
          </a>
        </article>
      </section>

      {/* Section 3: Internal Visa Tracker tools */}
      <section aria-label="Visa Tracker tools">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-mute">
          Visa Tracker tools
        </h2>

        {/* Mobile grouped navigation rows */}
        <ul
          data-resources-mobile-tools
          className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card md:hidden"
        >
          {TOOLS.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="flex min-h-[56px] items-center gap-3 px-4 py-3 transition-colors hover:bg-[rgb(var(--hover))] active:bg-[rgb(var(--hover))]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-paper-sunk text-ink-800">
                  <Icon name={tool.icon} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink-900">
                    {tool.title}
                  </span>
                  <span className="block truncate text-[12px] text-mute">
                    {tool.body}
                  </span>
                </span>
                <Icon name="chevronRight" size={16} className="shrink-0 text-mute" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Tablet & Desktop compact neutral grid */}
        <div
          data-resources-desktop-tools
          className="hidden gap-3.5 md:grid md:grid-cols-2 lg:grid-cols-3"
        >
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex flex-col rounded-2xl border border-line bg-card p-4 transition-colors hover:bg-[rgb(var(--hover))]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-paper-sunk text-ink-800">
                  <Icon name={tool.icon} size={18} />
                </span>
                <Icon
                  name="chevronRight"
                  size={16}
                  className="mt-1 shrink-0 text-mute transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink-900"
                />
              </div>
              <h3 className="mt-3 text-[15px] font-semibold text-ink-900">{tool.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-mute">{tool.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
