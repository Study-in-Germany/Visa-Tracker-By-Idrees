import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { COMMUNITY_LINKS } from "@/lib/constants";
import { WHATSAPP_CHANNELS, WHATSAPP_COMMUNITIES } from "@/lib/whatsapp";
import WhatsAppResourceCard from "@/components/resources/WhatsAppResourceCard";

export default function CommunityResources() {
  const featuredCommunity = WHATSAPP_COMMUNITIES[0];
  const featuredChannel = WHATSAPP_CHANNELS[0];

  return (
    <section aria-labelledby="community-resources-heading">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 id="community-resources-heading" className="text-[18px] font-semibold text-ink-900">
          Community &amp; resources
        </h2>
        <Link
          href="/resources"
          className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-700"
        >
          All resources <Icon name="arrowUpRight" size={14} />
        </Link>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <WhatsAppResourceCard
          kind={featuredCommunity.kind}
          classification="Community"
          title={featuredCommunity.title}
          description="Connect with applicants."
          metaLabel={featuredCommunity.metaLabel}
          metaIcon={featuredCommunity.metaIcon}
          ctaLabel={featuredCommunity.ctaLabel}
          href={featuredCommunity.href}
          variant="outlined"
          compact
        />
        <WhatsAppResourceCard
          kind={featuredChannel.kind}
          classification="Channel"
          title={featuredChannel.title}
          description="Announcements & updates."
          metaLabel={featuredChannel.metaLabel}
          metaIcon={featuredChannel.metaIcon}
          ctaLabel={featuredChannel.ctaLabel}
          href={featuredChannel.href}
          variant="filled"
          compact
        />
        <article className="flex min-h-52 flex-col rounded-[18px] border border-line bg-paper-sunk p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-card text-ink-800">
              <Icon name="calculator" size={20} />
            </span>
            <Icon name="arrowUpRight" size={15} className="text-mute" />
          </div>
          <div className="mt-3 flex-1">
            <h3 className="text-[15px] font-semibold text-ink-900">Grade calculator</h3>
            <p className="mt-1 text-xs text-mute">Convert to German grades.</p>
          </div>
          <a
            href={COMMUNITY_LINKS.gradeCalculator}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-4 min-h-11 w-full justify-center text-sm"
          >
            Calculate grade
          </a>
        </article>
      </div>
    </section>
  );
}
