"use client";

import { useEffect, useRef } from "react";
import { ensureGsapPlugins, gsap } from "../animations/gsap";
import { TAGLINE_STATEMENT } from "../data/content";
import { useReducedMotion } from "../hooks/useReducedMotion";

export default function TaglineReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const words = TAGLINE_STATEMENT.split(" ");

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const wordNodes = section.querySelectorAll<HTMLElement>("[data-tagline-word]");

    if (reducedMotion) {
      wordNodes.forEach((node) => {
        node.style.opacity = "1";
      });
      return;
    }

    ensureGsapPlugins();

    const ctx = gsap.context(() => {
      gsap.set(wordNodes, { opacity: 0.28 });

      gsap.to(wordNodes, {
        opacity: 1,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section,
          start: "top 75%",
          end: "bottom 42%",
          scrub: 0.45,
        },
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      id="statement"
      ref={sectionRef}
      aria-label="Core preparation statement"
      className="bg-[#FFFFFF] py-20 text-[#0E0E0F] md:py-28 lg:py-36"
    >
      <div className="sig-container">
        <p className="sig-display-3 max-w-[1040px] text-[#0E0E0F]">
          {words.map((word, idx) => (
            <span
              key={`${word}-${idx}`}
              data-tagline-word
              className="inline-block"
              style={{
                opacity: reducedMotion ? 1 : 0.28,
                marginRight: idx === words.length - 1 ? 0 : "0.26em",
              }}
            >
              {word}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
