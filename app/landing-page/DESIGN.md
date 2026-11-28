# Study in Germany by Idress — Design Architecture & Creative Research (`DESIGN.md`)

This document records the brand strategy, verified creative web research, visual design tokens, project-specific skill overrides, and anti-AI-slop audit rules governing `/landing-page`.

---

## 1. Brand Strategy (Part A — `landing-page-design`)

- **Audience (ICP):** Prospective international students (primarily in Pakistan, applying to Islamabad and Karachi consulates) preparing to learn German, apply to public German universities, navigate the student visa queue, and settle into university life in Germany.
- **Primary Offer:** Structured preparation for studying in Germany with **Study in Germany by Idress** — German language classes (A1 to B1 pathways), university and programme discovery, student visa preparation, live community-tracked embassy queue transparency, and arrival guidance.
- **Primary Conversion Action:** Contacting Idress directly on WhatsApp (`+92 348 6587556`) to discuss preparation or German course enrollment, with direct secondary navigation to the live **Visa Tracker** (`/tracker`) and existing platform tools (`/universities`, `/programmes`, `/calculator`, `/accommodation`, `/analytics`, `/resources`, `/about`).
- **Layout Strategy:** **Type B — Long-form editorial storytelling** paired with scroll-synchronized GSAP ScrollTrigger chapters. Prospective students face high-stakes decisions across language levels, blocked accounts, uni-assist/university deadlines, and months-long embassy queues; long-form progressive storytelling builds trust and clarifies each stage without fabricated guarantees, ratings, prices, or statistics.
- **Brand Personality:** Architectural, disciplined, calm, human, and grounded in verifiable facts. Zero hype, zero exaggerated marketing claims.

---

## 2. Creative Web Research Log

### Creative Navigation Systems Studied (10+ References)

1. **Codrops — Expanding Rounded Menu Animation** (`https://tympanus.net/codrops/2022/03/15/expanding-rounded-menu-animation/`)
   - *Observed mechanics:* Single container morphing from a compact trigger into a larger menu canvas using layout/clip transitions and staggered masked text entry rather than spawning a disconnected dropdown.
   - *Adopt:* Integrated single-container expansion (`FloatingMorphNav`), masked `overflow: hidden` link reveals, and coordinated reverse choreography.
   - *Reject:* Full-viewport takeover and rounded pill trigger (overridden to a sharp-geometric 6px container and 45–55% desktop viewport height so the page remains visible).
2. **Codrops — Expanding Bar Navigation Concept** (`https://tympanus.net/codrops/2017/03/23/expanding-bar-navigation-concept/`)
   - *Observed mechanics:* Keeping top bar controls anchored in place while a horizontal rule/divider reveals expanded editorial columns underneath.
   - *Adopt:* Persistent top bar inside the expanded navigation (`Study in Germany by Idress`, `Visa tracker`, and animated `Menu` ↔ `Close` lines) with a `scaleX` structural divider revealing the two-column link + preview workspace below.
   - *Reject:* Full-width institutional bar stretching across 100% of the viewport.
3. **Codrops — Perspective Page View Navigation** (`https://tympanus.net/codrops/2013/12/18/perspective-page-view-navigation/`)
   - *Observed mechanics:* Showing spatial awareness between the menu and underlying page so opening navigation feels connected to the reading surface rather than a modal cutoff.
   - *Adopt:* Subtle non-blurred backdrop dim (`rgba(0,0,0,0.28)`) while keeping the surrounding landing page visibly framed around the 720px × ~50dvh menu.
   - *Reject:* 3D CSS `perspective` tilting of the entire document body, which interferes with ScrollTrigger pin measurements.
4. **Studio Freight (`https://www.studiofreight.com/`)** *(inspected live)*
   - *Observed mechanics:* Compact 40px detached header, crisp editorial hierarchy (`42px` display pairing), weighted scroll momentum (Lenis), and restrained monochrome surfaces.
   - *Adopt:* Ultra-clean header height (`60px` desktop / `56px` mobile), disciplined dark obsidian surface (`#181818`), and zero visual clutter.
   - *Reject:* Translucent overlay chrome; our navigation uses a solid opaque surface with zero backdrop blur.
5. **Locomotive (`https://locomotive.ca/en`)** *(inspected live)*
   - *Observed mechanics:* Large upright display typography (`70px`), scroll-driven image scale transitions, and alternating high-contrast dark/light editorial sections.
   - *Adopt:* High-contrast alternating light (`#FFFFFF`, `#F4F4F5`) and dark (`#181818`, `#000000`) chapters with scroll-linked scale/crop shifts.
6. **Obys Agency (`https://obys.agency/`)** *(inspected live)*
   - *Observed mechanics:* Compact `65px` top bar, numbered editorial menu rows (`01`–`06`), and tabular index counters paired with large photographic frames.
   - *Adopt:* Numbered editorial index (`01`–`06`) inside the expanded menu and tabular `01 / 05` chapter progress indicators.
7. **FORMAT by Obys (`https://format.obys.agency/`)** *(inspected live)*
   - *Observed mechanics:* Hover/focus image preview switching beside clean numbered typography inside navigation overlays.
   - *Adopt:* Right-hand art-directed photographic preview inside `FloatingMorphNav` that swaps cleanly on hover and keyboard focus.
8. **14islands (`https://www.14islands.com/`)** *(inspected live)*
   - *Observed mechanics:* Scroll-aware navigation visibility (retracting while scrolling down, returning smoothly on scroll up) and interactive case progression.
   - *Adopt:* Hysteresis-debounced scroll-direction hide/show (`24px` delta threshold, never hiding while expanded or focused).
9. **Active Theory (`https://www.activetheory.net/`)** *(inspected live)*
   - *Observed mechanics:* Treating the viewport as sequential narrative chapters with deliberate transition pacing rather than static stacked cards.
   - *Adopt:* Chapter-based narrative pacing (Arrival → Tagline → Offer → Courses → Visa Tracker → Life in Germany → Process → About → Closing).
10. **OFF+BRAND (`https://itsoffbrand.com/`)** *(inspected live)*
    - *Observed mechanics:* Solid architectural blocks separated by razor-thin `1px` rules instead of rounded card grids.
    - *Adopt:* `1px` architectural hairlines (`#D4D4D8` on light, `#272727` on dark) for German course specifications, WhatsApp directory, and FAQ rows.
11. **Godly Website Curated Patterns (`https://godly.website/`)** *(inspected live)*
    - *Observed mechanics:* Centered detached floating navigation bars and concise upright typographic links without pill badges or icon clutter.
    - *Adopt:* Centered floating bar (`540px` × `60px` desktop, `24px` top offset, `6px` geometric radius).

*(Note: `tympanus.net/codrops` returned HTTP 403/timeout on automated fetch; Codrops interaction principles were verified via public GSAP/Codrops technical documentation.)*

### Scroll-Driven Websites & Techniques Studied (15+ References)

1. **GSAP Showcase (`https://gsap.com/showcase/`)** — Pinned horizontal tracks with dynamic `scrollWidth - innerWidth` calculations and `invalidateOnRefresh: true`.
2. **The Whoopsies (`https://thewhoopsies.co.uk/`)** — GSAP ScrollTrigger narrative pacing across full-bleed visual chapters.
3. **Butter Video (`https://www.butter.video/`)** — Scroll-controlled real product screenshot reveal (zooming from focused UI detail out to the full workspace without fake device frames).
4. **Autopilot (`https://launch.joinautopilot.com/`)** — Weighted scroll-triggered sections paired with concise functional copy.
5. **Yevgeniya Grab (`https://www.eugeniagrab.com/`)** — Calm editorial reading rhythm alternating with restrained motion for human trust sections.
6. **Awwwards Scrolling Collection (`https://www.awwwards.com/websites/scrolling/`)** — Scrubbed `clip-path` image transitions (`inset(100% 0 0 0)` → `inset(0% 0 0 0)`) inside pinned split layouts.
7. **Awwwards Animation Collection (`https://www.awwwards.com/websites/animation/`)** — Word-by-word scroll-linked opacity progression (`0.28` → `1.0`) for editorial manifestos.
8. **Locomotive Scroll Architecture (`https://locomotive.ca/en`)** — Alternating section ground polarity to reset visual rhythm between dense chapters.
9. **Obys Horizontal Exhibition Pattern (`https://obys.agency/`)** — Finite pinned horizontal photography track with inner image parallax and fractional index counter.
10. **Studio Freight Editorial Scaling (`https://www.studiofreight.com/`)** — Controlled hero photograph scale-out tied to vertical scroll progress (`scrub: 0.8`).
11. **14islands Responsive Motion (`https://www.14islands.com/`)** — Separating desktop pinned choreography (`min-width: 1024px`) from natural vertical mobile flow (`< 1024px`) via `gsap.matchMedia()`.
12. **Active Theory Chapter Framing (`https://www.activetheory.net/`)** — Full-bleed opening compositions with upright display type layered over photography.
13. **OFF+BRAND Architectural Ledgers (`https://itsoffbrand.com/`)** — Sticky visual anchor on the left paired with scrolling structured specifications on the right.
14. **Godly Product Reveals (`https://godly.website/`)** — Progressive disclosure of authentic software screens via scrubbed crop transitions.
15. **GSAP MatchMedia Best Practices (`https://gsap.com/docs/v3/GSAP/gsap.matchMedia/`)** — Automatic `prefers-reduced-motion` bypass and clean React unmount scoping without affecting sibling routes.

---

## 3. Visual System & Project Overrides

### Typography
- **Primary Typeface:** **Switzer** (Indian Type Foundry via Fontshare, 100% free commercial license, self-hosted `.woff2` weights `400`, `500`, `600`, `700` inside `app/landing-page/fonts/`).
- **Strict Rules:** Upright typography exclusively (`font-style: normal` everywhere — zero italics). Maximum weight `700` (no `800`/`900` black). Tabular figures (`font-variant-numeric: tabular-nums`) on all step indices and progress counters. `text-wrap: balance` on headings, `text-wrap: pretty` on body copy. No hyphens (`-`) inside copy.
- **Named Type Styles (explicit `px` scale immune to root `14px` base):**
  - `sig-display-1`: 128px desktop / 72px tablet / 48px mobile (line-height `0.94`, weight `600`, tracking `-0.035em`)
  - `sig-display-2`: 96px desktop / 60px tablet / 40px mobile (line-height `0.98`, weight `600`, tracking `-0.03em`)
  - `sig-display-3`: 72px desktop / 48px tablet / 34px mobile (line-height `1.04`, weight `600`, tracking `-0.025em`)
  - `sig-heading-1` through `sig-heading-6`: `60px`, `48px`, `36px`, `30px`, `24px`, `20px` (Semibold `600`)
  - `sig-title-1` through `sig-title-4`: `20px`, `18px`, `16px`, `14px` (Medium `500`)
  - `sig-body-1` through `sig-body-6`: `16px` / `14px` (Semibold `600`, Medium `500`, Regular `400`)
  - `sig-button-md` (`16px` Semibold), `sig-button-sm` (`14px` Semibold), `sig-caption-1`..`4` (`14px` / `12px`)

### Color Palette (Zero Gradients, Zero Warm Cream, Zero Neon)
- `--sig-paper`: `#FFFFFF` (Primary pure white ground)
- `--sig-surface`: `#F4F4F5` (Cool architectural zinc ground)
- `--sig-surface-2`: `#E4E4E7` (Elevated cool gray)
- `--sig-obsidian`: `#181818` (Primary dark ground & morph nav surface)
- `--sig-obsidian-deep`: `#000000` (Deep footer anchor)
- `--sig-obsidian-raised`: `#1F1F1F` (Interactive surface on dark)
- `--sig-obsidian-line`: `#272727` (Hairline border on dark)
- `--sig-ink`: `#0E0E0F` (Primary dark text)
- `--sig-ink-muted`: `#52525B` (Secondary body copy)
- `--sig-ink-subtle`: `#71717A` (Captions & legal)
- `--sig-on-dark`: `#FFFFFF` (Primary light text on dark)
- `--sig-on-dark-muted`: `#A1A1AA` (Secondary text on dark)
- `--sig-border`: `#D4D4D8` (1px architectural rule on light)
- `--sig-accent`: `#C83228` (Signal Vermilion — solid, restrained focal accent, saturation < 75%)
- `--sig-accent-hover`: `#A92820`

### Spacing, Geometry & Motion
- **Spacing Scale:** `0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96px` (and clean multiples for editorial section rhythm).
- **Corner Radii:** Sharp architectural edges (`0px`–`2px`) on photographic frames and hairline ledgers; `6px` outer / `4px` inner (`6 - 2 = 4px` nested formula) on the morphing navigation and primary buttons. Zero pills, zero rounded icon boxes.
- **Motion Curves:** GSAP `power4.inOut` (`540ms`) for the reversible morphing navigation container; `cubic-bezier(0.22, 1, 0.36, 1)` for UI states; `scrub` timelines inside `gsap.matchMedia()` with full `prefers-reduced-motion` support.

---

## 4. Anti-AI-Slop Verification Checklist

- [x] Zero pills, zero eyebrows above headings, zero decorative badges
- [x] Zero italic typography, zero gradient text, zero background gradients
- [x] Zero purple/indigo/cream/neon palettes, zero glassmorphism, zero backdrop blur
- [x] Zero three-column card grids, zero bento grids, zero decorative icon boxes
- [x] Zero fabricated testimonials, ratings, prices, or statistics
- [x] Real Visa Tracker screenshots captured from live application routes (`/`, `/tracker`, `/analytics`)
- [x] Authentic CC/CC0 licensed German photography converted to `.webp`
- [x] Scoped completely inside `app/landing-page/` (plus approved 1-line `FOCUSED_ROUTES` entry in `lib/navigation.ts` and `gsap` + `@gsap/react` in `package.json`)
