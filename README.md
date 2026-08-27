# 🇩🇪 Visa Tracker by Idrees

A community-driven tracker for Pakistani students following the German national
student visa process — built with Next.js, Prisma, and Postgres, deployable
free on Vercel.
 
## Features

- **Public tracker** — search by Tracking ID, browse/filter all approved entries
- **Partially-anonymous privacy model** — public view hides names, shows Tracking ID + journey
- **Applicant self-submission** — students submit their own journey, held for admin review
- **Applicant self-service dashboard** — log in with Tracking ID + Access Code to update your own entry
- **Admin panel** — approve/reject/edit/delete applicants, manage announcements, change password
- **Full analytics** — status funnel, monthly volume, monthly outcomes, top universities, Islamabad vs Karachi comparison, processing-time averages
- **ETA prediction engine** — estimates an applicant's next milestone date from observed data at the same consulate, with a confidence level
- **Announcements** — admin-published community updates
- **Resources page** — links to your WhatsApp community, WhatsApp channel, and German grade calculator
- **Optional email notifications** — via Resend, sent when an applicant's status changes

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL (any free provider: Neon, Supabase, Vercel Postgres)
- Custom lightweight auth (JWT cookies via `jose`) — no third-party auth vendor required
- Recharts for analytics charts
- Resend (optional) for email notifications

## 1. Get a free Postgres database

Pick one (all have free tiers):

- **Neon** — https://neon.tech (recommended, simplest)
- **Supabase** — https://supabase.com
- **Vercel Postgres** — from your Vercel dashboard, Storage tab

Copy the connection string(s) it gives you. If you get both a pooled and a
direct URL, use the pooled one for `DATABASE_URL` and the direct one for
`DIRECT_URL`. If you only get one, use it for both.

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=...
DIRECT_URL=...
AUTH_SECRET=...        # generate with: openssl rand -base64 32
SEED_ADMIN_EMAIL=...
SEED_ADMIN_PASSWORD=...
RESEND_API_KEY=        # optional
EMAIL_FROM=            # optional
```

## 3. Install, migrate, and seed locally

```bash
npm install
npx prisma db push        # creates all tables in your database
npm run seed               # creates your admin login
npm run dev                 # http://localhost:3000
```

Log in at `/admin/login` with the email/password from `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`, then change the password immediately under
**Admin → Settings**.

> Note: `npx prisma generate` (run automatically on install) downloads a
> small database engine binary from Prisma's CDN. This requires normal
> internet access — it will work on your own machine and on Vercel's build
> servers, but will fail in network-locked sandboxes.

## 4. Deploy to Vercel (free)

1. Push this project to a new GitHub repository.
2. Go to https://vercel.com → **Add New Project** → import your repo.
3. In **Environment Variables**, add everything from your `.env` file
   (`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `RESEND_API_KEY`,
   `EMAIL_FROM`). You don't need `SEED_*` unless you plan to re-run the seed
   script in Vercel's shell.
4. Deploy. Vercel runs `npm install` → `prisma generate` → `next build`
   automatically.
5. After the first deploy, run the schema push and seed once, either:
   - locally, pointed at your production database (safest — just run
     `npx prisma db push` and `npm run seed` with your production
     `DATABASE_URL` in `.env`), or
   - via Vercel's CLI: `vercel env pull && npx prisma db push && npm run seed`.
6. Visit `your-project.vercel.app/admin/login` and log in.

Your site is now live on a free `your-project.vercel.app` domain. You can add
a custom domain later from the Vercel dashboard (Settings → Domains) at no
extra cost beyond the domain itself.

## Security notes

- **Never** commit your real `.env` file — it's already git-ignored.
- Change the seeded admin password immediately after first login.
- `AUTH_SECRET` should be a long random string, unique to your deployment.
- Applicant "accounts" use a Tracking ID + Access Code pair instead of a
  full email/password system — the Access Code is shown once at
  submission time and stored only as a bcrypt hash, the same way passwords
  are.

## Project structure

```
app/
  page.tsx                Home
  tracker/                Public tracker (search + list) and per-applicant page
  analytics/              Full analytics dashboard
  queue-progress/         Queue movement + processing-time analytics
  announcements/          Public announcements feed
  about/                  About + disclaimer
  resources/              Community links
  submit/                 Applicant self-submission form
  login/, register/       Applicant login (register redirects to submit)
  dashboard/              Applicant self-service area (journey, info, updates)
  admin/                  Admin panel (login, dashboard, applicants, announcements, settings)
  api/                    All API routes backing the above
lib/                      Shared logic: db client, auth, validation, ETA engine, constants
prisma/schema.prisma      Full database schema
prisma/seed.ts            Creates the first admin user
```

## Attribution note

This project takes inspiration from the community tracker at
`visatracker.waleedingermany.com` but does not copy or import its
underlying data — all data here comes from this app's own applicant
submissions and admin entries.

## Disclaimer

This is an independent, community-run project. It is not affiliated with,
endorsed by, or connected to the German Federal Foreign Office or any German
consulate. All timeline estimates are unofficial and for general guidance
only.
