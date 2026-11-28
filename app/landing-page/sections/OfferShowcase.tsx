"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ensureGsapPlugins, gsap } from "../animations/gsap";
import { OFFER_CHAPTERS } from "../data/content";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { ArrowRightIcon } from "../components/LandingIcons";

export default function OfferShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinTargetRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    ensureGsapPlugins();

    const section = sectionRef.current;
    const pinTarget = pinTargetRef.current;
    const progressBar = progressBarRef.current;
    if (!section || !pinTarget) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      const total = OFFER_CHAPTERS.length;
      const photoLayers = pinTarget.querySelectorAll<HTMLElement>("[data-offer-photo]");
      const copyPanels = pinTarget.querySelectorAll<HTMLElement>("[data-offer-copy]");

      // Initial state: slide 0 visible, slides 1..4 clipped beneath
      photoLayers.forEach((el, idx) => {
        gsap.set(el, {
          clipPath: idx === 0 ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)",
          zIndex: idx + 1,
        });
      });

      copyPanels.forEach((el, idx) => {
        gsap.set(el, {
          autoAlpha: idx === 0 ? 1 : 0,
          y: idx === 0 ? 0 : 28,
          pointerEvents: idx === 0 ? "auto" : "none",
        });
      });

      if (progressBar) {
        gsap.set(progressBar, { scaleX: 1 / total, transformOrigin: "left center" });
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinTarget,
          start: "top top",
          end: `+=${(total - 1) * 78}%`,
          pin: true,
          scrub: 0.55,
          anticipatePin: 1,
          onUpdate: (self) => {
            const next = Math.min(total - 1, Math.floor(self.progress * total));
            setActiveIndex((prev) => (prev === next ? prev : next));
            if (progressBar) {
              const frac = (1 + self.progress * (total - 1)) / total;
              gsap.set(progressBar, { scaleX: Math.min(1, Math.max(1 / total, frac)) });
            }
          },
        },
      });

      for (let i = 1; i < total; i++) {
        const at = i - 1;
        // Reveal next photograph vertically via clip-path
        tl.to(
          photoLayers[i],
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 1,
            ease: "power2.inOut",
          },
          at
        )
          // Transition previous copy out cleanly
          .to(
            copyPanels[i - 1],
            {
              autoAlpha: 0,
              y: -22,
              pointerEvents: "none",
              duration: 0.35,
              ease: "power2.in",
            },
            at + 0.05
          )
          // Reveal current copy
          .fromTo(
            copyPanels[i],
            { autoAlpha: 0, y: 28, pointerEvents: "none" },
            {
              autoAlpha: 1,
              y: 0,
              pointerEvents: "auto",
              duration: 0.45,
              ease: "power3.out",
            },
            at + 0.42
          );
      }

      return () => {
        tl.kill();
      };
    });

    return () => mm.revert();
  }, [reducedMotion]);

  const activeItem = OFFER_CHAPTERS[activeIndex] || OFFER_CHAPTERS[0];

  return (
    <section
      id="offer"
      ref={sectionRef}
      aria-label="What we offer"
      className="bg-[#F4F4F5] text-[#0E0E0F]"
    >
      {/* Desktop pinned scroll-driven composition */}
      <div
        ref={pinTargetRef}
        className={`${reducedMotion ? "hidden" : "hidden lg:flex"} min-h-[100dvh] flex-col justify-center py-20`}
      >
        <div className="sig-container">
          <div className="mb-8 flex items-end justify-between border-b border-[#D4D4D8] pb-5">
            <h2 className="sig-heading-2 text-[#0E0E0F]">What we offer</h2>
            <div className="flex items-center gap-4">
              <span className="sig-tabular sig-title-4 text-[#0E0E0F]">
                {activeItem.index} / 0{OFFER_CHAPTERS.length}
              </span>
              <div className="h-[2px] w-28 overflow-hidden bg-[#D4D4D8]">
                <div ref={progressBarRef} className="h-full w-full bg-[#C83228]" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 items-center gap-10">
            {/* Left 7 columns: Layered photographic frames */}
            <div className="col-span-7">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[2px] bg-[#181818]">
                {OFFER_CHAPTERS.map((chapter) => (
                  <div
                    key={chapter.index}
                    data-offer-photo
                    className="absolute inset-0 h-full w-full"
                  >
                    <Image
                      src={chapter.asset.src}
                      alt={chapter.asset.alt}
                      fill
                      sizes="58vw"
                      className="object-cover object-center"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right 5 columns: Synchronized editorial descriptions */}
            <div className="relative col-span-5 min-h-[340px]">
              {OFFER_CHAPTERS.map((chapter) => (
                <article
                  key={chapter.index}
                  data-offer-copy
                  className="absolute inset-x-0 top-0 flex flex-col justify-between"
                >
                  <div>
                    <span
                      className="sig-tabular sig-caption-3 block"
                      style={{ color: "#C83228" }}
                    >
                      Service {chapter.index}
                    </span>
                    <h3 className="sig-heading-2 mt-3 text-[#0E0E0F]">{chapter.title}</h3>
                    <p className="sig-title-2 mt-4 text-[#0E0E0F]">{chapter.summary}</p>
                    <p className="sig-body-3 mt-4 max-w-[44ch] text-[#52525B]">
                      {chapter.detail}
                    </p>
                  </div>

                  <div className="mt-8">
                    {chapter.actionHref.startsWith("#") ? (
                      <a href={chapter.actionHref} className="sig-link-line sig-button-sm text-[#0E0E0F]">
                        <span>{chapter.actionLabel}</span>
                        <ArrowRightIcon size={16} />
                      </a>
                    ) : (
                      <Link href={chapter.actionHref} className="sig-link-line sig-button-sm text-[#0E0E0F]">
                        <span>{chapter.actionLabel}</span>
                        <ArrowRightIcon size={16} />
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile & Reduced-motion natural vertical reading sequence */}
      <div className={`${reducedMotion ? "block" : "block lg:hidden"} py-16 md:py-24`}>
        <div className="sig-container">
          <div className="mb-10 border-b border-[#D4D4D8] pb-5">
            <h2 className="sig-heading-1 text-[#0E0E0F]">What we offer</h2>
          </div>

          <div className="space-y-12">
            {OFFER_CHAPTERS.map((chapter) => (
              <article
                key={chapter.index}
                className="grid grid-cols-1 gap-6 border-b border-[#D4D4D8] pb-12 last:border-b-0 last:pb-0 md:grid-cols-12 md:items-center md:gap-8"
              >
                <div className="sig-photo-frame aspect-[16/10] w-full md:col-span-6">
                  <Image
                    src={chapter.asset.src}
                    alt={chapter.asset.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-center"
                  />
                </div>
                <div className="md:col-span-6">
                  <span className="sig-tabular sig-caption-3 block text-[#C83228]">
                    {chapter.index} / 0{OFFER_CHAPTERS.length}
                  </span>
                  <h3 className="sig-heading-3 mt-2 text-[#0E0E0F]">{chapter.title}</h3>
                  <p className="sig-title-3 mt-3 text-[#0E0E0F]">{chapter.summary}</p>
                  <p className="sig-body-3 mt-3 text-[#52525B]">{chapter.detail}</p>
                  <div className="mt-6">
                    {chapter.actionHref.startsWith("#") ? (
                      <a href={chapter.actionHref} className="sig-link-line sig-button-sm text-[#0E0E0F]">
                        <span>{chapter.actionLabel}</span>
                        <ArrowRightIcon size={16} />
                      </a>
                    ) : (
                      <Link href={chapter.actionHref} className="sig-link-line sig-button-sm text-[#0E0E0F]">
                        <span>{chapter.actionLabel}</span>
                        <ArrowRightIcon size={16} />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
