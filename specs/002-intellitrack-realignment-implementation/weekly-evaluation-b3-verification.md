# Phase B3 — Weekly Evaluation Migration Verification

**Spec:** `specs/002-intellitrack-realignment-implementation/spec.md`
**Tasks:** `specs/002-intellitrack-realignment-implementation/tasks.md` (T130–T135)
**Package:** `specs/002-intellitrack-realignment-implementation/weekly-evaluation-b2-migration-package.md`
**Requirement:** `REQ-FR-EVL-2` · **Acceptance:** `AC-F-04` · **Decision:** `DEC-2026-011`
**Date:** 2026-11-04
**Status:** **GATE B3 PASS** — migration applied to the verified isolated test database only; Phase C not started.

## 0. Scope and boundaries

Explicit human approval authorized applying **only** `20261104120000_support_weekly_evaluations`
to the verified isolated Gate A test database.

| Boundary | Result |
|---|---|
| `restore_branches` applied | **No** — still pending |
| Production accessed | **No** |
| Port 3000 used | **No** |
| Deploy/push | **No** |
| Prisma Client regenerated | **No** |
| Phase C application/UI code | **Not started** |
| Gate A fixtures mutated | **No** (fixture verification PASS; row state unchanged) |
| Existing uncommitted work | **Preserved** |

## 1. Artifact identity

| Property | Value |
|---|---|
| Path | `prisma/migrations/20261104120000_support_weekly_evaluations/migration.sql` |
| Expected SHA-256 | `76f524dc3e240cfdd259fd621114fea61609e92e7d0c40ff8c889cd1b875184f` |
| Actual SHA-256 | `76f524dc3e240cfdd259fd621114fea61609e92e7d0c40ff8c889cd1b875184f` |
| Hash match | **YES** |
| Size | 3,523 bytes |
| Ledger checksum after apply | `76f524dc3e240cfdd259fd621114fea61609e92e7d0c40ff8c889cd1b875184f` |

## 2. Environment preflight

`npm run gatea:env:preflight` → **PASS**

```text
target_env=test
run_id=gatea-20261103-2318
base_url_origin=http://127.0.0.1:3100
supabase_target_fingerprint=12ca17b49af2
database_target_fingerprint=d6389fa7d65f
direct_target_fingerprint=d6389fa7d65f
supabase_separate_from_current=yes
database_separate_from_current=yes
direct_separate_from_current=yes
credentials_present=yes
network_connections=none
```

Additional verified facts:

- `NEXT_PUBLIC_SUPABASE_URL` host `127.0.0.1`, port `54321`.
- `DATABASE_URL` / `DIRECT_URL` host `127.0.0.1`, port `54322`.
- `GATEA_TARGET_ENV=test`, `GATEA_RUN_ID=gatea-20261103-2318`.

## 3. Before state (pre-apply)

| Check | Result |
|---|---|
| Applied migrations | **6** (`0_init` … `20260817120000_add_notification_foundation`) |
| Pending migrations | `20260913090000_restore_branches`, `20261104120000_support_weekly_evaluations` |
| Weekly migration already applied | **No** |
| `public.branches` | **absent** |
| `period_key` column | **absent** |
| Evaluation rows | **2** (1 PROGRESS, 1 FINAL) |
| Duplicate derived identity groups | **0** |
| Rows without backfill anchor | **0** |
| Content fingerprint (excluding `period_key`) | `75b9e78103b317d863bed96a28308420` |

Pre-apply rows:

| Type | ID | evaluation_date | period_start | period_end | status | evaluator_id | overall_score |
|---|---|---|---|---|---|---|---|
| PROGRESS | `967514c8-bbc8-45a2-8116-90b3ac3bf7eb` | 2026-10-31 | 2026-10-01 | 2026-10-31 | SUBMITTED | `d3f445a1-dcf4-4e13-952b-cad2b82ebc4b` | 87.00 |
| FINAL | `0b8b9b4a-b5a9-46c3-9124-1d5fdae9374b` | 2026-12-10 | 2026-10-01 | 2026-12-10 | DRAFT | `d3f445a1-dcf4-4e13-952b-cad2b82ebc4b` | NULL |

Narrative, strengths, areas-for-improvement, and fixture-marker comments were
captured before apply and re-checked after apply.

## 4. Exact execution command

```powershell
cmd /c "docker exec -i supabase_db_local-supabase psql -U postgres -d postgres --set ON_ERROR_STOP=1 --single-transaction -f - < prisma\migrations\20261104120000_support_weekly_evaluations\migration.sql"
```

Result: **exit 0**

```text
ALTER TABLE
UPDATE 2
DO
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
DROP INDEX
CREATE INDEX
```

Only this artifact was sent. No `prisma migrate deploy`, no `prisma migrate dev`,
no Branch SQL.

## 5. Bookkeeping command

The migration was recorded **without re-running SQL**, using the verified
environment overlay and the guard that refuses non-test/non-loopback targets:

```powershell
npx prisma migrate resolve --applied 20261104120000_support_weekly_evaluations
```

Result: **exit 0** — `Migration 20261104120000_support_weekly_evaluations marked as applied.`

## 6. After state (post-apply)

| Check | Result |
|---|---|
| Applied migrations | **7** (weekly migration added) |
| Newly applied migration | **only** `20261104120000_support_weekly_evaluations` |
| Pending migrations | **only** `20260913090000_restore_branches` |
| `public.branches` | **absent** |
| `period_key` column | **present**, `character varying(20)`, `NOT NULL` |
| Evaluation rows | **2** (unchanged) |
| Duplicate identity groups | **0** |
| Content fingerprint (excluding `period_key`) | `75b9e78103b317d863bed96a28308420` (unchanged) |

Backfill results:

| Type | ID | period_start | period_end | period_key |
|---|---|---|---|---|
| PROGRESS | `967514c8-bbc8-45a2-8116-90b3ac3bf7eb` | 2026-10-01 | 2026-10-31 | **2026-09-28** |
| FINAL | `0b8b9b4a-b5a9-46c3-9124-1d5fdae9374b` | 2026-10-01 | 2026-12-10 | **SINGLE** |

Stored fields re-checked as unchanged: `evaluation_date`, `period_start`,
`period_end`, `status`, `evaluator_id`, `overall_score`, `strengths`,
`areas_for_improvement`, `comments`, and evaluation type. Narrative/score
content was not rewritten.

## 7. Indexes and constraints

Old unique index `evaluations_assignment_type_key`: **absent**.

New unique index:

```text
evaluations_assignment_type_period_key_key
  UNIQUE (assignment_id, evaluation_type, period_key)
```

CHECK constraint:

```text
evaluations_period_key_matches_type | c | convalidated = true
CASE
  WHEN evaluation_type = 'PROGRESS' THEN
    CASE
      WHEN period_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN extract(isodow FROM period_key::date) = 1
      ELSE false
    END
  ELSE period_key = 'SINGLE'
END
```

All pre-existing Evaluation FKs, PK, score CHECKs, period CHECK, and supporting
indexes remain present. The new composite unique index is the only new index;
no extra supporting index was added.

## 8. Fixture / E6 terminal state

`npm run gatea:fixtures:verify` → **PASS** (read-only)

```text
auth_accounts=8
application_users=8
roles=INTERN:2,SUPERVISOR:2,COORDINATOR:1,REPRESENTATIVE:2,ADMIN:1
companies=2
schools=1
assignments=CompanyA COMPLETED:2 CANCELLED:1 TERMINATED:1; CompanyB ACTIVE:1
approved_attendance_credited_minutes=1350
ann3_published=1
ann3_notifications=3
notifications=3
ui_records=work_logs:2,tasks:2,evaluations:2,feedback:1,documents:1,portfolios:1,published_announcements:2
branches=absent
```

Direct E6 state query also confirms Company A `COMPLETED:2 CANCELLED:1
TERMINATED:1`, Company B `ACTIVE:1`, ANN-3 `PUBLISHED` with 3 notifications.

## 9. Validation results (post-apply)

| Check | Result |
|---|---|
| `npx prisma validate` | **PASS** (`exit 0`, verified env overlay) |
| `npm run evaluation:weekly:test` | **PASS 16/16** |
| `npm run evaluation:test` | **PASS 8/8** |
| `npm run insights:test` | **PASS 5/5** |
| `npm run portfolio:test` | **PASS 7/7** |
| `npm run ai:test` | **PASS 13/13** |
| `npm run typecheck` | **PASS** |
| `npx eslint src` | **PASS** |
| `git diff --check` | **PASS** |

## 10. Rollback readiness

Rollback SQL and caveats are documented in §6 of the B2 package. Current state is
rollback-safe: exactly one PROGRESS row exists, so restoring the old
`(assignment_id, evaluation_type)` unique index would succeed. Once Phase C
creates multiple weekly PROGRESS rows, the rollback's old-unique recreation fails
closed and requires a human data decision. No rollback was executed.

## 11. T134 uniqueness-behavior note

T134 asks for disposable insert-based tests (different-week PROGRESS succeeds;
same-week duplicate fails; one-off duplicate fails). Those inserts were **not
performed** because the approved Gate B3 scope authorized only the migration
artifact and explicitly protected the accepted fixtures/E6 state. Structural
uniqueness is verified (composite unique index + CHECK), and Phase C T148 owns
the disposable insert checks. This is recorded as a scope limitation, not a
silent pass.

## 12. Decision

**PASS.** The approved weekly-Evaluation migration is applied and verified on the
isolated Gate A test database. `restore_branches` remains pending, `public.branches`
remains absent, fixture/E6 state is unchanged, and no Phase C work was started.

**STOP AT GATE B3.** Phase C requires separate human approval.
