# Soft deletion

`Applicant` and `Announcement` use `prisma-extension-soft-delete` through the
shared client in `lib/db.ts`. A nullable `deletedAt` timestamp marks deletion;
existing rows are active. All application queries and seed scripts use this
client. `AdminUser` has no deletion workflow, and `StatusEvent` is retained as
applicant history rather than independently soft deleted.

## Behavior and recovery

- Normal reads, counts, aggregates, relation queries, and bulk updates exclude
  deleted rows. Unique updates and upserts receive an additional active-record
  predicate: the package deliberately leaves these operations unfiltered.
- Deletion requires an admin session. The DELETE endpoints use a conditional
  bulk operation on a single ID so concurrent or repeated deletes return 404
  without changing the original deletion timestamp.
- Deleted applicants cannot log in or read/update their record with an existing
  session. Updates that race with deletion return 404. Request schemas do not
  accept deletion fields or arbitrary Prisma filters.
- Admins can choose **Deleted entries** or **Deleted announcements** and restore
  a record. Trash queries and restore endpoints require admin authentication.
  Restores are atomic conditional updates; active or missing records return 404.
- Restoration preserves approval, status, credentials, and history. An approved
  record becomes public again; a pending record still needs approval. Existing
  applicant sessions become usable again after recovery.
- Tracking IDs stay globally unique, including on deleted rows. The allocator
  intentionally uses raw SQL over all rows while holding a PostgreSQL transaction
  lock. Never replace it with an active-only row count.
- History keeps its foreign key and is not deleted when the parent is soft
  deleted. The optional Prisma relation allows the extension to return `null`
  when a history query includes a deleted parent.

## Client boundaries

Import `prisma` from `lib/db.ts`; use `createPrismaClient()` only when another
connection is necessary. Raw SQL and an unextended `PrismaClient` bypass the
extension. The integration tests use an unextended client only for isolated
fixture cleanup and assertions about retained data.

Explicit `deletedAt` predicates bypass the active filter for trusted maintenance
and recovery. Keep those filters server controlled. Nested updates through to-one
relations and compound-unique reads remain disabled by the package's safety
defaults. A normal upsert cannot revive a deleted record: its preserved unique
key causes a uniqueness error instead of updating the archived row.

The package rewrites some operations (for example `delete` to `update` and
`findUnique` to `findFirst`) using its captured client. For workflows requiring
an interactive transaction, use `findFirst`/`findFirstOrThrow` and explicit
`update`/`updateMany` with `deletedAt` predicates so every operation stays on the
transaction client. The app's delete/restore endpoints each use one atomic write.

There is no public hard-delete or purge endpoint. Soft deletion retains personal
data and history; any retention or permanent-erasure workflow must be designed
and authorized separately rather than assuming these records have been erased.

## Production migrations

This repository previously used `prisma db push` without migration history. It
now includes a baseline matching the previous committed schema followed by an
additive soft-delete migration. Use `DIRECT_URL` for a direct database connection
and the same target database as `DATABASE_URL`.

For a **new, empty database**:

```bash
npm ci
npm run db:migrate:deploy
npm run build
```

For an **existing database matching the baseline schema**, take a backup and
verify the schema matches `20261015000000_baseline/migration.sql`, then record
the existing baseline once and apply the new migration:

```bash
npx prisma migrate resolve --applied 20261015000000_baseline
npm run db:migrate:deploy
```

Do not mark the baseline applied on an empty database or one with unreviewed
schema differences. Reconcile previous ad-hoc schema changes before baselining.
Do not use `db push`, `migrate reset`, or `--accept-data-loss` for production.

Apply migrations before deploying the new app. Suspend deletion actions during
the rollout until all instances use the new client, since older app instances
still perform physical deletes. The migration adds nullable timestamps and
indexes and relaxes the history relation's nullability without removing data or
its foreign key. There is no backfill. Keep the columns and retained rows if the
application release must be rolled back; dropping them loses deletion state.

## Verification

```bash
docker compose --profile test run --build --rm test
```

Tests use a separate PostgreSQL service and unique temporary schemas. They apply
real migrations and verify filtering, authorization, recovery, original tracking
ID collisions, concurrent allocation/restoration, and upgrade of populated
baseline tables. With local dependencies installed, the same suite runs with
`TEST_DATABASE_URL=postgresql://... npm test`.

Upstream behavior: [prisma-extension-soft-delete documentation](https://github.com/olivierwilkinson/prisma-extension-soft-delete).
