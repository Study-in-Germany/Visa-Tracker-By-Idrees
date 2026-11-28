"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ensureGsapPlugins, gsap } from "../animations/gsap";
import { LANDING_ASSETS, VISA_TRACKER_CONTENT } from "../data/content";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { ArrowRightIcon, ArrowUpRightIcon } from "../components/LandingIcons";

const SCREEN_ASSETS = {
  overview: LANDING_ASSETS.trackerOverview,
  journey: LANDING_ASSETS.trackerJourney,
  analytics: LANDING_ASSETS.trackerAnalytics,
};

export default function VisaTrackerReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cropStageRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    ensureGsapPlugins();

    const section = sectionRef.current;
    const frame = frameRef.current;
    const cropStage = cropStageRef.current;
    if (!section || !frame || !cropStage) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      const steps = section.querySelectorAll<HTMLElement>("[data-tracker-step]");

      // Start as a focused detail crop of the real overview screenshot, then reveal full product
      gsap.set(cropStage, { scale: 1.24, transformOrigin: "28% 30%" });

      gsap.to(cropStage, {
        scale: 1,
        ease: "none",
        scrollTrigger: {
          trigger: frame,
          start: "top 85%",
          end: "top 25%",
          scrub: 0.65,
        },
      });

      steps.forEach((stepEl, idx) => {
        gsap.to(stepEl, {
          scrollTrigger: {
            trigger: stepEl,
            start: "top 58%",
            end: "bottom 42%",
            onEnter: () => setActiveStep(idx),
            onEnterBack: () => setActiveStep(idx),
          },
        });
      });
    });

    return () => mm.revert();
  }, [reducedMotion]);

  const currentStep = VISA_TRACKER_CONTENT.steps[activeStep] || VISA_TRACKER_CONTENT.steps[0];
  const currentAsset = SCREEN_ASSETS[currentStep.screenKey];

  return (
    <section
      id="visa-tracker"
      ref={sectionRef}
      aria-label="Visa tracker product showcase"
      className="bg-[#181818] py-20 text-[#FFFFFF] md:py-28 lg:py-32"
    >
      <div className="sig-container">
        {/* Section header */}
        <div className="grid grid-cols-1 gap-6 border-b border-[#272727] pb-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h2 className="sig-heading-1 text-[#FFFFFF]">
              {VISA_TRACKER_CONTENT.heading}
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="sig-body-3 text-[#A1A1AA]">{VISA_TRACKER_CONTENT.intro}</p>
          </div>
        </div>

        {/* Scroll-driven real product presentation */}
        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
          {/* Left 4 columns: Contextual feature progression */}
          <div className="lg:col-span-4">
            <div className="divide-y divide-[#272727] border-t border-b border-[#272727]">
              {VISA_TRACKER_CONTENT.steps.map((step, idx) => {
                const isSelected = activeStep === idx;
                return (
                  <button
                    key={step.index}
                    type="button"
                    data-tracker-step
                    onClick={() => setActiveStep(idx)}
                    aria-pressed={isSelected}
                    className="sig-focus-dark block w-full py-6 text-left transition-opacity"
                  >
                    <div className="flex items-baseline gap-3">
                      <span
                        className="sig-tabular sig-caption-3"
                        style={{ color: isSelected ? "#C83228" : "#71717A" }}
                      >
                        {step.index}
                      </span>
                      <h3
                        className="sig-heading-5 transition-colors"
                        style={{ color: isSelected ? "#FFFFFF" : "#A1A1AA" }}
                      >
                        {step.title}
                      </h3>
                    </div>
                    <p
                      className="sig-body-6 mt-2.5 pl-7 transition-colors"
                      style={{ color: isSelected ? "#E4E4E7" : "#71717A" }}
                    >
                      {step.body}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={VISA_TRACKER_CONTENT.primaryAction.href} className="sig-btn-primary">
                <span>{VISA_TRACKER_CONTENT.primaryAction.label}</span>
                <ArrowRightIcon size={17} />
              </Link>
              <Link
                href={VISA_TRACKER_CONTENT.secondaryAction.href}
                className="sig-btn-secondary-dark"
              >
                <span>{VISA_TRACKER_CONTENT.secondaryAction.label}</span>
                <ArrowUpRightIcon size={15} />
              </Link>
            </div>
          </div>

          {/* Right 8 columns: Sticky authentic Visa Tracker interface capture */}
          <div className="lg:col-span-8 lg:sticky lg:top-24">
            <div
              ref={frameRef}
              className="overflow-hidden rounded-[4px] border border-[#272727] bg-[#FFFFFF]"
            >
              <div
                ref={cropStageRef}
                className="relative aspect-[16/10] w-full overflow-hidden"
              >
                {Object.entries(SCREEN_ASSETS).map(([key, asset]) => {
                  const visible = currentStep.screenKey === key;
                  return (
                    <div
                      key={key}
                      className="absolute inset-0 h-full w-full transition-opacity duration-500"
                      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
                    >
                      <Image
                        src={asset.src}
                        alt={asset.alt}
                        fill
                        sizes="(max-width: 1024px) 100vw, 64vw"
                        className="object-cover object-top"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#A1A1AA]">
              <span>{currentAsset.alt}</span>
              <span className="sig-tabular">
                View {currentStep.index} / 0{VISA_TRACKER_CONTENT.steps.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
