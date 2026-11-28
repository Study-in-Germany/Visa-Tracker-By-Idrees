# Option D — Transit Map Timeline (`TransitVisaJourney`)

Canonical reference: [`docs/design/references/transit-journey-approved.png`](references/transit-journey-approved.png)

## Visual Composition
- **Single unified outer container** (`rounded-xl border border-line bg-card`) with zero nested milestone cards and no permanently visible statistical analysis panels.
- **Header**: `"Your visa journey"` (or `"Estimated visa timeline"` inside `/calculator`) with concise freshness metadata or calculator scenario toggle.
- **Current-stage summary (`CurrentStageSummary`)**: Uppercase `CURRENT STAGE` label, bold stage title, supporting `<Embassy> · <status>` line, and right-aligned `CalendarClock` (or semantic terminal) icon.
- **Connected transit route (`TransitRoute`)**:
  - **Desktop (`md+`)**: Horizontal connected track using CSS Grid (`repeat(N, minmax(0, 1fr))`) with zero gaps so left/right `TransitConnector` segments meet the exact center of each `TransitStation`.
  - **Mobile (`< md`)**: Vertical connected track with leading station column and exact center-aligned vertical connectors.
  - **6 primary stations**: Waiting list, Submission invitation, Documents submitted, Appointment invitation, Physical appointment, Visa decision — plus a compact conditional `Correction` station when an active correction is requested.
  - **Explicit states**: `completed` (filled emerald + checkmark + actual date), `current` (prominent outlined ring + `CURRENT STEP` indicator), `action-required` (amber ring + alert icon + concise action label), `upcoming` (neutral outline + single concise estimated range or `Pending`), `unavailable` (dashed neutral outline), and `terminal` (issued/rejected/withdrawn with no irrelevant future predictions).
- **Contextual next action (`JourneyNextAction`)**: Single horizontal action row rendered only when an applicant action is needed (e.g., `"Confirm your appointment date"` → `"Update date"`), opening `MilestoneQuickEditModal` wired to `PATCH /api/applicant/me/milestones`.
- **Footer (`JourneyFooter`)**: `"Forecast details"` opens `ForecastDetailsDrawer`; `"Scenario calculator →"` navigates to `/calculator`.
