# Visa Tracker — Security Architecture & Operations Guide

This document describes the production authentication, authorization, session lifecycle, email security, caching, and PWA security architecture for **Visa Tracker by Idrees** (aligned with **OWASP ASVS Level 2** verification practices and **NIST SP 800-63B-4** guidance; not a claim of formal third-party certification).

---

## 1. Authentication & Session Architecture

### Server-Backed Revocable Sessions (`AuthSession`)
- Both applicant and administrator sessions use **opaque 256-bit cryptographically random bearer tokens** (`randomBytes(32).toString("hex")`) stored **only as SHA-256 hashes** (`AuthSession.tokenHash`) in PostgreSQL.
- Raw session tokens are never stored in the database, `localStorage`, `sessionStorage`, URLs, logs, or client-readable cookies.
- Session validation (`lib/auth/session-store.ts`) verifies on every request:
  1. Token format (`/^[a-f0-9]{64}$/`).
  2. Matching `AuthSession` row exists and `revokedAt IS NULL`.
  3. `now <= absoluteExpiresAt` and `now <= idleExpiresAt`.
  4. `subjectType` strictly matches the expected role (`APPLICANT` vs `ADMIN`), and linked account has `disabledAt IS NULL`.
  5. For `ADMIN` sessions: `AdminUser.totpEnabledAt IS NOT NULL` and `AuthSession.mfaVerifiedAt IS NOT NULL`.
- Background polling (`/api/session` via `lib/session-profile.ts`) passes `{ touch: false }` so polling never extends idle session lifetimes.

### Session Lifetimes & Rotation
| Role | Idle Timeout | Absolute Timeout | Configurable Env Vars |
|---|---|---|---|
| Applicant | 24 hours | 7 days | `APPLICANT_SESSION_IDLE_HOURS`, `APPLICANT_SESSION_ABSOLUTE_DAYS` |
| Administrator | 30 minutes | 12 hours | `ADMIN_SESSION_IDLE_MINUTES`, `ADMIN_SESSION_ABSOLUTE_HOURS` |

- Sessions rotate on every sign-in, password change, and MFA enrollment/verification (any prior cookie is revoked in `AuthSession` before issuing a new token).
- Cookies (`vt_applicant_session`, `vt_admin_session`) are **host-only**, `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in production (`NODE_ENV === "production"`).

---

## 2. Logout & Cache Isolation

- **Server-side revocation**: `POST /api/applicant/logout` and `POST /api/admin/logout` revoke the `AuthSession` row in PostgreSQL (`revokedAt = now`, `revokedReason`), write an `AuthAuditLog` entry, expire the cookie with `maxAge: 0` + `expires: Epoch`, and return `Cache-Control: private, no-store, no-cache, must-revalidate`.
- **Client-side cleanup**: `hooks/useSession.ts` + `hooks/useApi.ts` call `resetApiCache()` (clearing in-memory cache, clearing in-flight requests, bumping the cache generation counter so late responses are discarded), notify the service worker (`CLEAR_USER_CACHE`), broadcast `LOGOUT` across tabs via `BroadcastChannel` (`hooks/useSessionSync.ts`), and navigate via `window.location.assign(...)` to purge Next.js Client Router Cache.
- **Offline / failure handling**: If server revocation fails, `logout()` still clears local state (`forcedGuest = true`), does **not** report success, and displays a retryable error inside the confirmation dialog.
- **bfcache & PWA resume**: `pageshow` (`e.persisted`) and `visibilitychange` trigger immediate network revalidation of `/api/session` (`cache: "no-store"`), redirecting away from `/dashboard*` or `/admin*` if unauthenticated.
- **Service Worker (`public/sw.js`, cache `vt-static-v4`)**: Excludes `/api/*`, `/admin*`, `/dashboard*`, `/tracker*`, `/more`, `/login`, `/forgot-access-code`, `/accommodation/new`, `/accommodation/*/edit`, and all React Server Component (`rsc: 1` / `?_rsc=`) requests. On activation, deletes all legacy caches.

---

## 3. Route & API Authorization Matrix

Authoritative route policy lives in `lib/auth/route-policy.ts`.

| Route / API Scope | Policy | Enforcement |
|---|---|---|
| `/`, `/tracker`, `/tracker/[publicId]`, `/analytics`, `/queue-progress`, `/calculator`, `/announcements`, `/universities*`, `/programmes*`, `/accommodation`, `/accommodation/[id]`, `/resources`, `/about`, `/submit`, `/more` | `PUBLIC` | Read-only public data; field-filtered so private emails/access-code hashes/tokens are never returned; anonymous entries have `name = null`. |
| `/login`, `/register`, `/admin/login`, `/forgot-access-code`, `/unsubscribe` | `AUTH_FLOW` | Guest-accessible authentication/recovery flows with rate limiting and anti-enumeration responses. |
| `/dashboard`, `/dashboard/information`, `/dashboard/updates`, `/dashboard/listings` | `APPLICANT_PROTECTED` | Edge `middleware.ts` preliminary redirect + `app/dashboard/layout.tsx` (`force-dynamic`) server check via `requireApplicantPage()`. |
| `/accommodation/new`, `/accommodation/[id]/edit` | `SIGNED_IN_PROTECTED` | Edge `middleware.ts` gate + API ownership checks (`canManageListing`). |
| `/admin`, `/admin/*` (except `/admin/login`) | `ADMIN_PROTECTED` | Edge `middleware.ts` preliminary redirect + `app/admin/layout.tsx` (`force-dynamic`) server check via `requireAdminPage()`. |
| `/api/applicant/me*`, `/api/applicant/sessions` | `APPLICANT_PROTECTED` | `requireApplicant()` derives `applicantId` strictly from verified `AuthSession` (prevents BOLA/IDOR); emits `private, no-store`. |
| `/api/admin/*`, `/api/announcements` (POST), `/api/announcements/[id]`, `/api/applicants/[id]` (PATCH/DELETE) | `ADMIN_PROTECTED` | `requireAdmin()` returns `401` for guests and `403` for applicants; requires MFA-verified `ADMIN` session. |
| `/api/listings/[id]/contact` | `SIGNED_IN_PROTECTED` | `getActor()` rejects guests with `401`; rate-limited; `private, no-store`. |
| `/api/cron/refresh` | `CRON` | Bearer `CRON_SECRET` header verification. |

---

## 4. OTP, Access Code & Account Recovery Policy

- **OTP Generation & Storage (`lib/otp.ts`)**:
  - 6-digit codes generated with `crypto.randomInt(0, 1_000_000).padStart(6, "0")` (leading zeros preserved).
  - Stored only as purpose- and email-bound keyed HMAC-SHA256 digests (`createHmac("sha256", derivedKey)`).
  - OTP emails are sent directly over TLS SMTP (`sendMailWithRetry`) and are **never** written to `EmailJob` in Postgres.
  - 5-minute TTL, max 5 attempts per challenge, 60-second resend cooldown, max 3 requests per 15 minutes per email/purpose, plus persistent IP/identifier rate limits (`RateLimitBucket`).
  - Verification executes atomically inside `prisma.$transaction` with conditional `updateMany` so concurrent replays fail.
  - OTP request endpoint returns an identical generic 200 response for matched and unmatched identifiers (anti-enumeration).
- **Access Codes (`lib/ids.ts`, `app/api/applicant/login/route.ts`)**:
  - Newly issued and reset access codes use 12-character CSPRNG format `XXXX-XXXX-XXXX` (60 bits entropy), hashed with `bcryptjs` cost 12.
  - Legacy 8-character codes remain compatible and are transparently upgraded from cost-10 to cost-12 bcrypt upon successful sign-in.
  - `DEMO-*` credentials are strictly blocked on both frontend and backend in `NODE_ENV === "production"`.
- **Account Recovery (`app/api/applicant/recovery/reset/route.ts`)**:
  - Requires verified `RECOVERY` OTP -> single-use `AuthGrant` (`purpose = RECOVERY`, 10-minute TTL).
  - Does **not** auto-login; hashes new access code with bcrypt cost 12, increments `Applicant.sessionVersion`, invalidates lingering recovery OTPs, **revokes all active applicant sessions**, logs audit event, and sends confirmation email.
- **Email Changes (`app/api/applicant/me/email/*`)**:
  - Requires authenticated applicant session + `EMAIL_VERIFY` OTP to the new email before updating `email` / `emailVerifiedAt`.
  - Notifies the previous verified email address when replaced.

---

## 5. Administrator MFA & Recovery

- **Mandatory TOTP (`lib/auth/totp.ts`, `app/api/admin/mfa/*`)**:
  - Password verification alone never issues a full `vt_admin_session` cookie.
  - Enrolled admins receive a single-use `ADMIN_MFA_CHALLENGE` grant and must complete 6-digit RFC 6238 TOTP (or single-use `XXXX-XXXX-XXXX` backup recovery code) before a session is issued.
  - Un-enrolled admins are directed through mandatory first-time TOTP enrollment (`ADMIN_MFA_ENROLL`) and issued 10 single-use bcrypt-hashed `AdminRecoveryCode` records.
  - TOTP secrets are encrypted at rest with AES-256-GCM using a key derived from `AUTH_SECRET`.

---

## 6. SMTP, Headers, CSRF & Dependency Posture

- **SMTP (`lib/email/transporter.ts`)**: Reuses a single server-only pooled Nodemailer transporter with TLS (`requireTLS: true` on STARTTLS, `rejectUnauthorized: true`, `minVersion: "TLSv1.2"`).
- **CSRF (`lib/security/csrf.ts`)**: `middleware.ts` enforces same-origin `Origin` / `Referer` verification on all state-changing `/api/*` requests (excluding Bearer-authenticated `/api/cron/*`).
- **Security Headers (`lib/security/security-headers-cjs.js`)**: Configured in `next.config.js` (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, and production `Strict-Transport-Security`).
- **DNS Deliverability Checklist (manual verification required by domain owner)**: Ensure `SPF`, `DKIM`, and `DMARC` (`p=quarantine` or `p=reject`) records are configured for the production sender domain if moving off `@gmail.com` to a custom domain.
- **Framework Advisory Note**: `npm audit` reports upstream advisories affecting Next.js 14.x (`14.2.35`, with remediation pointing to Next.js 16.x major upgrade). Upgrading Next.js 14 -> 16 is a breaking major change and was deferred to avoid destabilizing App Router / visual baselines; plan a dedicated framework upgrade window and test thoroughly before deploying.

---

## 7. Deployment & Rollback

1. **Pre-deploy**: Back up Postgres before running migrations. Verify `AUTH_SECRET` (>= 32 random bytes), `DATABASE_URL`, `DIRECT_URL`, `SITE_URL`, and SMTP env vars are set.
2. **Database migration**: Run `npx prisma migrate deploy` (additive migration `7_auth_security_hardening` only — preserves 100% of existing data).
3. **Build & deploy**: Run `npm run build` and deploy. Existing stateless JWT cookies are rejected by the new opaque-token store, cleanly prompting users and admins to sign in under the hardened session architecture (first-time admin sign-in will prompt TOTP enrollment).
4. **Rollback**: Application code can be rolled back without dropping the additive `AuthSession`, `AuthGrant`, `AdminRecoveryCode`, `RateLimitBucket`, or `AuthAuditLog` tables; existing `Applicant` and `AdminUser` rows remain intact.
