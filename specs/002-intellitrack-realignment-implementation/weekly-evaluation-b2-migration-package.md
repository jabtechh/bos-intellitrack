# Phase B2 — Weekly Evaluation Migration Package

**Spec:** `specs/002-intellitrack-realignment-implementation/spec.md`
**Plan:** `specs/002-intellitrack-realignment-implementation/plan.md` (§ Phase B)
**Tasks:** `specs/002-intellitrack-realignment-implementation/tasks.md` (T120–T125)
**Design:** `specs/002-intellitrack-realignment-implementation/weekly-evaluation-b1-design.md`
**Requirement:** `REQ-FR-EVL-2` · **Acceptance:** `AC-F-04` · **Decision:** `DEC-2026-011`
**Date:** 2026-11-04
**Status:** Artifact applied and verified on the isolated Gate A test database — **GATE B3 PASS** (see `weekly-evaluation-b3-verification.md`). Production remains unapplied; Phase C approval pending.

## 0. Gate record and scope

Phase B2 (T120–T125) was explicitly approved for artifact creation only. Migration
execution/application was **not** approved. This document is the T125 execution
package for a future, separately approved Gate B3.

**Post-B2 execution record (2026-11-04):** Gate B3 was separately approved. The
artifact was applied to the verified isolated Gate A test database only, using
the targeted single-artifact workflow in §5, and verified. See
`weekly-evaluation-b3-verification.md`. The §5 plan is retained as the historical
approved procedure; Production remains unapplied and Phase C is not started.

**Approved decisions implemented**

| ID | Approved rule |
|---|---|
| OD-1 | Past weeks may be evaluated; the whole canonical week must fall inside the assignment dates; future weeks are never allowed. |
| OD-2 | Add database CHECK constraints for evaluation type / `period_key` consistency and canonical Monday weekly keys. |
| OD-3 | Keep the full unique key `(assignment_id, evaluation_type, period_key)`; `VOIDED` rows keep occupying their identity; replacement semantics stay deferred. |
| OD-5 | Refresh the stale Gate A fixture verification assertion to the accepted E6 terminal state without mutating fixture data. |

**What B2 did**

- Edited `prisma/schema.prisma` with the approved `periodKey` field and composite unique key.
- Created one forward-only migration artifact:
  `prisma/migrations/20261104120000_support_weekly_evaluations/migration.sql`.
- Added pure, database-free canonical-week helpers and a 16-case static/unit suite.
- Ran schema-only validation, static tests, and read-only collision preflight.
- Refreshed `scripts/verify-gatea-fixtures.ts` under OD-5 (read-only assertions only).

**What B2 did NOT do (verified)**

- No `prisma migrate deploy`, `prisma migrate dev`, `prisma db push`, seed, backfill, or write statement.
- No migration applied to any database; no `_prisma_migrations` row added.
- `20260913090000_restore_branches` was not applied; `public.branches` remains absent.
- No Gate A fixture mutation; no Production access; no port 3000 usage; no deploy/push.
- No Phase C UI/workflow implementation.
- Prisma Client regeneration was intentionally deferred to Phase C (see §7).

---

## 1. Exact Prisma diff

`git diff -- prisma/schema.prisma`:

```diff
@@ -696,6 +696,7 @@ model Evaluation {
   assignmentId        String           @map("assignment_id") @db.Uuid
   evaluatorId         String           @map("evaluator_id") @db.Uuid
   evaluationType      EvaluationType   @map("evaluation_type")
+  periodKey           String           @map("period_key") @db.VarChar(20)
   evaluationDate      DateTime         @map("evaluation_date") @db.Date
   periodStart         DateTime?        @map("period_start") @db.Date
   periodEnd           DateTime?        @map("period_end") @db.Date
@@ -716,7 +717,7 @@ model Evaluation {
   evaluator      User                 @relation("EvaluationEvaluator", fields: [evaluatorId], references: [id], onDelete: Restrict)
   acknowledgedBy User?                @relation("EvaluationAcknowledgedBy", fields: [acknowledgedById], references: [id], onDelete: SetNull)
 
-  @@unique([assignmentId, evaluationType], map: "evaluations_assignment_type_key")
+  @@unique([assignmentId, evaluationType, periodKey], map: "evaluations_assignment_type_period_key_key")
   @@index([assignmentId], map: "evaluations_assignment_idx")
   @@index([evaluatorId], map: "evaluations_evaluator_idx")
   @@index([evaluationType], map: "evaluations_type_idx")
```

Schema SHA-256: `f81f5e0a464b7916a287627ef3bd6fe6220b1082559040dfdf62006644f0ee65`

`npx prisma validate` result: **PASS** (`prisma_validate_exit=0`), run with
`DIRECT_URL`/`DATABASE_URL` overlaid from the verified loopback test environment.
Prisma validate parses the schema and does not connect to or mutate a database.

---

## 2. Migration artifact

**Path:** `prisma/migrations/20261104120000_support_weekly_evaluations/migration.sql`

| Property | Value |
|---|---|
| SHA-256 | `76f524dc3e240cfdd259fd621114fea61609e92e7d0c40ff8c889cd1b875184f` |
| Size | 3,523 bytes |
| Line endings | LF |
| Destructive statements | none (no DELETE/TRUNCATE/DROP TABLE/ALTER TYPE) |
| Unrelated changes | none (no Branch, Notification, enum, or task-status changes) |

Exact SQL:

```sql
-- Phase B2: repeatable weekly Evaluations (REQ-FR-EVL-2 / DEC-2026-011).
--
-- Forward-only. Existing Evaluation content is preserved: only a derived
-- canonical period identity column is added. No narrative, score, status,
-- evaluator, evaluation date, or stored period boundary is rewritten.
--
-- Canonical identity:
--   INITIAL / MIDTERM / FINAL -> period_key = 'SINGLE' (one per assignment/type)
--   PROGRESS                  -> period_key = ISO Monday 'YYYY-MM-DD' (one per week)
--
-- This artifact is intentionally standalone. It must never be applied together
-- with 20260913090000_restore_branches or any other pending migration.

-- 1. Add the derived identity column (nullable add is metadata-only).
ALTER TABLE "evaluations" ADD COLUMN "period_key" VARCHAR(20);

-- 2. Backfill the canonical identity from existing data.
--    PROGRESS: ISO Monday of the week containing COALESCE(period_start, evaluation_date).
--              PostgreSQL date_trunc('week', ...) starts weeks on Monday.
--    non-PROGRESS: literal 'SINGLE'.
UPDATE "evaluations"
SET "period_key" = CASE
  WHEN "evaluation_type" = 'PROGRESS'
    THEN to_char(date_trunc('week', COALESCE("period_start", "evaluation_date"))::date, 'YYYY-MM-DD')
  ELSE 'SINGLE'
END
WHERE "period_key" IS NULL;

-- 3. Fail-closed duplicate preflight. If this raises, the migration transaction
--    rolls back and a human decides what to do. Nothing is deleted or merged.
DO $$
DECLARE duplicate_groups integer;
BEGIN
  SELECT count(*) INTO duplicate_groups
  FROM (
    SELECT 1
    FROM "evaluations"
    GROUP BY "assignment_id", "evaluation_type", "period_key"
    HAVING count(*) > 1
  ) AS duplicates;

  IF duplicate_groups > 0 THEN
    RAISE EXCEPTION
      'Weekly Evaluation backfill produced % duplicate (assignment, evaluation_type, period_key) group(s); migration aborted for human data review.',
      duplicate_groups;
  END IF;
END $$;

-- 4. Enforce NOT NULL. The validated CHECK lets PostgreSQL avoid an extra
--    full-table scan before SET NOT NULL, then the temporary check is dropped.
ALTER TABLE "evaluations"
  ADD CONSTRAINT "evaluations_period_key_not_null"
  CHECK ("period_key" IS NOT NULL) NOT VALID;
ALTER TABLE "evaluations" VALIDATE CONSTRAINT "evaluations_period_key_not_null";
ALTER TABLE "evaluations" ALTER COLUMN "period_key" SET NOT NULL;
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_period_key_not_null";

-- 5. Enforce evaluation-type / period-key consistency and the canonical Monday
--    rule. Nested CASE guarantees the ::date cast is only reached after the
--    YYYY-MM-DD format check succeeds.
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_period_key_matches_type" CHECK (
  CASE
    WHEN "evaluation_type" = 'PROGRESS' THEN
      CASE
        WHEN "period_key" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          THEN extract(isodow FROM "period_key"::date) = 1
        ELSE false
      END
    ELSE "period_key" = 'SINGLE'
  END
);

-- 6. Replace one-per-type uniqueness with one-per-canonical-period uniqueness.
--    The new composite unique index is also the supporting index for
--    assignment + type + week lookups and chronological period ordering, so no
--    additional index is introduced. Prisma wraps this migration in a
--    transaction, therefore CREATE INDEX CONCURRENTLY is intentionally not used.
DROP INDEX "evaluations_assignment_type_key";
CREATE UNIQUE INDEX "evaluations_assignment_type_period_key_key"
  ON "evaluations"("assignment_id", "evaluation_type", "period_key");
```

### 2.1 Supporting-index decision

No additional index is added. The new unique index
`evaluations_assignment_type_period_key_key` serves:

- uniqueness enforcement for `(assignment_id, evaluation_type, period_key)`;
- assignment-scoped weekly lookups with a leading `assignment_id`;
- chronological weekly ordering when filtered by assignment and time.

The pre-existing indexes (`evaluations_assignment_idx`, `evaluator`, `type`,
`status`, `date`, `assignment_status`) remain unchanged. A separate
`(assignment_id, evaluation_type, period_start)` index was considered and
rejected for V1: it duplicates the new composite's access path and adds write
cost without a measured query need.

---

## 3. Collision / preflight result

Read-only preflight against the verified loopback test target
(`127.0.0.1:54322`, run id `gatea-20261103-2318`). `SELECT`/catalog reads only;
no write statement was executed.

| Check | Result |
|---|---|
| Duplicate `(assignment_id, evaluation_type, derived period_key)` groups | **0** |
| Evaluation rows without a backfill anchor (`COALESCE(period_start, evaluation_date)` NULL) | **0** |
| Total Evaluation rows | **2** (1 PROGRESS, 1 one-off) |
| Content fingerprint (`id,type,date,period_start,period_end,status`) | `75b9e78103b317d863bed96a28308420` |
| `period_key` column present | **No** (`0` columns) |
| Applied migrations in target | **6** (`0_init` … `20260817120000_add_notification_foundation`) |
| Pending migration in target | `20260913090000_restore_branches` only |
| `public.branches` | **absent** |

Backfill preview for the two existing rows:

| evaluation_type | evaluation_date | period_start | period_end | expected `period_key` |
|---|---|---|---|---|
| PROGRESS | 2026-10-31 | 2026-10-01 | 2026-10-31 | `2026-09-28` |
| FINAL | 2026-12-10 | 2026-10-01 | 2026-12-10 | `SINGLE` |

The legacy month-style PROGRESS row keeps `period_start=2026-10-01` and
`period_end=2026-10-31`; only `period_key` is derived. No duplicate group exists,
so the migration's fail-closed guard will not trigger on this target.

**Re-run before Gate B3.** Preflight is a point-in-time check; it must be repeated
inside the Gate B3 transaction window.

---

## 4. Static / unit test results

**Command:** `npm run evaluation:weekly:test`
**Result:** **PASS — 16/16**

Covered assertions:

1. schema declares `periodKey VARCHAR(20)` and the new composite unique key;
2. old `evaluations_assignment_type_key` is gone; four evaluation types and supporting indexes preserved;
3. migration statement order: nullable add → backfill → fail-closed duplicate guard → `SET NOT NULL` → CHECK → drop old index → create new unique index;
4. deterministic backfill and non-destructive behavior;
5. database-level `SINGLE` / Monday consistency checks;
6. no unrelated or non-transactional statements (`CONCURRENTLY`, Branch, Notification, enum, task-status);
7. `SINGLE` key rules for INITIAL/MIDTERM/FINAL;
8. canonical Monday calculation (weekdays, year boundary, leap day);
9. timezone boundary behavior (Asia/Manila midnight; DST-observing zone);
10. canonical timezone fallback `branch → company → Asia/Manila`;
11. past week allowed when fully inside the assignment;
12. current week allowed; future week rejected;
13. assignment-date boundaries require the whole canonical week;
14. non-PROGRESS / malformed selections rejected;
15. duplicate-prevention identity is canonical per assignment, type, and week;
16. legacy month-style PROGRESS compatibility (stored boundaries untouched; key `2026-09-28`).

**Schema validation:** `npx prisma validate` → **PASS**.

**OD-5 fixture verification:** `npm run gatea:fixtures:verify` → **PASS**, read-only.
The refreshed assertions now encode the accepted E6 terminal state:

```text
assignments=CompanyA COMPLETED:2 CANCELLED:1 TERMINATED:1; CompanyB ACTIVE:1
approved_attendance_credited_minutes=1350
ann3_published=1
ann3_notifications=3
notifications=3
branches=absent
```

No fixture row was created, updated, deleted, reactivated, or recreated.

---

## 5. Targeted Gate B3 application plan (proposed; NOT executed)

`prisma migrate deploy` is prohibited for this target because it would also apply
the unrelated pending `20260913090000_restore_branches` migration. Gate B3 must
apply **only** the new artifact, with explicit bookkeeping.

### 5.1 Preconditions

1. New explicit human approval naming the target and the exact command.
2. `npm run gatea:env:preflight` PASS; target is the verified loopback
   non-production database; `GATEA_TARGET_ENV=test`.
3. Record target identity without secrets: host `127.0.0.1`, port `54322`,
   run id `gatea-20261103-2318`, `public.branches` absent.
4. Capture a backup / dump of the target database and the Evaluation content
   fingerprint `75b9e78103b317d863bed96a28308420`.
5. Re-run the read-only collision preflight (must return 0 duplicate groups and
   0 rows without an anchor).
6. Verify the artifact checksum before execution:
   `(Get-FileHash prisma/migrations/20261104120000_support_weekly_evaluations/migration.sql -Algorithm SHA256).Hash.ToLower()`
   must equal `76f524dc3e240cfdd259fd621114fea61609e92e7d0c40ff8c889cd1b875184f`.
7. Confirm `prisma migrate status` shows `20260913090000_restore_branches` as the
   only pending migration and that it is **not** selected for application.

### 5.2 Exact proposed application command (single artifact only)

The verified target is the loopback Supabase container
`supabase_db_local-supabase`, and `psql` is available inside that container (it
is not on the Windows PATH). Gate B3 must re-verify the container/database
fingerprint immediately before this command.

```powershell
# Target: verified loopback non-production DB only. Never run against Production.
# --single-transaction makes the whole artifact atomic; ON_ERROR_STOP aborts on
# the fail-closed duplicate guard or any DDL error.
cmd /c "docker exec -i supabase_db_local-supabase psql -U postgres -d postgres --set ON_ERROR_STOP=1 --single-transaction -f - < prisma\migrations\20261104120000_support_weekly_evaluations\migration.sql"
```

Equivalent command if Gate B3 uses a host `psql` client instead of the container:

```powershell
psql $env:DIRECT_URL --set ON_ERROR_STOP=1 --single-transaction `
  -f prisma/migrations/20261104120000_support_weekly_evaluations/migration.sql
```

Then record Prisma bookkeeping **without re-running SQL**. Overlay the verified
environment and refuse anything that is not the loopback test target:

```powershell
$envText = Get-Content .env.gatea.local -Raw
if ($envText -notmatch '(?m)^\s*GATEA_TARGET_ENV\s*=\s*test\s*$') { throw 'Refusing: not a verified test env.' }
$vars = @{}
$envText -split "`n" | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z0-9_]+)\s*=(.*)$') { $vars[$matches[1]] = $matches[2].Trim() }
}
if (([uri]$vars['DIRECT_URL']).Host -ne '127.0.0.1') { throw 'Refusing: non-loopback target.' }
$env:DIRECT_URL = $vars['DIRECT_URL']
$env:DATABASE_URL = $vars['DATABASE_URL']
npx prisma migrate resolve --applied 20261104120000_support_weekly_evaluations
```

`migrate resolve --applied` only inserts the `_prisma_migrations` ledger row; it
does not execute the migration. This keeps the manual application consistent for
future `prisma migrate status`/`deploy` while leaving the Branch migration
pending.

**Why not `migrate deploy`:** it applies every pending migration, including
`20260913090000_restore_branches`. That is out of scope and separately unapproved.

**Why not `prisma db execute`:** it does not guarantee that a multi-statement
script runs in one transaction, so a mid-file failure could leave a partial
schema change. The `psql --single-transaction` route is the approved pattern.

### 5.3 Post-apply verification (read-only)

```sql
-- Column exists and is NOT NULL.
SELECT is_nullable FROM information_schema.columns
WHERE table_name='evaluations' AND column_name='period_key';

-- Exactly the approved CHECK and unique index exist.
SELECT conname FROM pg_constraint
WHERE conrelid='evaluations'::regclass AND conname='evaluations_period_key_matches_type';

SELECT indexname FROM pg_indexes
WHERE tablename='evaluations'
  AND indexname IN ('evaluations_assignment_type_key',
                    'evaluations_assignment_type_period_key_key');

-- Data: keys match the approved derivation and no rows were lost.
SELECT evaluation_type, id, period_start, period_end, period_key
FROM evaluations ORDER BY evaluation_type;

-- Content fingerprint must be unchanged except for the new derived column.
SELECT count(*) FROM evaluations;  -- expected 2
```

Expected: `is_nullable = NO`; CHECK present; old unique index absent; new unique
index present; PROGRESS key `2026-09-28`; FINAL key `SINGLE`; row count 2; no
narrative/score/status/date change. Then:

```powershell
npx prisma migrate status   # Branches remains pending; new migration recorded
npm run gatea:fixtures:verify
```

### 5.4 Stop conditions

Abort and roll back (see §6) if any of these occurs:

- target identity is not the verified loopback test database;
- duplicate preflight returns any duplicate group or unanchored row;
- a non-PROGRESS row does not get `SINGLE`, or a PROGRESS row's key is not Monday;
- any unrelated migration is applied, or `public.branches` appears;
- row count/content fingerprint changes beyond the derived column.

---

## 6. Rollback plan (documentation only; not executed)

Prisma does not natively roll back an applied migration. Rollback is manual,
human-approved, backed up, and forward-only alternative should be preferred.

```sql
BEGIN;

-- Refuse silently losing weekly rows: this fails (and rolls back the whole
-- transaction) if more than one evaluation of the same assignment/type exists,
-- which is the desired fail-closed behavior before restoring the old identity.
DROP INDEX IF EXISTS "evaluations_assignment_type_period_key_key";
ALTER TABLE "evaluations" DROP CONSTRAINT IF EXISTS "evaluations_period_key_matches_type";
ALTER TABLE "evaluations" DROP COLUMN IF EXISTS "period_key";
CREATE UNIQUE INDEX "evaluations_assignment_type_key"
  ON "evaluations"("assignment_id", "evaluation_type");

COMMIT;
```

Then remove the ledger row for the rolled-back migration (human-run, explicit):

```sql
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20261104120000_support_weekly_evaluations';
```

Rollback caveats:

- If weekly evaluations were created after Gate B3, recreating the old unique
  index fails; the transaction aborts and no data is lost. A human data decision
  is then required. Do not auto-delete or merge evaluations.
- Rollback drops only the derived `period_key`; narrative, scores, status,
  evaluator, dates, and stored period boundaries are not touched.
- Restore from the pre-apply backup is the last resort.
- Rollback SQL is intentionally kept in this spec document, not in
  `prisma/migrations/`, so Prisma can never apply it as a migration.

---

## 7. T123 decision — Prisma Client regeneration deferred

The Prisma Client (`src/generated/prisma`) is tracked but generated from the
pre-B2 schema. Regeneration was evaluated and intentionally deferred to Phase C:

- Regenerating now makes the new `periodKey` a required create/update input.
  Existing Evaluation create paths are Phase C scope; forcing them to supply a
  key would either implement weekly creation early or break typecheck.
- No database execution is involved either way; B2's acceptance is artifact and
  static validation.
- Phase C's first task must regenerate the client and supply server-derived
  `periodKey` values (canonical Monday for PROGRESS, `SINGLE` otherwise) before
  any UI/workflow code is written.
- This is a known, tracked Phase C prerequisite, not a B2 blocker.

---

## 8. Known Phase C follow-ups (not implemented)

- `intern-report.tsx` Evaluation row key `${type}-${evaluationDate}` collides once
  multiple weekly rows exist; use the evaluation id / period key.
- AI evidence takes the first 10 chronological evaluations; weekly rows can
  crowd out INITIAL/MIDTERM/FINAL evidence — change the selection strategy.
- `VOIDED` replacement semantics remain deferred (OD-3).
- Weekly Evaluation UI/workflow, server-side week validation wiring, and Prisma
  Client regeneration.
- `docs/evaluations-and-feedback.md` still describes one evaluation per type;
  update it to the approved repeatable-PROGRESS design only after Gate B3/Phase C
  so the doc does not claim behavior that is not yet live.
- Strict OD-1 containment means partial boundary weeks are not evaluable; the UI
  must explain this and offer only eligible full weeks.
