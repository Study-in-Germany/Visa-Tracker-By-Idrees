import Link from "next/link";
import { FOOTER_CONTENT } from "../data/content";
import { ArrowUpRightIcon } from "../components/LandingIcons";

export default function LandingFooter() {
  return (
    <footer className="bg-[#000000] py-16 text-[#FFFFFF]">
      <div className="sig-container">
        <div className="grid grid-cols-1 gap-10 border-b border-[#272727] pb-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="sig-heading-5 text-[#FFFFFF]">{FOOTER_CONTENT.brandTitle}</p>
            <p className="sig-body-6 mt-3 max-w-[34ch] text-[#A1A1AA]">
              {FOOTER_CONTENT.brandNote}
            </p>
          </div>

          <div className="md:col-span-2">
            <p className="sig-caption-3 text-[#71717A]">Sections</p>
            <ul className="mt-4 space-y-2.5">
              {FOOTER_CONTENT.sectionLinks.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="sig-focus-dark sig-body-6 text-[#D4D4D8] transition-colors hover:text-[#FFFFFF]"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="sig-caption-3 text-[#71717A]">Visa tracker</p>
            <ul className="mt-4 space-y-2.5">
              {FOOTER_CONTENT.platformLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="sig-focus-dark sig-body-6 text-[#D4D4D8] transition-colors hover:text-[#FFFFFF]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="sig-caption-3 text-[#71717A]">Student resources</p>
            <ul className="mt-4 space-y-2.5">
              {FOOTER_CONTENT.resourceLinks.map((item) => (
                <li key={item.href}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sig-focus-dark sig-body-6 inline-flex items-center gap-1 text-[#D4D4D8] transition-colors hover:text-[#FFFFFF]"
                    >
                      <span>{item.label}</span>
                      <ArrowUpRightIcon size={13} />
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="sig-focus-dark sig-body-6 text-[#D4D4D8] transition-colors hover:text-[#FFFFFF]"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 text-[12px] text-[#71717A] md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {FOOTER_CONTENT.legalLinks.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sig-focus-dark transition-colors hover:text-[#D4D4D8]"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="sig-focus-dark transition-colors hover:text-[#D4D4D8]"
                >
                  {item.label}
                </Link>
              )
            )}
          </div>
          <p className="max-w-[68ch] text-[#71717A]">{FOOTER_CONTENT.photoCredits}</p>
        </div>
      </div>
    </footer>
  );
}
