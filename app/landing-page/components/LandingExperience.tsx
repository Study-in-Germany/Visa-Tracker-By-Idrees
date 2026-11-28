"use client";

import { useEffect, useRef, useState } from "react";
import {
  ensureGsapPlugins,
  gsap,
  refreshScrollTriggersWhenReady,
} from "../animations/gsap";
import FloatingMorphNav from "./FloatingMorphNav";
import HeroArrival from "../sections/HeroArrival";
import TaglineReveal from "../sections/TaglineReveal";
import OfferShowcase from "../sections/OfferShowcase";
import GermanCourses from "../sections/GermanCourses";
import VisaTrackerReveal from "../sections/VisaTrackerReveal";
import LifeInGermany from "../sections/LifeInGermany";
import PreparationProcess from "../sections/PreparationProcess";
import AboutTrust from "../sections/AboutTrust";
import ClosingContact from "../sections/ClosingContact";
import LandingFooter from "../sections/LandingFooter";

const TRACKED_SECTION_IDS = [
  "arrival",
  "offer",
  "courses",
  "visa-tracker",
  "about",
  "contact",
];

export default function LandingExperience() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeHref, setActiveHref] = useState("#arrival");

  useEffect(() => {
    ensureGsapPlugins();
    const cancelReadyRefresh = refreshScrollTriggersWhenReady();

    const root = rootRef.current;
    if (!root) return cancelReadyRefresh;

    const ctx = gsap.context(() => {
      TRACKED_SECTION_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        gsap.to(el, {
          scrollTrigger: {
            trigger: el,
            start: "top 45%",
            end: "bottom 45%",
            onEnter: () => setActiveHref(`#${id}`),
            onEnterBack: () => setActiveHref(`#${id}`),
          },
        });
      });
    }, root);

    return () => {
      cancelReadyRefresh();
      ctx.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className="sig-landing">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-[4px] focus:bg-[#181818] focus:px-4 focus:py-2.5 focus:text-[14px] focus:font-semibold focus:text-[#FFFFFF]"
      >
        Skip to content
      </a>

      <FloatingMorphNav activeHref={activeHref} />

      <main id="landing-main">
        <HeroArrival />
        <TaglineReveal />
        <OfferShowcase />
        <GermanCourses />
        <VisaTrackerReveal />
        <LifeInGermany />
        <PreparationProcess />
        <AboutTrust />
        <ClosingContact />
      </main>

      <LandingFooter />
    </div>
  );
}
