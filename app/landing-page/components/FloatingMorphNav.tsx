"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ensureGsapPlugins, gsap } from "../animations/gsap";
import { NAV_ENTRIES, type NavEntry } from "../data/content";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { WHATSAPP_CHANNELS, whatsappSupport } from "@/lib/whatsapp";
import { ArrowUpRightIcon } from "./LandingIcons";

interface FloatingMorphNavProps {
  activeHref: string;
}

export default function FloatingMorphNav({ activeHref }: FloatingMorphNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHiddenOnScroll, setIsHiddenOnScroll] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<NavEntry>(NAV_ENTRIES[0]);
  const [announcement, setAnnouncement] = useState("");
  const reducedMotion = useReducedMotion();

  const panelId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const lineTopRef = useRef<HTMLSpanElement>(null);
  const lineBottomRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const isOpenRef = useRef(false);
  const focusInsideRef = useRef(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Sync active entry preview when opening
  useEffect(() => {
    if (isOpen) {
      const active = NAV_ENTRIES.find((item) => item.href === activeHref) || NAV_ENTRIES[0];
      setPreviewEntry(active);
    }
  }, [isOpen, activeHref]);

  // Build reversible GSAP morph timeline responsive to viewport size
  useEffect(() => {
    if (reducedMotion) return;
    ensureGsapPlugins();

    const container = containerRef.current;
    const body = bodyRef.current;
    const divider = dividerRef.current;
    const scrim = scrimRef.current;
    const previewBox = previewBoxRef.current;
    const secondary = secondaryRef.current;
    const lineTop = lineTopRef.current;
    const lineBottom = lineBottomRef.current;

    if (!container || !body || !divider || !scrim || !lineTop || !lineBottom) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        isDesktop: "(min-width: 768px)",
        isMobile: "(max-width: 767px)",
      },
      (context) => {
        const isDesktop = Boolean(context.conditions?.isDesktop);
        const closedWidth = isDesktop ? 560 : Math.min(window.innerWidth - 32, 440);
        const closedHeight = isDesktop ? 60 : 56;
        const expandedWidth = isDesktop ? Math.min(736, window.innerWidth - 48) : window.innerWidth - 24;
        const expandedHeight = isDesktop
          ? Math.max(390, Math.min(476, Math.round(window.innerHeight * 0.51)))
          : Math.min(540, Math.round(window.innerHeight * 0.72));

        gsap.set(container, { width: closedWidth, height: closedHeight });
        gsap.set(body, { autoAlpha: 0, pointerEvents: "none" });
        gsap.set(divider, { scaleX: 0, transformOrigin: "left center" });
        gsap.set(scrim, { autoAlpha: 0, pointerEvents: "none" });
        if (previewBox) gsap.set(previewBox, { opacity: 0, y: 12 });
        if (secondary) gsap.set(secondary, { opacity: 0, y: 8 });

        const linkTexts = container.querySelectorAll<HTMLElement>("[data-nav-link-text]");
        gsap.set(linkTexts, { yPercent: 110 });

        const tl = gsap.timeline({
          paused: true,
          defaults: { ease: "power4.inOut" },
          onReverseComplete: () => {
            gsap.set(body, { autoAlpha: 0, pointerEvents: "none" });
            gsap.set(scrim, { autoAlpha: 0, pointerEvents: "none" });
          },
        });

        tl.set(scrim, { pointerEvents: "auto" }, 0)
          .set(body, { autoAlpha: 1, pointerEvents: "auto" }, 0)
          .to(scrim, { autoAlpha: 1, duration: 0.36, ease: "power2.out" }, 0)
          // 1. Two-line icon morphs to X
          .to(lineTop, { y: 3.5, rotate: 45, duration: 0.34, ease: "power3.inOut" }, 0)
          .to(lineBottom, { y: -3.5, rotate: -45, duration: 0.34, ease: "power3.inOut" }, 0)
          // 2. Integrated container expands horizontally and vertically
          .to(
            container,
            {
              width: expandedWidth,
              height: expandedHeight,
              duration: 0.52,
              ease: "power4.inOut",
            },
            0
          )
          // 3. Structural hairline reveals inner boundary
          .to(divider, { scaleX: 1, duration: 0.38, ease: "power3.out" }, 0.16)
          // 4. Editorial typography enters through clipped masks
          .to(
            linkTexts,
            {
              yPercent: 0,
              duration: 0.42,
              stagger: 0.036,
              ease: "power3.out",
            },
            0.18
          );

        if (previewBox) {
          tl.to(previewBox, { opacity: 1, y: 0, duration: 0.42, ease: "power3.out" }, 0.24);
        }

        if (secondary) {
          tl.to(secondary, { opacity: 1, y: 0, duration: 0.32, ease: "power3.out" }, 0.28);
        }

        tlRef.current = tl;
        if (isOpenRef.current) {
          tl.progress(1);
        }

        return () => {
          tl.kill();
          tlRef.current = null;
        };
      }
    );

    const onResize = () => {
      if (!isOpenRef.current) {
        const isDesktop = window.innerWidth >= 768;
        gsap.set(container, {
          width: isDesktop ? 560 : Math.min(window.innerWidth - 32, 440),
          height: isDesktop ? 60 : 56,
        });
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      mm.revert();
    };
  }, [reducedMotion]);

  const openMenu = useCallback(() => {
    setIsOpen(true);
    setIsHiddenOnScroll(false);
    setAnnouncement("Navigation menu opened");
    if (!reducedMotion && tlRef.current) {
      tlRef.current.play();
    }
  }, [reducedMotion]);

  const closeMenu = useCallback(
    (restoreFocus = false) => {
      setIsOpen(false);
      setAnnouncement("Navigation menu closed");
      if (!reducedMotion && tlRef.current) {
        tlRef.current.reverse();
      }
      if (restoreFocus) {
        requestAnimationFrame(() => toggleBtnRef.current?.focus());
      }
    },
    [reducedMotion]
  );

  const toggleMenu = useCallback(() => {
    if (isOpenRef.current) {
      closeMenu(false);
    } else {
      openMenu();
    }
  }, [openMenu, closeMenu]);

  // Escape dismissal and focus trap when open
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
        return;
      }

      if (event.key === "Tab" && containerRef.current) {
        const focusables = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeMenu]);

  // Scroll-aware visibility with hysteresis to prevent direction jitter
  useEffect(() => {
    let lastY = window.scrollY;
    let anchorY = window.scrollY;
    let ticking = false;

    const evaluate = () => {
      ticking = false;
      const y = window.scrollY;

      if (isOpenRef.current || focusInsideRef.current || y < 140) {
        setIsHiddenOnScroll(false);
        anchorY = y;
        lastY = y;
        return;
      }

      const directionChanged =
        (y > lastY && lastY <= anchorY) || (y < lastY && lastY >= anchorY);
      if (directionChanged) {
        anchorY = y;
      }

      const deltaFromAnchor = y - anchorY;
      if (deltaFromAnchor > 32) {
        setIsHiddenOnScroll(true);
      } else if (deltaFromAnchor < -24) {
        setIsHiddenOnScroll(false);
      }

      lastY = y;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(evaluate);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleAnchorClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      event.preventDefault();
      closeMenu(false);
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      }
    } else {
      closeMenu(false);
    }
  };

  return (
    <>
      {/* Polite state announcement for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Subtle non-blurred outside scrim while expanded */}
      <div
        ref={scrimRef}
        aria-hidden="true"
        onClick={() => closeMenu(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 45,
          backgroundColor: "rgba(0, 0, 0, 0.34)",
          opacity: reducedMotion ? (isOpen ? 1 : 0) : undefined,
          pointerEvents: reducedMotion ? (isOpen ? "auto" : "none") : undefined,
          visibility: reducedMotion ? (isOpen ? "visible" : "hidden") : undefined,
        }}
      />

      {/* Centered floating solid navigation container */}
      <div
        ref={wrapperRef}
        onFocusCapture={() => {
          focusInsideRef.current = true;
          setIsHiddenOnScroll(false);
        }}
        onBlurCapture={(event) => {
          if (!wrapperRef.current?.contains(event.relatedTarget as Node)) {
            focusInsideRef.current = false;
          }
        }}
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          zIndex: 50,
          transform: `translate3d(-50%, ${isHiddenOnScroll && !isOpen ? "-104px" : "0px"}, 0)`,
          transition: reducedMotion
            ? "none"
            : "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <nav
          ref={containerRef}
          aria-label="Primary landing navigation"
          style={{
            backgroundColor: "#181818",
            color: "#FFFFFF",
            border: "1px solid #272727",
            borderRadius: "6px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            ...(reducedMotion
              ? {
                  width: isOpen ? "min(736px, calc(100vw - 24px))" : "min(560px, calc(100vw - 32px))",
                  height: isOpen ? "min(476px, 70dvh)" : "58px",
                }
              : {}),
          }}
        >
          {/* Persistent top control bar */}
          <div
            className="flex shrink-0 items-center justify-between gap-3 px-4 md:px-5"
            style={{ height: "58px" }}
          >
            <a
              href="#arrival"
              onClick={(e) => handleAnchorClick(e, "#arrival")}
              className="sig-focus-dark flex min-w-0 items-baseline gap-1.5 whitespace-nowrap rounded-[4px] py-1"
            >
              <span className="text-[14px] font-semibold tracking-[-0.015em] text-[#FFFFFF]">
                Study in Germany
              </span>
              <span className="hidden text-[13px] font-normal text-[#A1A1AA] sm:inline">
                by Idress
              </span>
            </a>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                href="/tracker"
                className="sig-focus-dark inline-flex min-h-[36px] items-center gap-1 rounded-[4px] border border-[#2F2F33] bg-[#1F1F1F] px-3 text-[13px] font-medium text-[#FFFFFF] transition-colors hover:border-[#52525B] hover:bg-[#27272A]"
              >
                <span>Visa tracker</span>
                <ArrowUpRightIcon size={13} />
              </Link>

              <button
                ref={toggleBtnRef}
                type="button"
                onClick={toggleMenu}
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
                className="sig-focus-dark inline-flex min-h-[36px] items-center gap-2.5 rounded-[4px] px-2.5 text-[13px] font-semibold text-[#FFFFFF] transition-colors hover:bg-[#242426]"
              >
                <span>{isOpen ? "Close" : "Menu"}</span>
                <span
                  aria-hidden="true"
                  className="relative flex h-3 w-4 flex-col justify-between"
                >
                  <span
                    ref={lineTopRef}
                    className="block h-[1.5px] w-full bg-[#FFFFFF]"
                    style={
                      reducedMotion
                        ? {
                            transform: isOpen ? "translateY(5px) rotate(45deg)" : "none",
                          }
                        : undefined
                    }
                  />
                  <span
                    ref={lineBottomRef}
                    className="block h-[1.5px] w-full bg-[#FFFFFF]"
                    style={
                      reducedMotion
                        ? {
                            transform: isOpen ? "translateY(-5px) rotate(-45deg)" : "none",
                          }
                        : undefined
                    }
                  />
                </span>
              </button>
            </div>
          </div>

          {/* Expanded editorial body */}
          <div
            id={panelId}
            ref={bodyRef}
            aria-hidden={!isOpen}
            className="flex min-h-0 flex-1 flex-col overflow-y-auto md:overflow-hidden"
            style={
              reducedMotion
                ? {
                    display: isOpen ? "flex" : "none",
                  }
                : undefined
            }
          >
            <div
              ref={dividerRef}
              className="mx-4 h-[1px] shrink-0 bg-[#272727] md:mx-5"
            />

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 px-4 py-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:px-5 md:py-5">
              {/* Left area: Large editorial numbered links */}
              <ul className="flex flex-col justify-between gap-1">
                {NAV_ENTRIES.map((item) => {
                  const isActive = activeHref === item.href;
                  return (
                    <li key={item.href} className="overflow-hidden">
                      <a
                        href={item.href}
                        onClick={(e) => handleAnchorClick(e, item.href)}
                        onMouseEnter={() => setPreviewEntry(item)}
                        onFocus={() => setPreviewEntry(item)}
                        tabIndex={isOpen ? 0 : -1}
                        className="sig-focus-dark group flex items-baseline justify-between gap-3 rounded-[4px] py-1.5 transition-colors hover:text-[#FFFFFF]"
                      >
                        <span
                          data-nav-link-text
                          className="flex items-baseline gap-3.5"
                        >
                          <span
                            className="sig-tabular text-[12px] font-semibold"
                            style={{ color: isActive ? "#C83228" : "#71717A" }}
                          >
                            {item.index}
                          </span>
                          <span
                            className="text-[22px] leading-[28px] font-semibold tracking-[-0.02em] transition-transform duration-300 group-hover:translate-x-1 md:text-[26px] md:leading-[32px]"
                            style={{ color: isActive ? "#FFFFFF" : "#E4E4E7" }}
                          >
                            {item.label}
                          </span>
                        </span>
                        <span className="hidden text-[12px] text-[#71717A] transition-colors group-hover:text-[#A1A1AA] sm:inline">
                          {item.note}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>

              {/* Right area: Art-directed photographic preview */}
              <div
                ref={previewBoxRef}
                className="hidden min-h-0 flex-col justify-between md:flex"
              >
                <div className="relative flex-1 overflow-hidden rounded-[4px] border border-[#272727] bg-[#111111]">
                  <Image
                    key={previewEntry.href}
                    src={previewEntry.asset.src}
                    alt={previewEntry.asset.alt}
                    fill
                    sizes="300px"
                    className="object-cover object-center"
                  />
                </div>
                <div className="mt-2.5 flex items-baseline justify-between gap-2 text-[12px] text-[#A1A1AA]">
                  <span className="font-medium text-[#FFFFFF]">{previewEntry.label}</span>
                  <span>{previewEntry.note}</span>
                </div>
              </div>
            </div>

            {/* Restrained secondary utility strip */}
            <div
              ref={secondaryRef}
              className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[#272727] px-4 py-3 text-[12px] text-[#A1A1AA] md:px-5"
            >
              <a
                href={`https://wa.me/${whatsappSupport.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={isOpen ? 0 : -1}
                className="sig-focus-dark transition-colors hover:text-[#FFFFFF]"
              >
                WhatsApp {whatsappSupport.displayPhone}
              </a>
              <div className="flex items-center gap-4">
                <a
                  href={WHATSAPP_CHANNELS[0].href}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={isOpen ? 0 : -1}
                  className="sig-focus-dark transition-colors hover:text-[#FFFFFF]"
                >
                  Updates channel
                </a>
                <Link
                  href="/universities"
                  tabIndex={isOpen ? 0 : -1}
                  onClick={() => closeMenu(false)}
                  className="sig-focus-dark transition-colors hover:text-[#FFFFFF]"
                >
                  Universities
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
