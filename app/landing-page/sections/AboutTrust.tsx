"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ABOUT_TRUST_CONTENT, LANDING_ASSETS } from "../data/content";
import { ArrowUpRightIcon, PlusMinusIcon } from "../components/LandingIcons";

export default function AboutTrust() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const communityDirectory = [
    ...ABOUT_TRUST_CONTENT.channels,
    ...ABOUT_TRUST_CONTENT.communities,
  ];

  return (
    <section
      id="about"
      aria-label="About Idress and questions"
      className="bg-[#FFFFFF] py-20 text-[#0E0E0F] md:py-28 lg:py-32"
    >
      <div className="sig-container">
        {/* Calmer human editorial narrative */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start lg:gap-16">
          <div className="lg:col-span-6">
            <h2 className="sig-heading-1 text-[#0E0E0F]">
              {ABOUT_TRUST_CONTENT.heading}
            </h2>

            <div className="mt-6 space-y-4">
              {ABOUT_TRUST_CONTENT.paragraphs.map((text) => (
                <p key={text} className="sig-body-3 max-w-[56ch] text-[#52525B]">
                  {text}
                </p>
              ))}
            </div>

            {/* Verified transparency statement */}
            <div className="mt-8 border border-[#D4D4D8] bg-[#F4F4F5] p-6">
              <h3 className="sig-title-3 text-[#0E0E0F]">
                {ABOUT_TRUST_CONTENT.disclaimerHeading}
              </h3>
              <p className="sig-body-6 mt-2 text-[#52525B]">
                {ABOUT_TRUST_CONTENT.disclaimerBody}
              </p>
              <div className="mt-4">
                <Link href="/about" className="sig-link-line sig-button-sm text-[#0E0E0F]">
                  <span>Read full transparency notes</span>
                  <ArrowUpRightIcon size={15} />
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="sig-photo-frame relative aspect-[4/3] w-full">
              <Image
                src={LANDING_ASSETS.tuebingenAula.src}
                alt={LANDING_ASSETS.tuebingenAula.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 46vw"
                className="object-cover object-center"
              />
            </div>
          </div>
        </div>

        {/* Verified WhatsApp channels and communities — architectural hairline directory */}
        <div className="mt-20 border-t border-[#D4D4D8] pt-12">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
            <h3 className="sig-heading-3 text-[#0E0E0F]">
              Verified WhatsApp channels and study groups
            </h3>
            <Link href="/resources" className="sig-link-line sig-button-sm text-[#0E0E0F]">
              <span>All resources</span>
              <ArrowUpRightIcon size={15} />
            </Link>
          </div>

          <div className="divide-y divide-[#D4D4D8] border-t border-b border-[#D4D4D8]">
            {communityDirectory.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="sig-focus-light group grid grid-cols-1 items-baseline gap-2 py-5 transition-colors hover:bg-[#F4F4F5] md:grid-cols-12 md:gap-6 md:px-3"
              >
                <span className="sig-caption-3 text-[#52525B] md:col-span-3">
                  {item.classification}
                </span>
                <span className="sig-title-3 text-[#0E0E0F] md:col-span-4">
                  {item.title}
                </span>
                <span className="sig-body-6 text-[#52525B] md:col-span-4">
                  {item.description}
                </span>
                <span className="sig-button-sm inline-flex items-center gap-1.5 text-[#0E0E0F] md:col-span-1 md:justify-end">
                  <span>Join</span>
                  <ArrowUpRightIcon size={14} />
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Frequently asked questions */}
        <div className="mt-20 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h3 className="sig-heading-2 text-[#0E0E0F]">Common questions</h3>
            <p className="sig-body-3 mt-3 text-[#52525B]">
              Plain answers about German courses, community queue estimates, and applicant privacy.
            </p>
          </div>

          <div className="lg:col-span-8">
            <div className="divide-y divide-[#D4D4D8] border-t border-b border-[#D4D4D8]">
              {ABOUT_TRUST_CONTENT.faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={faq.question}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="sig-focus-light flex w-full items-center justify-between gap-6 py-5 text-left"
                    >
                      <span className="sig-title-2 text-[#0E0E0F]">{faq.question}</span>
                      <span className="shrink-0 text-[#0E0E0F]">
                        <PlusMinusIcon open={isOpen} size={18} />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="pb-6 pr-8">
                        <p className="sig-body-3 max-w-[62ch] text-[#52525B]">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
