"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ensureGsapPlugins, gsap } from "../animations/gsap";
import { LIFE_IN_GERMANY_PANELS } from "../data/content";
import { useReducedMotion } from "../hooks/useReducedMotion";

export default function LifeInGermany() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    ensureGsapPlugins();

    const section = sectionRef.current;
    const pin = pinRef.current;
    const track = trackRef.current;
    const progress = progressRef.current;
    if (!section || !pin || !track) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      const getDistance = () => Math.max(0, track.scrollWidth - window.innerWidth + 96);
      const count = LIFE_IN_GERMANY_PANELS.length;

      if (progress) {
        gsap.set(progress, { scaleX: 1 / count, transformOrigin: "left center" });
      }

      const tween = gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: () => `+=${Math.max(1200, getDistance())}`,
          pin: true,
          scrub: 0.85,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            const idx = Math.min(count - 1, Math.floor(self.progress * count));
            setActivePanel((prev) => (prev === idx ? prev : idx));
            if (progress) {
              const frac = (1 + self.progress * (count - 1)) / count;
              gsap.set(progress, { scaleX: Math.min(1, Math.max(1 / count, frac)) });
            }
          },
        },
      });

      return () => {
        tween.kill();
      };
    });

    return () => mm.revert();
  }, [reducedMotion]);

  return (
    <section
      id="life-in-germany"
      ref={sectionRef}
      aria-label="Life in Germany"
      className="bg-[#FFFFFF] text-[#0E0E0F]"
    >
      {/* Desktop: finite scroll-driven horizontal exhibition */}
      <div
        ref={pinRef}
        className={`${reducedMotion ? "hidden" : "hidden lg:flex"} min-h-[100dvh] flex-col justify-center overflow-hidden py-16`}
      >
        <div className="sig-container mb-8 flex items-end justify-between gap-8 border-b border-[#D4D4D8] pb-5">
          <div>
            <h2 className="sig-heading-2 text-[#0E0E0F]">Life in Germany</h2>
            <p className="sig-body-3 mt-2 max-w-[54ch] text-[#52525B]">
              University towns, regional rail links, reading rooms, and everyday student neighborhoods across Germany.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <a
              href="#process"
              className="sig-focus-light sig-caption-4 text-[#52525B] underline underline-offset-4 hover:text-[#0E0E0F]"
            >
              Skip gallery
            </a>
            <span className="sig-tabular sig-title-4 text-[#0E0E0F]">
              0{activePanel + 1} / 0{LIFE_IN_GERMANY_PANELS.length}
            </span>
            <div className="h-[2px] w-28 overflow-hidden bg-[#D4D4D8]">
              <div ref={progressRef} className="h-full w-full bg-[#C83228]" />
            </div>
          </div>
        </div>

        <div className="w-full overflow-hidden pl-12">
          <div
            ref={trackRef}
            className="flex w-max items-stretch gap-8 pr-16"
          >
            {LIFE_IN_GERMANY_PANELS.map((panel) => (
              <article
                key={panel.index}
                className="flex w-[62vw] max-w-[760px] shrink-0 flex-col justify-between"
              >
                <div className="sig-photo-frame relative aspect-[16/10] w-full">
                  <Image
                    src={panel.asset.src}
                    alt={panel.asset.alt}
                    fill
                    sizes="62vw"
                    className="object-cover object-center"
                  />
                </div>
                <div className="mt-5 grid grid-cols-12 items-baseline gap-4">
                  <div className="col-span-5">
                    <span className="sig-tabular sig-caption-3 block text-[#C83228]">
                      {panel.index} · {panel.location}
                    </span>
                    <h3 className="sig-heading-4 mt-1.5 text-[#0E0E0F]">{panel.title}</h3>
                  </div>
                  <p className="sig-body-6 col-span-7 text-[#52525B]">{panel.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile & reduced-motion: natural vertical photographic story */}
      <div className={`${reducedMotion ? "block" : "block lg:hidden"} py-16 md:py-24`}>
        <div className="sig-container">
          <div className="mb-10 border-b border-[#D4D4D8] pb-5">
            <h2 className="sig-heading-1 text-[#0E0E0F]">Life in Germany</h2>
            <p className="sig-body-3 mt-3 max-w-[54ch] text-[#52525B]">
              University towns, regional rail links, reading rooms, and everyday student neighborhoods across Germany.
            </p>
          </div>

          <div className="space-y-12">
            {LIFE_IN_GERMANY_PANELS.map((panel) => (
              <article key={panel.index} className="space-y-4">
                <div className="sig-photo-frame relative aspect-[16/10] w-full">
                  <Image
                    src={panel.asset.src}
                    alt={panel.asset.alt}
                    fill
                    sizes="100vw"
                    className="object-cover object-center"
                  />
                </div>
                <div>
                  <span className="sig-tabular sig-caption-3 block text-[#C83228]">
                    {panel.index} · {panel.location}
                  </span>
                  <h3 className="sig-heading-4 mt-1.5 text-[#0E0E0F]">{panel.title}</h3>
                  <p className="sig-body-3 mt-2 text-[#52525B]">{panel.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
