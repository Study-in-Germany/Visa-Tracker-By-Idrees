# Component Design Guidelines & Approved Contracts

These reusable presentation components are locked to approved designs. Backend forecasting updates, database schema changes, or new metrics must integrate strictly through typed adapters (`lib/analytics/adapters.ts`) and props (`lib/analytics/types.ts`) without redesigning the component structure or outer card geometry.

## Approved Visual References

- **The queue right now (`QueueOverview`)**: [`docs/design/references/queue-overview-approved.png`](references/queue-overview-approved.png)
- **How long each step takes (`VisaStageDurationTimeline`)**: [`docs/design/references/visa-stage-timeline-approved.png`](references/visa-stage-timeline-approved.png)

---

## Canonical Components

### 1. `QueueOverview` (`components/visa/QueueOverview.tsx`)
- **Purpose**: Single canonical `"The queue right now"` section rendered on Overview, Calculator, and Queue Progress.
- **Visual Structure**:
  - Single outer card (`rounded-xl border border-line bg-card overflow-hidden`).
  - Header (`bg-paper-sunk border-b border-line px-4 py-3`) with blue clock icon, title `"The queue right now"`, subtitle `"Community estimates · Not official embassy data."`, optional last-updated date, and `"Queue details"` drawer trigger (`QueueDetailsDrawer`).
  - `divide-y divide-line` rows rendering `EmbassyQueueSection` for Islamabad and Karachi.
- **Data Contract**: `CanonicalQueueOverview` (`lib/analytics/types.ts`).
- **Responsive**: Stacks embassy metrics vertically on phones; monthly timeline hides alternate month labels below `sm` when > 7 months to avoid horizontal overflow.
- **States**: Loading (`QueueOverviewSkeleton`), Empty (`Not enough data for this consulate yet...`), Partial (shows available metrics, `"Unavailable"` for missing metric).
- **Accessibility**: `aria-labelledby`, `role="img"` on timeline with descriptive `aria-label`, keyboard/touch accessible `"Queue details"` drawer (`Modal variant="drawer"`).

### 2. `EmbassyQueueSection` / `MonthlyQueueTimeline` (`components/visa/`)
- **Purpose**: Displays 3 primary metrics (`Submission invitations`, `Appointment invitations`, `Weekly movement`) + proportional UTC calendar-day monthly timeline + `"Cohorts reached"` / `"Later cohorts"` legend.
- **Rules**: No nested boxes around the 3 metrics. Floating pill (`Invites now · <date>`) and vertical tick must use the exact same canonical date as the Submission invitations metric.

### 3. `VisaStageDurationTimeline` & `CorrectionSummary` (`components/visa/`)
- **Purpose**: Clean 4-stage visual explanation of the student visa process (`Join the waiting list`, `Submission invite`, `Appointment`, `Visa decision`).
- **Visual Structure**:
  - Single full-width card (`rounded-xl border border-line bg-card p-4 sm:p-5`).
  - Desktop 4-column horizontal connected timeline with circular stage icons (`clock`, `mail`, `calendarCheck`, `badgeCheck`), thin horizontal connecting lines, and content-sized neutral `DurationIndicator` pills (`≈ <duration> →`, `most: <range> · <n> people`).
  - Mobile converts cleanly into a vertical connected timeline (`ol.md:hidden`).
  - Single full-width amber-bordered `CorrectionSummary` strip with `wrench` icon.
- **Rules**: Never display P10/P50/P90 labels or multi-paragraph explanations under stages. Omit post-correction duration claims when `< 5` observations exist.
- **States**: Loading (`VisaStageTimelineSkeleton`), no recorded decisions (`"No decisions recorded yet"`), no correction data.

### 4. `PersonalVisaJourney` & `ForecastDetails` (`components/visa/`)
- **Purpose**: Applicant-friendly 6-stage journey timeline (`Waiting list`, `Submission invitation`, `Documents submitted`, `Appointment invitation`, `Physical appointment`, `Visa decision`).
- **Visual Structure**:
  - Header with title, embassy + updated date, `"Forecast details"` drawer button, and optional contextual action (`Scenario calculator`).
  - Desktop 6-column horizontal connected timeline; mobile compact vertical connected timeline.
  - Only stage icon, stage title, concise date or single estimated range, and minimal status indicator.
  - **Prohibited**: Oversized nested cards per stage, fixed-height milestone boxes, repeated `"Actual recorded"` labels, or inline statistical percentiles.
- **Progressive Disclosure**: All quantiles (P10–P90), sample sizes, effective N, confidence reasons, velocity sensitivity, and methodology live in `ForecastDetails` (`Modal variant="drawer"`).

### 5. `StatCard`, `Sparkline`, `MiniBarChart`, `ConfidenceBars` (`components/ui/StatCard.tsx`, `components/data-display/`)
- **Purpose**: Preserve the established Valley outer card geometry (`min-h-[78px]`, `rounded-xl border border-line bg-card p-3`) across Overview and Dashboard.
- **Internal Composition**: One primary metric, one uppercase label, one concise supporting `hint`, existing icon box, and optional right-aligned miniature visualization (`sparkline` prop) when genuine historical series (`>= 3` points) exist.
- **Prohibited**: Arbitrary progress bars, fabricated sparkline data, percentage changes without valid comparison periods.

---

## Theme & Design Tokens
- **Light mode**: Pure white surfaces (`--paper`, `--card`), neutral borders (`--line`), dark slate text (`--ink-900`), Valley blue (`#2563eb`) and semantic emerald/amber accents.
- **Dark mode**: Neutral black/charcoal (`#0A0A0A` / `#141414` / `#1C1C1C`), gray borders (`#272727`), crisp white/gray text (`#FAFAFA` / `#A3A3A3`).
- **Prohibited**: Navy-blue dark backgrounds, cream backgrounds, decorative gradients, heavy shadows.
