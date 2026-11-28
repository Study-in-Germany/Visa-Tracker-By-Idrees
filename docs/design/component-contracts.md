# Canonical Presentation Component Contracts

All visual components receive validated, typed view-models from `lib/analytics/adapters.ts` and `lib/analytics/types.ts`. Presentational components never import Prisma, database clients, or server-only forecasting services.

## 1. Queue Overview — Option B (`QueueOverview` / `CanonicalQueueOverview`)
- **References**: [`docs/design/references/queue-overview-approved.png`](references/queue-overview-approved.png) (light), [`docs/design/references/queue-overview-dark-approved.png`](references/queue-overview-dark-approved.png) (dark)
- **Source adapter**: `adaptQueueOverview(intelligence, cohortBoundsByEmbassy, now)` + `buildMonthlyQueueTimeline(...)`
- **Key guarantees**:
  - Neutral monochrome rectangular segmented calendar timeline (`#262626`/`#D4D4D4` light; `#EDEDED`/`#303030` dark).
  - Exact calendar-day fill proportion `(frontierMs - segmentStartMs) / (segmentEndMs - segmentStartMs)` for the active month, with circular outlined marker, vertical connector, and floating date pill locked to the same frontier date and guarded against boundary clipping.
  - Concise 3-column metrics (`Invites reaching`, `Appointments`, `Weekly pace`) with compact mobile labels and 320px 2+1 reflow.
  - Lightweight interactive `QueueConfidenceIndicator` beside the embassy heading (desktop popover + mobile bottom sheet) and `QueueDetails` drawer for statistical evidence.

## 2. Transit Journey — Option D (`TransitVisaJourney` / `TransitJourneyViewModel`)
- **Reference**: [`docs/design/references/transit-journey-approved.png`](references/transit-journey-approved.png)
- **Source adapter**: `adaptTransitJourney(forecast, applicant, options)`
- **Key guarantees**:
  - `currentStage` is derived from normalized actual milestones and `visaStatus` (never assuming completion because an estimated date passed).
  - Overdue/unconfirmed appointments produce `state: "action-required"` (`"Confirm date"`) and a contextual `nextAction` rather than clamping predictions to today.
  - Completed milestones stay locked to their `actualDate` across all calculator scenarios (`faster`, `typical`, `slower`).
  - Multiple historical correction events are preserved in `corrections.events` and displayed inside `ForecastDetailsDrawer`.

## 3. Locked Shared Components
- `VisaStageDurationTimeline` (`VisaStageTimelineView`) — [`docs/design/references/visa-stage-timeline-approved.png`](references/visa-stage-timeline-approved.png)
- `StatCard` (`StatCardProps`) + `Sparkline` / `ConfidenceBars` (`DashboardKpiView`) — outer card geometry, spacing, and visual baselines remain locked.
