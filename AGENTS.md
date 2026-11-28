# Repository Development & UI Architecture Rules

This repository enforces strict separation between statistical/database logic and presentational UI components to prevent visual regressions and contradictory metrics.

## Permanent Development Rules

1. **Approved visual components must be reused.** Use the canonical components in `components/visa/queue/`, `components/visa/journey/`, `components/visa/`, `components/data-display/`, and `components/ui/`.
2. **Backend updates must not trigger unrequested UI redesigns.** Forecasting or aggregation changes must flow through `lib/analytics/adapters.ts` and `lib/analytics/types.ts`.
3. **Forecasting calculations must remain outside presentation components.** Presentational components must never run simulations, compute queue velocities, or query Prisma/databases directly.
4. **New data should enter existing components through typed contracts.** Never pass raw Prisma rows or bespoke ad-hoc metrics straight into visual components.
5. **Do not duplicate existing dashboard sections.** Overview must contain exactly one `"The queue right now"` (`QueueOverview`) and one `"How long each step takes"` (`VisaStageDurationTimeline`) section.
6. **Do not redesign outer statistics cards without explicit authorization.** `StatCard` dimensions, borders, radii, backgrounds, and typography hierarchy are locked.
7. **Do not expose technical diagnostics in the default applicant interface.** Keep `P10`/`P25`/`P50`/`P75`/`P90`, `Monte Carlo`, `Kaplan–Meier`, `effective sample size`, and model version identifiers inside progressive disclosure (`ForecastDetailsDrawer`, `QueueDetails`, or `/analytics`).
8. **Do not introduce unnecessary text or nested cards.** Keep primary views concise, typography-led, and plain-language for ordinary visa applicants, preserving the pure white light theme and neutral black/charcoal dark theme in `app/globals.css`.
9. **Preserve responsive and accessible component behaviour.** Support desktop, tablet, mobile, keyboard navigation, reduced-motion preferences, and PWA safe areas.
10. **Run visual regression tests before completing UI-related tasks.** Run `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm run test:visual`.
11. **Screenshot baselines require deliberate approval before changes.** Never run `npm run test:visual:update` automatically to mask unexpected diffs; inspect diff images and approved reference screenshots first.
12. **Never delete or overwrite existing production data during UI refactoring.** Do not run destructive migrations, truncations, resets, or production seed operations for UI work.

## Canonical Import Paths

- Queue overview (Option B — Segmented Monochrome): `@/components/visa/queue/QueueOverview` (`EmbassyQueueSection`, `SegmentedQueueTimeline`, `QueueConfidenceIndicator`, `QueueDetails`, `QueueOverviewSkeleton`)
- Transit visa journey (Option D): `@/components/visa/journey/TransitVisaJourney` (`ForecastDetailsDrawer`, `TransitJourneySkeleton`)
- Submission & review journey timeline: `@/components/visa/journey/VisaJourneyTimeline` (`EditableVisaJourney`, `VisaJourneyReview`, `MilestoneDateControl`, `OptionalCorrectionMilestone`)
- Tracker workspace: `@/components/tracker/TrackerWorkspace` (`TrackerDesktopFilterTrigger`, `TrackerMobileFilterTrigger`, `TrackerFilterDrawer`, `TrackerFilterSheet`, `TrackerFilterForm`, `TrackerStatusFilterGroup`, `TrackerFilterFooter`, `TrackerTable`, `TrackerTableSkeleton`, `TrackerPagination`, `@/hooks/useTrackerFilters`)
- Sidebar account switcher: `@/components/sidebar/SidebarAccountTrigger` (`SidebarAccountPopover`, `ApplicantIdentity`, `ApplicantStatusChip`, `CopyTrackingId`)
- WhatsApp resources & direct support: `@/lib/whatsapp` (`whatsappSupport`, `whatsappSupportUrl`, `WHATSAPP_CHANNELS`, `WHATSAPP_COMMUNITIES`), `@/components/whatsapp/WhatsAppBrandIcon`, `@/components/whatsapp/WhatsAppSupportButton`, `@/components/whatsapp/SidebarSupportLink`, `@/components/whatsapp/FloatingWhatsAppButton`, `@/components/resources/WhatsAppResourceCard`
- Status chip & badge: `@/components/ui/StatusChip`, `@/components/StatusBadge`
- Stage duration timeline: `@/components/visa/VisaStageDurationTimeline`
- Statistics card & miniature charts: `@/components/ui/StatCard`, `@/components/data-display/Sparkline`, `@/components/data-display/MiniBarChart`, `@/components/data-display/ConfidenceBars`
- Presentation contracts, formatters & adapters: `@/lib/analytics/types`, `@/lib/analytics/formatters`, `@/lib/analytics/adapters`
- Server-only canonical data loader: `@/lib/analytics/service` (must NEVER be imported in `components/visa/**`, `components/timeline/**`, `components/data-display/**`, or `components/ui/**`)

## Security Architecture Invariants (P0 Mandatory)

1. **Never authorize access using frontend state.** React context (`useSession`), `localStorage`, URL query parameters, or hidden UI links are never security boundaries. Every protected layout, Server Action, and Route Handler must validate the server-backed session via `@/lib/auth/authorization` (`requireApplicant()`, `requireAdmin()`, `requireApplicantPage()`, `requireAdminPage()`, or `getActor()`).
2. **Never trust a Tracking ID as proof of account ownership.** `publicId` is a public identifier, not a secret. Private applicant reads/mutations must derive `applicantId` exclusively from the verified `AuthSession`.
3. **Never implement logout without server-side revocation.** Logout (`POST /api/applicant/logout`, `POST /api/admin/logout`) must revoke the `AuthSession` row in PostgreSQL, expire cookies with matching attributes, reset client query caches (`resetApiCache()`), broadcast cross-tab logout, and perform a hard navigation.
4. **Never expose OTP codes, access codes, or reusable session tokens.** Never log OTPs, access codes, passwords, or raw session tokens. Never persist plaintext OTP codes in `EmailJob` or return them in API responses.
5. **Never cache private authenticated responses across users.** Protected routes and private API endpoints (`/api/session`, `/api/applicant/*`, `/api/admin/*`, `/dashboard/*`, `/admin/*`) must emit `Cache-Control: private, no-store, no-cache, must-revalidate` and `Vary: Cookie`, and must be excluded from service worker caching in `public/sw.js`.
6. **Never bypass administrator authorization or MFA.** Admin sessions require server-verified `ADMIN` role, `totpEnabledAt`, and `mfaVerifiedAt`, with strict 30-minute idle and 12-hour absolute timeouts.
7. **Never permit production development bypasses.** `DEMO-*` credentials and `/visual-fixtures` must remain disabled in `NODE_ENV === "production"`.
8. **Never weaken authentication or run destructive migrations.** Always use additive migrations (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) to preserve all existing applicant records, Tracking IDs, and historical data.

