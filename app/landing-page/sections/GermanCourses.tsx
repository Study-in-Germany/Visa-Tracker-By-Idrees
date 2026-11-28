"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ensureGsapPlugins, gsap } from "../animations/gsap";
import { GERMAN_COURSES_CONTENT, LANDING_ASSETS } from "../data/content";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { ArrowUpRightIcon, WhatsAppGlyph } from "../components/LandingIcons";

export default function GermanCourses() {
  const sectionRef = useRef<HTMLElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    ensureGsapPlugins();

    const section = sectionRef.current;
    const photo = photoRef.current;
    if (!section || !photo) return;

    const ctx = gsap.context(() => {
      const rows = section.querySelectorAll<HTMLElement>("[data-course-row]");
      rows.forEach((row) => {
        gsap.fromTo(
          row,
          { opacity: 0.25, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: "power2.out",
            scrollTrigger: {
              trigger: row,
              start: "top 82%",
              end: "top 55%",
              scrub: 0.4,
            },
          }
        );
      });

      gsap.fromTo(
        photo,
        { scale: 1.08 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      id="courses"
      ref={sectionRef}
      aria-label="German language courses"
      className="bg-[#FFFFFF] py-20 text-[#0E0E0F] md:py-28 lg:py-32"
    >
      <div className="sig-container">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left sticky editorial visual anchor */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <h2 className="sig-heading-1 text-[#0E0E0F]">
                {GERMAN_COURSES_CONTENT.heading}
              </h2>
              <p className="sig-body-3 mt-5 max-w-[44ch] text-[#52525B]">
                {GERMAN_COURSES_CONTENT.intro}
              </p>

              <div className="sig-photo-frame mt-8 aspect-[4/3] w-full">
                <div ref={photoRef} className="relative h-full w-full">
                  <Image
                    src={LANDING_ASSETS.germanClassroom.src}
                    alt={LANDING_ASSETS.germanClassroom.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover object-center"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={GERMAN_COURSES_CONTENT.primaryAction.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sig-btn-primary"
                >
                  <WhatsAppGlyph size={17} />
                  <span>{GERMAN_COURSES_CONTENT.primaryAction.label}</span>
                </a>
                <a
                  href={GERMAN_COURSES_CONTENT.secondaryAction.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sig-btn-secondary-light"
                >
                  <span>{GERMAN_COURSES_CONTENT.secondaryAction.label}</span>
                  <ArrowUpRightIcon size={15} />
                </a>
              </div>
            </div>
          </div>

          {/* Right structured hairline specification ledger */}
          <div className="lg:col-span-7">
            <div className="border-t border-[#D4D4D8]">
              {GERMAN_COURSES_CONTENT.specs.map((row) => (
                <article
                  key={row.index}
                  data-course-row
                  className="grid grid-cols-1 gap-3 border-b border-[#D4D4D8] py-8 md:grid-cols-12 md:gap-6 md:py-10"
                >
                  <div className="flex items-baseline gap-3 md:col-span-4">
                    <span className="sig-tabular sig-caption-3 text-[#C83228]">
                      {row.index}
                    </span>
                    <span className="sig-caption-1 text-[#52525B]">{row.label}</span>
                  </div>
                  <div className="md:col-span-8">
                    <h3 className="sig-heading-4 text-[#0E0E0F]">{row.heading}</h3>
                    <p className="sig-body-3 mt-3 max-w-[54ch] text-[#52525B]">
                      {row.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
