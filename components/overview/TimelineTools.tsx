import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/Icon";

const tools: { title: string; description: string; href: string; icon: IconName; primary?: boolean }[] = [
  { title: "Timeline calculator", description: "Your estimated visa journey.", href: "/calculator", icon: "calculator", primary: true },
  { title: "Queue progress", description: "Track embassy movement.", href: "/queue-progress", icon: "pulse" },
  { title: "Full analytics", description: "Historical processing trends.", href: "/analytics", icon: "chart" },
];

export default function TimelineTools() {
  return <section className="card p-4 sm:p-5" aria-labelledby="timeline-tools-heading">
    <h2 id="timeline-tools-heading" className="text-[18px] font-semibold text-ink-900">Explore timeline tools</h2>
    <div className="mt-3 space-y-2">
      {tools.map((tool) => <Link key={tool.href} href={tool.href} data-testid={tool.primary ? "timeline-calculator-card" : undefined} className={`tool-card-link group relative flex min-h-[82px] items-center gap-3 rounded-xl border border-line p-3.5 transition-colors duration-150 motion-reduce:transition-none ${tool.primary ? "tool-card-primary" : "tool-card-secondary"}`}>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tool.primary ? "tool-card-primary-icon" : "tool-card-secondary-icon"}`}><Icon name={tool.icon} size={20}/></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{tool.title}</span><span className={`mt-0.5 block text-xs ${tool.primary ? "tool-card-primary-description" : "tool-card-secondary-description"}`}>{tool.description}</span></span>
        <Icon name="arrowUpRight" size={16} className="text-current opacity-80 transition-transform duration-150 motion-reduce:transition-none group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/>
      </Link>)}
    </div>
  </section>;
}
