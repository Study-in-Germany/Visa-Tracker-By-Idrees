import { COMMUNITY_LINKS } from "@/lib/constants";

const RESOURCES = [
  {
    title: "WhatsApp Community",
    body: "Join the Study in Germany — Community & Guidance group to ask questions and connect with other applicants.",
    href: COMMUNITY_LINKS.whatsappCommunity,
    cta: "Join Community",
  },
  {
    title: "WhatsApp Channel",
    body: "Follow the broadcast channel for announcements and quick updates.",
    href: COMMUNITY_LINKS.whatsappChannel,
    cta: "Follow Channel",
  },
  {
    title: "German Grade Calculator",
    body: "Convert your academic grades into the German grading scale used by universities (uni-assist / modified Bavarian formula).",
    href: COMMUNITY_LINKS.gradeCalculator,
    cta: "Open Calculator",
  },
];

export default function ResourcesPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">Resources</h1>
        <p className="text-gray-600 text-sm mt-1">
          Community links and tools to help with your Study in Germany journey.
        </p>
      </div>
      <div className="space-y-4">
        {RESOURCES.map((r) => (
          <a
            key={r.title}
            href={r.href}
            target="_blank"
            rel="noopener noreferrer"
            className="card p-5 flex items-center justify-between gap-4 hover:border-navy-300 transition-colors"
          >
            <div>
              <h2 className="font-bold text-navy-950">{r.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{r.body}</p>
            </div>
            <span className="btn-secondary shrink-0">{r.cta}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
