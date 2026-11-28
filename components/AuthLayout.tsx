import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import Icon, { IconName } from "@/components/ui/Icon";
import GermanFlagBar from "@/components/ui/GermanFlagBar";
import JourneyTimeline from "@/components/auth/JourneyTimeline";

/**
 * Split-screen authentication layout styled after Valley's auth shell:
 * neutral dark charcoal brand panel on desktop with German tricolor strip,
 * neutral light/dark form card with matching tricolor header border.
 */
export default function AuthLayout({
  title,
  subtitle,
  points,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  points: { icon: IconName; text: string }[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-2">
      {/* Left Brand Panel */}
      <aside className="hidden flex-col border-r border-[#272727] bg-[#111111] text-[#FAFAFA] lg:flex">
        <GermanFlagBar />
        <div className="flex flex-1 flex-col justify-between p-12 xl:p-16">
          <Link href="/" className="inline-flex w-fit items-center gap-3">
            <LogoMark size={40} />
            <span className="leading-tight">
              <span className="block text-base font-bold tracking-tight text-[#FAFAFA]">Visa Tracker</span>
              <span className="block text-xs text-[#A3A3A3]">by Idrees</span>
            </span>
          </Link>

          <div className="mx-auto w-full max-w-md space-y-8">
            <div className="text-center">
              <h2 className="text-[28px] font-bold leading-tight tracking-tight text-[#FAFAFA] xl:text-3xl">
                Your German student visa timeline, in one place.
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[#A3A3A3]">
                Community-shared milestones to track queue progress and manage your own application record.
              </p>
            </div>

            <JourneyTimeline mode="illustrative" surface="dark" />

            <ul className="mx-auto max-w-sm space-y-2.5">
              {points.map((p) => (
                <li key={p.text} className="flex items-center gap-3 text-[13px] text-[#D4D4D4]">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#272727] bg-[#1C1C1C] text-[#E5E5E5]">
                    <Icon name={p.icon} size={14} />
                  </span>
                  <span>{p.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-center text-xs text-[#737373]">
            Independent community tracker. Not affiliated with any German embassy or consulate.
          </p>
        </div>
      </aside>

      {/* Right Form Panel */}
      <main className="flex flex-col bg-paper-sunk/40">
        <GermanFlagBar className="lg:hidden" />
        <div className="flex flex-1 flex-col px-4 py-6 sm:px-8">
          <div className="flex h-11 items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <LogoMark size={28} />
              <span className="text-sm font-semibold text-ink-900">Visa Tracker</span>
            </Link>
            <Link href="/tracker" className="inline-flex min-h-[40px] items-center text-xs font-medium text-ink-700 hover:text-ink-900 hover:underline">
              Browse My Journey
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-6">
            <div className="w-full max-w-[440px]">
              <div className="overflow-hidden rounded-2xl border border-line bg-paper-raised">
                <GermanFlagBar />
                <div className="p-6 sm:p-8">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
                    {subtitle && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{subtitle}</p>}
                  </div>
                  <div className="mt-6">{children}</div>
                </div>
              </div>
              {footer && <div className="mt-5 text-center text-[13px] text-ink-600">{footer}</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
