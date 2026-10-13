import { COMMUNITY_LINKS } from "@/lib/constants";
import PageHeader from "@/components/ui/PageHeader";
import Icon, { IconName } from "@/components/ui/Icon";

const RESOURCES: { title: string; body: string; href: string; cta: string; icon: IconName }[] = [
  { title: "WhatsApp community", body: "Ask questions and connect with other applicants in the Study in Germany group.", href: COMMUNITY_LINKS.whatsappCommunity, cta: "Join community", icon: "users" },
  { title: "WhatsApp channel", body: "Broadcast channel for announcements and quick updates.", href: COMMUNITY_LINKS.whatsappChannel, cta: "Follow channel", icon: "bell" },
  { title: "German grade calculator", body: "Convert your grades to the German scale used by universities (modified Bavarian formula).", href: COMMUNITY_LINKS.gradeCalculator, cta: "Open calculator", icon: "chart" },
];

export default function ResourcesPage() {
  return (
    <>
      <PageHeader title="Resources" description="Community links and tools for your Study in Germany journey." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {RESOURCES.map((r) => (
          <a key={r.title} href={r.href} target="_blank" rel="noopener noreferrer" className="card flex flex-col p-4 transition-colors hover:bg-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-clay-50 text-clay-500"><Icon name={r.icon} size={16} /></span>
            <h2 className="mt-3 text-sm font-semibold">{r.title}</h2>
            <p className="mt-1 flex-1 text-[13px] text-mute">{r.body}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink-800">{r.cta} <Icon name="external" size={12} /></span>
          </a>
        ))}
      </div>
    </>
  );
}
