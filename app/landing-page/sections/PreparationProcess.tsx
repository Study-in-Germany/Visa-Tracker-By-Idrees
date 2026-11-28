"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ensureGsapPlugins, gsap } from "../animations/gsap";
import { PREPARATION_STEPS } from "../data/content";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { ArrowRightIcon } from "../components/LandingIcons";

export default function PreparationProcess() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    ensureGsapPlugins();

    const section = sectionRef.current;
    const progressBar = progressBarRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const chapters = section.querySelectorAll<HTMLElement>("[data-process-step]");

      if (progressBar) {
        gsap.set(progressBar, { scaleY: 0.25, transformOrigin: "top center" });
        gsap.to(progressBar, {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 40%",
            end: "bottom 70%",
            scrub: 0.4,
          },
        });
      }

      chapters.forEach((chapter, idx) => {
        gsap.to(chapter, {
          scrollTrigger: {
            trigger: chapter,
            start: "top 55%",
            end: "bottom 45%",
            onEnter: () => setActiveIndex(idx),
            onEnterBack: () => setActiveIndex(idx),
          },
        });
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  const activeChapter = PREPARATION_STEPS[activeIndex] || PREPARATION_STEPS[0];

  return (
    <section
      id="process"
      ref={sectionRef}
      aria-label="From preparation to arrival"
      className="bg-[#F4F4F5] py-20 text-[#0E0E0F] md:py-28 lg:py-32"
    >
      <div className="sig-container">
        <div className="border-b border-[#D4D4D8] pb-8">
          <h2 className="sig-heading-1 max-w-[780px] text-[#0E0E0F]">
            From preparation to arrival, stage by stage.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left sticky oversized numeral, progress rule, and changing photograph */}
          <div className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-24">
              <div className="flex items-start gap-6">
                <div className="relative h-44 w-[2px] shrink-0 overflow-hidden bg-[#D4D4D8]">
                  <div ref={progressBarRef} className="h-full w-full bg-[#C83228]" />
                </div>

                <div>
                  <span className="sig-tabular sig-display-1 block text-[#0E0E0F]">
                    {activeChapter.index}
                  </span>
                  <span className="sig-title-2 mt-2 block text-[#52525B]">
                    {activeChapter.phase}
                  </span>
                </div>
              </div>

              <div className="sig-photo-frame relative mt-8 aspect-[16/10] w-full">
                {PREPARATION_STEPS.map((step, idx) => (
                  <div
                    key={step.index}
                    className="absolute inset-0 h-full w-full transition-opacity duration-500"
                    style={{ opacity: activeIndex === idx ? 1 : 0 }}
                  >
                    <Image
                      src={step.asset.src}
                      alt={step.asset.alt}
                      fill
                      sizes="38vw"
                      className="object-cover object-top"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right narrative chapters — fully readable without watching animations */}
          <div className="lg:col-span-7">
            <ol className="divide-y divide-[#D4D4D8] border-t border-b border-[#D4D4D8]">
              {PREPARATION_STEPS.map((step) => (
                <li
                  key={step.index}
                  data-process-step
                  className="py-10 first:pt-8 last:pb-8 md:py-12"
                >
                  <div className="flex items-baseline gap-4">
                    <span className="sig-tabular sig-heading-4 text-[#C83228]">
                      {step.index}
                    </span>
                    <span className="sig-caption-1 text-[#52525B]">{step.phase}</span>
                  </div>

                  <h3 className="sig-heading-3 mt-3 text-[#0E0E0F]">{step.title}</h3>
                  <p className="sig-body-3 mt-4 max-w-[58ch] text-[#52525B]">
                    {step.summary}
                  </p>

                  <ul className="mt-5 space-y-2 border-l border-[#D4D4D8] pl-4">
                    {step.details.map((line) => (
                      <li key={line} className="sig-body-6 text-[#0E0E0F]">
                        {line}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    {step.routeHref.startsWith("#") ? (
                      <a href={step.routeHref} className="sig-link-line sig-button-sm text-[#0E0E0F]">
                        <span>{step.routeLabel}</span>
                        <ArrowRightIcon size={16} />
                      </a>
                    ) : (
                      <Link href={step.routeHref} className="sig-link-line sig-button-sm text-[#0E0E0F]">
                        <span>{step.routeLabel}</span>
                        <ArrowRightIcon size={16} />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
