"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ensureGsapPlugins, gsap } from "../animations/gsap";
import { HERO_CONTENT, LANDING_ASSETS } from "../data/content";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { ArrowRightIcon, ArrowUpRightIcon } from "../components/LandingIcons";

export default function HeroArrival() {
  const sectionRef = useRef<HTMLElement>(null);
  const photoWrapRef = useRef<HTMLDivElement>(null);
  const photoInnerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    ensureGsapPlugins();

    const section = sectionRef.current;
    const photoWrap = photoWrapRef.current;
    const photoInner = photoInnerRef.current;
    const content = contentRef.current;
    if (!section || !photoWrap || !photoInner || !content) return;

    const ctx = gsap.context(() => {
      // Initial calm entrance of clipped upright headline lines
      const lines = content.querySelectorAll<HTMLElement>("[data-hero-reveal]");
      gsap.fromTo(
        lines,
        { yPercent: 105, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.72,
          stagger: 0.08,
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      );

      // Scroll-linked photographic crop & scale transition into the next chapter
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: 0.7,
        },
      });

      tl.to(
        photoInner,
        {
          scale: 1.12,
          yPercent: 8,
          ease: "none",
        },
        0
      )
        .to(
          photoWrap,
          {
            clipPath: "inset(0% 2.5% 4% 2.5%)",
            ease: "none",
          },
          0
        )
        .to(
          content,
          {
            yPercent: -10,
            opacity: 0.25,
            ease: "none",
          },
          0
        );
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      id="arrival"
      ref={sectionRef}
      aria-label="Arrival"
      className="relative flex min-h-[100dvh] flex-col justify-end overflow-hidden bg-[#181818] text-[#FFFFFF]"
    >
      {/* Full-bleed German Koblenz/Rhine photography with scroll-driven crop */}
      <div
        ref={photoWrapRef}
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: "inset(0% 0% 0% 0%)" }}
      >
        <div ref={photoInnerRef} className="relative h-full w-full">
          <Image
            src={LANDING_ASSETS.heroKoblenz.src}
            alt={LANDING_ASSETS.heroKoblenz.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Scrim for high typographic legibility without background gradient blur */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(12, 12, 14, 0.56)" }}
          />
        </div>
      </div>

      {/* Layered architectural typography */}
      <div
        ref={contentRef}
        className="sig-container relative z-10 pb-12 pt-28 md:pb-16 lg:pb-20"
      >
        <div className="max-w-[960px]">
          <h1 className="sig-display-1 text-[#FFFFFF]">
            <span className="block overflow-hidden pb-1">
              <span data-hero-reveal className="block">
                {HERO_CONTENT.headlineLineOne}
              </span>
            </span>
            <span className="block overflow-hidden pb-2">
              <span data-hero-reveal className="block">
                {HERO_CONTENT.headlineLineTwo}
              </span>
            </span>
          </h1>

          <div className="mt-6 max-w-[620px] overflow-hidden md:mt-8">
            <p data-hero-reveal className="sig-title-1 text-[#E4E4E7]">
              {HERO_CONTENT.summary}
            </p>
          </div>

          <div
            data-hero-reveal
            className="mt-8 flex flex-wrap items-center gap-3 md:mt-10 md:gap-4"
          >
            <a href={HERO_CONTENT.primaryAction.href} className="sig-btn-primary">
              <span>{HERO_CONTENT.primaryAction.label}</span>
              <ArrowRightIcon size={17} />
            </a>

            <Link
              href={HERO_CONTENT.secondaryAction.href}
              className="sig-btn-secondary-dark"
            >
              <span>{HERO_CONTENT.secondaryAction.label}</span>
              <ArrowUpRightIcon size={16} />
            </Link>
          </div>
        </div>

        {/* Quiet location & scroll anchor strip */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[#2E2E32] pt-4 text-[13px] text-[#D4D4D8] md:mt-16">
          <span>Koblenz, Rhineland Palatinate</span>
          <a
            href="#statement"
            className="sig-focus-dark inline-flex items-center gap-2 text-[#FFFFFF] transition-opacity hover:opacity-75"
          >
            <span>Scroll to explore the journey</span>
          </a>
        </div>
      </div>
    </section>
  );
}
