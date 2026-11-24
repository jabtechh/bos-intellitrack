# Phase B1 — Weekly Evaluation Data Design

**Spec:** `specs/002-intellitrack-realignment-implementation/spec.md`
**Plan:** `specs/002-intellitrack-realignment-implementation/plan.md` (§ Phase B)
**Tasks:** `specs/002-intellitrack-realignment-implementation/tasks.md` (T110–T115)
**Requirement:** `REQ-FR-EVL-2` · **Acceptance:** `AC-F-04` · **Decision:** `DEC-2026-011`
**Date:** 2026-11-04
**Status:** Design approved; Phase B2 artifact applied and verified at Gate B3 — see `weekly-evaluation-b3-verification.md`. **Phase C approval pending.**

## 0. Gate record and scope

**Gate confirmation.** The human instruction for this session explicitly authorizes **Phase B1 design work only (T110–T115)**. Gate A (T000–T107) is recorded PASS in `implementation-notes.md`; Automatic Portfolio P1 and Gemini + Portfolio P2 are recorded PASS in the corresponding spec documents. Nothing in this document authorizes T120 or later.

**What this phase did**

- Read-only audit of schema, migrations, domain, authorization, routes/actions, reporting/Insights/Portfolio/AI usage, and tests.
- Read-only inspection of the verified local non-production database via `.env.gatea.local` (loopback target only).
- Design artifacts produced (this file).

**What this phase did NOT do (verified)**

- No `prisma/schema.prisma` edit.
- No migration created, edited, or applied.
- No `prisma migrate`, `db push`, seed, backfill, or write statement of any kind.
- No Gate A fixture mutation.
- No Production access; no port 3000 usage; no deploy/push.
- No Phase B2/C code.

**Environment used for read-only verification**

| Check | Result |
|---|---|
| `npm run gatea:env:preflight` | PASS — `target_env=test`, loopback DB `127.0.0.1:54322`, Supabase `127.0.0.1:54321`, separate from current configured target, `network_connections=none` |
| `.env.gatea.local` run id | `gatea-20261103-2318` |
| Local Supabase containers | `supabase_db_local-supabase` healthy; port 54322 |
| Queries executed | `SELECT` / catalog reads only |

**Pre-existing environment observation (not caused by B1).** `npm run gatea:fixtures:verify` currently fails on `Company A must have one ACTIVE visual assignment`. The verified local DB shows the primary Gate A assignment in `COMPLETED`, which matches the accepted E6 clean-run result (`primary_active_to_completed: pass` in `.gatea/e6-clean-browser-results.local.json`). The verify script still asserts the pre-E6 fixture state. This is pre-existing drift between the Gate A fixture script and the accepted Gate A end state; B1 changed nothing. Recommended action: refresh that assertion under a separately approved Gate A artifact task, and use a row-level fingerprint (not the stale status assertion) to prove fixture preservation in B3.

---

## 1. Current-state audit (T110)

### 1.1 Schema

`prisma/schema.prisma` (`model Evaluation`, lines 694–727):

- `evaluationType EvaluationType @map("evaluation_type")` with `EvaluationType = INITIAL | MIDTERM | PROGRESS | FINAL`.
- `evaluationDate DateTime @db.Date` (NOT NULL), `periodStart DateTime? @db.Date`, `periodEnd DateTime? @db.Date`.
- `criteriaScores Json @default("[]")`, `overallScore Decimal?(5,2)`.
- `status EvaluationStatus @default(DRAFT)` with `DRAFT | SUBMITTED | ACKNOWLEDGED | VOIDED`.
- **Blocking constraint:** `@@unique([assignmentId, evaluationType], map: "evaluations_assignment_type_key")`.
- Supporting indexes: `assignmentId`, `evaluatorId`, `evaluationType`, `status`, `evaluationDate`, `(assignmentId, status)`.
- Prisma client: `provider = "prisma-client"`, output `src/generated/prisma`; Prisma `^7.9.0` (`@prisma/client` `^7.9.1`).

### 1.2 Applied migrations

`0_init/migration.sql` creates `evaluations`, `evaluation_type` enum, the six indexes, and:

```sql
CREATE UNIQUE INDEX "evaluations_assignment_type_key"
  ON "evaluations"("assignment_id", "evaluation_type");
```

Check constraints already present: `evaluations_overall_score_non_negative`, `evaluations_overall_score_max_100`, `evaluations_period_end_after_start`.

`_prisma_migrations` in the verified local non-production DB contains 6 applied migrations. **`20260913090000_restore_branches` is NOT applied and `public.branches` does not exist.** This is the single pending migration in that target, and it is the critical artifact-safety constraint for B2/B3 (§12).

### 1.3 Verified local data

| Fact | Value |
|---|---|
| `evaluations` rows | 2 |
| Breakdown | `PROGRESS / SUBMITTED` ×1, `FINAL / DRAFT` ×1 |
| Both rows belong to | `GATEA-ACTIVE-A-20261103-2318` (Gate A primary fixture, now `COMPLETED` after E6) |
| `period_start` / `period_end` NULLs | 0 / 0 |
| Legacy `PROGRESS.period_start` | `2026-10-01` (Thursday) → canonical Monday `2026-09-28` |
| Legacy `FINAL.period_start` | `2026-10-01` → would become `SINGLE` |

The legacy `PROGRESS` row covers `2026-10-01 … 2026-10-31` (a month-style progress period), not a Monday–Sunday week. **Its stored period is preserved; only the derived key is added.** Consequence: that legacy row occupies canonical week `2026-09-28`, and no new weekly `PROGRESS` row can be created for that week while the old row exists. This is intentional duplicate prevention, not data loss (§7; risk R-3).

### 1.4 Domain and validation

`src/lib/evaluations/domain.ts`

- `evaluationInputSchema` accepts `internUserId`, `evaluationType`, `evaluationDate`, optional `periodStart`/`periodEnd`, criteria inputs. It is client-shaped and does **not** contain a period identity.
- `periodEnd < periodStart` rejected client-side only.
- `TYPE_LABELS.PROGRESS = "Progress"`.
- `canSeeDraft(role)` still returns true for `REPRESENTATIVE`/`ADMIN`, but it has **no call sites** (verified) — dead helper, not an active authorization hole. Leave for Phase C cleanup or remove as dead code without behavior change.

### 1.5 Authorization

`src/lib/evaluations/authorization.ts`

- `requireEvaluationViewer()` returns one of `INTERN` (own `internProfile`), `SUPERVISOR` (own Bo's Coffee `supervisorProfile`), `COORDINATOR` (own `schoolId`); otherwise redirects. No Representative/Admin branch.
- `evaluationWhere()`:
  - Intern: `status IN (SUBMITTED, ACKNOWLEDGED)` AND `assignment.internProfileId = own`;
  - Supervisor: `assignment.supervisorProfileId = own` (drafts + finalized);
  - Coordinator: finalized AND `assignment.internProfile.schoolId = own`.
- `requireSupervisorEvaluationContext()` redirects non-Supervisors.

All scoping is **per assignment**, so repeatable rows inherit the same company/school isolation without a new join path. The only scope risk is query-level: any caller that assumes "one row per type" must be updated (see §10).

### 1.6 Actions and routes

`src/app/evaluations/actions.ts`

- `createEvaluation`: Supervisor context → `assignmentFor(supervisorProfileId, internUserId)` requires `status: ACTIVE` and active intern user → `evaluation.create` with client `evaluationType`, `evaluationDate`, `periodStart`, `periodEnd`; broad `catch` maps any error to "A draft for this evaluation type already exists…".
- `updateEvaluation`: `updateMany` scoped by `id + status DRAFT + evaluatorId + supervisorProfileId`; **allows changing `evaluationType` and `assignmentId`**.
- `finalizeEvaluation`: DRAFT → SUBMITTED, scoped to evaluator + supervised assignment.
- `acknowledgeEvaluation`: Intern-only SUBMITTED → ACKNOWLEDGED on own assignment.
- No VOID action exists, so `VOIDED` is currently unreachable through the app.

Routes: `/evaluations` (list, all roles via viewer scope), `/evaluations/new`, `/evaluations/review`, `/evaluations/[evaluationId]`, `/evaluations/[evaluationId]/edit`. List orders only by `evaluationDate desc`; detail renders `periodStart`/`periodEnd` when both exist.

### 1.7 Tests

- `scripts/test-evaluation-foundation.ts` asserts the **old** unique string `@@unique([assignmentId, evaluationType]` and must be rewritten in Phase C (not now).
- `scripts/setup-demo-data.ts` uses `where: { assignmentId_evaluationType: … }`; that compound unique input disappears after the schema change → expected compile failure until Phase C/B2 updates the seed script.
- `scripts/verify-demo-data.ts`, `scripts/test-portfolio-report-foundation.ts`, `scripts/test-automatic-portfolio.ts` construct or read evaluation shapes without a period key; they remain valid as pure-function fixtures (no schema dependency) unless TypeScript requires the new required field on `Evaluation` literals.

---

## 2. Representation decision (T111 direction)

| Option | Assessment | Verdict |
|---|---|---|
| **A. Keep `PROGRESS`, add `periodKey`** | Minimal forward-only change; preserves all four existing enum values and every existing row; one canonical identity; no new tables; matches `DEC-2026-011` and the approved Plan § Phase B | **ADOPT** |
| B. Add `WEEKLY` to `EvaluationType` | Splits `PROGRESS` semantics, leaves legacy `PROGRESS` rows ambiguous, needs a PG enum migration with extra deployment constraints, and creates two paths for the same requirement | REJECT |
| C. Separate `EvaluationPeriod` / `EvaluationCycle` table | Most normalized, but no approved requirement for reusable cycles, cadence rules, or period metadata beyond week start/end; adds join and backfill complexity now | DEFER (revisit only if multi-cadence periods are approved) |
| D. Add `evaluationCadence` (`ONE_OFF`/`WEEKLY`) beside the type | Second source of truth that must stay consistent with `evaluationType`; drift risk with no requirement benefit | REJECT |

**Schema field name:** `periodKey` / `period_key` (as approved in the Plan).
**Type:** `VARCHAR(20)` — accommodates `SINGLE` (6) and `YYYY-MM-DD` (10) with headroom.

**Type → key mapping (canonical):**

| `evaluationType` | Cadence | `periodKey` | Rows per assignment |
|---|---|---|---|
| `INITIAL` | one-off | `SINGLE` | at most 1 |
| `MIDTERM` | one-off | `SINGLE` | at most 1 |
| `FINAL` | one-off | `SINGLE` | at most 1 |
| `PROGRESS` | weekly recurring | ISO Monday `YYYY-MM-DD` | 1 per canonical week, unlimited distinct weeks |

No new enum value. `PROGRESS` **is** the V1 weekly evaluation type.

---

## 3. Canonical identity and lifecycle

**Identity:** `(assignmentId, evaluationType, periodKey)` — enforced by one composite unique index.

**Lifecycle (unchanged per row):**

```
DRAFT ──finalize by assigned Supervisor──▶ SUBMITTED ──acknowledge by Intern──▶ ACKNOWLEDGED
  │                                            │
  └────────────── VOIDED (reserved; no app action today) ─────────────┘
```

Rules:

1. A canonical week is identified by its **Monday local date**, so the same week can never be entered twice for the same assignment, regardless of who submits or when.
2. `periodKey` is **server-derived only**. Client input is ignored; the client cannot supply or override it.
3. `evaluationDate` remains the date the evaluation was recorded/issued. It is **not** part of identity and is **not** constrained to fall inside the period (late recording of a prior week is legitimate). The canonical period is shown from `periodStart`/`periodEnd` for new rows and from `periodKey` for legacy PROGRESS rows (§7).
4. DRAFT is editable only by the authoring Supervisor for an assignment they currently supervise. SUBMITTED/ACKNOWLEDGED are read-only. No hard delete.
5. A finalized row is not silently replaced or merged. A duplicate create is rejected with a clear message; nothing is overwritten (§7).
6. Editing a DRAFT's type or intern changes its identity: the server must recompute `periodKey` (`SINGLE` for one-off types, canonical Monday for `PROGRESS`) and handle a unique conflict as a user-facing error (§10.1, Phase C).
7. `VOIDED` rows keep their identity and continue to occupy their slot. Replacing a voided weekly evaluation in the same week is **not** in V1 (Open Decision OD-3).

**Canonical timezone:** `assignment.branch?.timezone ?? assignment.company.timezone ?? "Asia/Manila"`.
Branch timezone is non-null when a branch is assigned and is initialized from the company timezone; `Company.timezone` defaults to `Asia/Manila`. `Asia/Manila` is the last-resort fallback required by the spec.

**Period boundaries:** Monday `00:00:00` through Sunday `23:59:59.999…` in that timezone. Stored as DATE-only values: `periodStart` = Monday, `periodEnd` = Sunday (inclusive). No timestamps are introduced, so no DST/timestamp ambiguity is stored.

**Reference algorithm (Phase C, T140):**

1. `localToday` = `localDateValue(now, canonicalTimezone)` → `YYYY-MM-DD` (reuse `src/lib/attendance/domain.ts`).
2. Anchor to UTC midnight: `d = new Date(`${localToday}T00:00:00.000Z`)`.
3. `isoDow = d.getUTCDay() || 7` (1 = Monday … 7 = Sunday).
4. `monday = new Date(d - (isoDow - 1) * 86_400_000)`; `sunday = monday + 6 days`.
5. `periodKey = monday.toISOString().slice(0, 10)`.

This is calendar-date arithmetic on UTC-anchored dates: independent of the server process timezone and stable for `Asia/Manila` (no DST). If an explicit week is later allowed (OD-1), the same function takes the chosen anchor date; the server still recomputes Monday/Sunday and `periodKey`.

---

## 4. Proposed Prisma schema diff (T111)

```diff
 model Evaluation {
   id                  String           @id @default(uuid()) @db.Uuid
   assignmentId        String           @map("assignment_id") @db.Uuid
   evaluatorId         String           @map("evaluator_id") @db.Uuid
   evaluationType      EvaluationType   @map("evaluation_type")
+  periodKey           String           @map("period_key") @db.VarChar(20)
   evaluationDate      DateTime         @map("evaluation_date") @db.Date
   periodStart         DateTime?        @map("period_start") @db.Date
   periodEnd           DateTime?        @map("period_end") @db.Date
@@
-  @@unique([assignmentId, evaluationType], map: "evaluations_assignment_type_key")
+  @@unique([assignmentId, evaluationType, periodKey], map: "evaluations_assignment_type_period_key_key")
   @@index([assignmentId], map: "evaluations_assignment_idx")
   @@index([evaluatorId], map: "evaluations_evaluator_idx")
   @@index([evaluationType], map: "evaluations_type_idx")
   @@index([status], map: "evaluations_status_idx")
   @@index([evaluationDate], map: "evaluations_date_idx")
   @@index([assignmentId, status], map: "evaluations_assignment_status_idx")
   @@map("evaluations")
 }
```

Notes:

- Field is eventually **required** and has **no default**. A silent `@default("SINGLE")` is rejected because it would let a mis-coded `PROGRESS` create look valid until the CHECK constraint fires, hiding the defect.
- Prisma's generated compound-unique input becomes `assignmentId_evaluationType_periodKey`. The old `assignmentId_evaluationType` input disappears → seed/test callers must be updated in Phase C (§7, §10.1).
- The consistency CHECK (regex + Monday + `SINGLE`) is SQL-only, consistent with this repo's documented policy that CHECK constraints live in reviewed migrations (`prisma/schema.prisma` header).

---

## 5. Proposed forward-only SQL migration plan (T112)

**Not created in B1.** Future artifact path (B2): `prisma/migrations/<timestamp>_support_weekly_evaluations/migration.sql`. One migration, one purpose, no unrelated statements, no applied migration touched.

```sql
-- Phase B: repeatable weekly Evaluations (REQ-FR-EVL-2 / DEC-2026-011)
-- Forward-only. Existing Evaluation content is preserved; only a derived
-- canonical period identity column is added.

-- 1. Add the derived identity column (nullable add is metadata-only).
ALTER TABLE "evaluations" ADD COLUMN "period_key" VARCHAR(20);

-- 2. Backfill the canonical identity from existing data.
--    PROGRESS   -> ISO Monday of the week containing COALESCE(period_start, evaluation_date)
--    INITIAL/MIDTERM/FINAL -> 'SINGLE'
UPDATE "evaluations"
SET "period_key" = CASE
  WHEN "evaluation_type" = 'PROGRESS'
    THEN to_char(date_trunc('week', COALESCE("period_start", "evaluation_date"))::date, 'YYYY-MM-DD')
  ELSE 'SINGLE'
END
WHERE "period_key" IS NULL;

-- 3. Fail-closed duplicate preflight. If this raises, the whole migration
--    transaction rolls back and a human decides what to do with the data.
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
      'Weekly Evaluation backfill produced % duplicate (assignment, type, periodKey) group(s); migration aborted for human data review.',
      duplicate_groups;
  END IF;
END $$;

-- 4. Enforce NOT NULL without an unnecessary blocking scan window.
ALTER TABLE "evaluations"
  ADD CONSTRAINT "evaluations_period_key_not_null"
  CHECK ("period_key" IS NOT NULL) NOT VALID;
ALTER TABLE "evaluations" VALIDATE CONSTRAINT "evaluations_period_key_not_null";
ALTER TABLE "evaluations" ALTER COLUMN "period_key" SET NOT NULL;
ALTER TABLE "evaluations" DROP CONSTRAINT "evaluations_period_key_not_null";

-- 5. Enforce type/key consistency and the Monday invariant at the database.
--    Nested CASE guarantees the ::date cast only runs after the format check.
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

-- 6. Replace the one-per-type uniqueness with one-per-canonical-period.
DROP INDEX "evaluations_assignment_type_key";
CREATE UNIQUE INDEX "evaluations_assignment_type_period_key_key"
  ON "evaluations"("assignment_id", "evaluation_type", "period_key");
```

**Sequencing rationale**

- Nullable add → backfill → NOT NULL → swap unique index is the only order that works with existing rows and with Prisma's non-null model field.
- Prisma Migrate runs each PostgreSQL migration inside a transaction, so steps 1–6 are atomic: there is no window where the old and new uniqueness rules are both absent.
- The `NOT VALID` + `VALIDATE` + `SET NOT NULL` sequence lets PostgreSQL avoid a second full-table scan on large tables. The table is small today; the pattern is included so the artifact stays safe if the evaluation table grows before execution.
- `DROP INDEX` + `CREATE UNIQUE INDEX` matches the form used by `0_init` and therefore matches what Prisma introspection expects for a mapped `@@unique`. `CREATE INDEX CONCURRENTLY` is deliberately avoided because it cannot run inside a Prisma migration transaction.
- The CHECK is additive safety beyond the Plan's minimum. It makes the identity rule enforceable even for scripts/jobs that bypass application validation.

**Deliberately excluded**

- No change to `periodStart`/`periodEnd` values or nullability.
- No rewrite of `evaluationDate`.
- No enum change, no new table, no data deletion.
- No touches to `TaskStatus`, `Branch`, `Notification`, Calendar, or any other schema area.

---

## 6. Duplicate preflight and stop condition (T113)

Run **before** any write, and again implicitly inside the migration (step 3).

```sql
-- Preflight A: proposed identity collisions
WITH derived AS (
  SELECT
    id,
    assignment_id,
    evaluation_type,
    CASE
      WHEN evaluation_type = 'PROGRESS'
        THEN to_char(date_trunc('week', COALESCE(period_start, evaluation_date))::date, 'YYYY-MM-DD')
      ELSE 'SINGLE'
    END AS proposed_period_key
  FROM evaluations
)
SELECT assignment_id, evaluation_type, proposed_period_key,
       count(*) AS row_count,
       array_agg(id ORDER BY id) AS evaluation_ids
FROM derived
GROUP BY assignment_id, evaluation_type, proposed_period_key
HAVING count(*) > 1
ORDER BY assignment_id, evaluation_type, proposed_period_key;

-- Preflight B: anchor availability (evaluation_date is NOT NULL, so expected 0)
SELECT count(*) AS rows_without_anchor
FROM evaluations
WHERE COALESCE(period_start, evaluation_date) IS NULL;

-- Preflight C: row count and content fingerprint baseline (for preservation proof)
SELECT count(*) AS total_rows,
       count(*) FILTER (WHERE evaluation_type = 'PROGRESS') AS progress_rows,
       count(*) FILTER (WHERE evaluation_type <> 'PROGRESS') AS one_off_rows,
       md5(string_agg(id::text || '|' || evaluation_type::text || '|' || evaluation_date::text
            || '|' || COALESCE(period_start::text, '') || '|' || COALESCE(period_end::text, '')
            || '|' || status::text, E'\n' ORDER BY id)) AS content_fingerprint
FROM evaluations;
```

**Stop condition (hard):**

- Preflight A returns **any** row → **STOP**. Do not run the migration. Do not delete, merge, deduplicate, or "fix" rows automatically. Return to the human with the colliding IDs for a data decision.
- Preflight B returns non-zero → STOP (unexpected; `evaluation_date` is NOT NULL).
- Preflight C fingerprint is recorded before and after so row preservation is provable.

Expected result today: A = 0 rows, B = 0, C = 2 rows (1 PROGRESS, 1 one-off).

Note: the current unique index already guarantees at most one row per `(assignment, type)`, so a collision is theoretically impossible. Preflight A remains mandatory as defense-in-depth and as proof that the assumption held at execution time.

---

## 7. Backfill and backward compatibility strategy

**Backfill rules**

- `PROGRESS` → Monday of the ISO week containing `COALESCE(period_start, evaluation_date)`.
- `INITIAL` / `MIDTERM` / `FINAL` → literal `SINGLE`.
- Existing `period_start` / `period_end` / `evaluation_date` / scores / text / status / acknowledgment fields are **not modified**.
- `evaluationDate` is NOT NULL, so no row can fail to produce a key; the fallback chain cannot yield NULL.

**Compatibility outcomes**

| Existing row | After migration | Behaviour |
|---|---|---|
| INITIAL / MIDTERM / FINAL | `period_key = 'SINGLE'` | Exactly one per assignment/type, identical to today |
| PROGRESS (legacy, monthly-style period) | Monday key of its `period_start` week | Readable and unchanged in content; occupies that week; cannot be duplicated |
| PROGRESS (legacy, `period_start` NULL) | Monday key of `evaluation_date` week | Readable; occupies that week |
| DRAFT / SUBMITTED / ACKNOWLEDGED / VOIDED | Key added, status unchanged | All lifecycle filtering unchanged |

**Legacy display rule for Phase C:** a legacy `PROGRESS` row may not look like a Monday–Sunday week. Render the **stored** `periodStart`/`periodEnd` when present, and additionally label the canonical week from `periodKey` (e.g. "Canonical week of 2026-09-28"). Do not silently rewrite the legacy dates, and do not claim the stored range equals the canonical week.

**Rollout ordering risk (important):** after the schema change, every Prisma `evaluation.create` must supply `periodKey`. Applying the migration without deploying the matching application change would make evaluation creation fail at runtime. This is acceptable only in the separately gated non-production verification; production rollout must be a coordinated schema+application release, explicitly approved later. No DB default is added to mask this.

**Seed/script compatibility (Phase C/B2):** `scripts/setup-demo-data.ts` uses the removed compound-unique input `assignmentId_evaluationType`; it must be updated to `assignmentId_evaluationType_periodKey` with `periodKey: "SINGLE"` for seeded one-off rows. Recorded as a Phase B2/C compile item, not a B1 change.

---

## 8. Indexes and constraints (final proposal)

| Object | Action | Rationale |
|---|---|---|
| `evaluations_assignment_type_key` (unique) | **DROP** | Replaced by per-period identity |
| `evaluations_assignment_type_period_key_key` (unique) | **CREATE** | Canonical identity; also serves assignment+type+week lookups and chronological ordering because the key is the Monday date |
| `evaluations_assignment_idx` | KEEP | Legacy/query support |
| `evaluations_evaluator_idx` | KEEP | Supervisor draft queries |
| `evaluations_type_idx` | KEEP | Report/company `FINAL` filter |
| `evaluations_status_idx` | KEEP | Finalized filters |
| `evaluations_date_idx` | KEEP | Insights/report/calendar date windows |
| `evaluations_assignment_status_idx` | KEEP | Per-assignment finalized filters |
| `evaluations_pkey` | KEEP | PK |
| `evaluations_period_key_matches_type` (CHECK) | **ADD** | `SINGLE` ⇔ non-PROGRESS; PROGRESS must be a real Monday `YYYY-MM-DD` |
| `evaluations_overall_score_non_negative` / `_max_100` / `period_end_after_start` | KEEP | Existing invariants |
| FK constraints | KEEP | No change |

**No additional index is proposed.** The composite unique index covers `(assignment, type, week)` range scans; adding a second index on `(assignment, type, periodStart)` would duplicate almost the same storage for no demonstrated query plan need. This keeps the migration minimal and reversible-in-spirit.

**Why no DB constraint on `periodStart`/`periodEnd`:** legacy PROGRESS rows do not satisfy a strict "Monday…Sunday" CHECK (verified: `2026-10-01 … 2026-10-31`). Adding one would force rewriting historical content, which the approved Plan forbids. The weekly shape is enforced for **new** rows by server-side derivation (Phase C) and tested there; identity uniqueness — the actual duplicate-prevention requirement — is fully enforced in the database.

**Why no partial unique index excluding `VOIDED`:** the approved Plan and Prisma schema express a full composite unique key. A partial index would be SQL-only (this repo does not enable `partialIndexes` preview), would diverge from the Prisma model, and would weaken duplicate prevention without an approved replacement workflow. It is surfaced as OD-3 instead.

---

## 9. Authorization and isolation verification (read-only audit)

| Actor | Create/Update/Finalize | Read | Weekly-specific effect |
|---|---|---|---|
| **Supervisor** | Only on `status: ACTIVE` assignments where `supervisorProfileId` = own profile; evaluator forced to own user; week derived server-side | All rows on own assignments (drafts + finalized) | Repeatability adds rows, not scope. Must keep `assignmentFor()` unchanged and ignore client `periodKey`. |
| **Intern** | None; may acknowledge own `SUBMITTED` row | Own assignment, finalized only | Multiple weekly rows appear chronologically; no draft leakage because the status filter is unchanged |
| **Coordinator** | None | Own school, finalized only | Multiple weekly rows visible; `schoolId` join unchanged |
| **Representative** | None | No Evaluation viewer branch (`redirect`) | No change; company report reads `FINAL` only |
| **Admin** | None | No routine Evaluation viewer branch | No change |
| **Cross-company/school** | — | — | Row scope always flows through `assignment`; no new relation or ID exposed. `evaluationWhere` is the single authorization gate for list/detail. |

**Verification method for B3/Phase C:** assert on source + unit fixtures that (a) no client `periodKey` field exists in the input schema, (b) `assignmentFor` still requires ACTIVE + own supervisor profile, (c) Intern/Coordinator where-clauses still filter finalized, (d) no Representative/Admin viewer branch is reintroduced, (e) detail route uses `evaluationWhere` (not bare `findUnique` by id).

---

## 10. Impact analysis

### 10.1 Evaluations & Feedback

- `src/app/(authenticated)/evaluations/page.tsx` — list `orderBy: { evaluationDate: "desc" }`; needs a deterministic tiebreaker (e.g. `[{ evaluationDate: "desc" }, { periodKey: "desc" }]`) and a visible weekly-period label. Detail page already shows `periodStart`/`periodEnd` when both exist.
- `src/app/(authenticated)/evaluations/review/page.tsx` — drafts list; multiple PROGRESS drafts will appear (one per week). Fine, but label each week and show draft count honestly.
- `src/components/evaluation-form.tsx` — no `periodKey` field. For PROGRESS, period inputs must become server-derived/read-only presentation; for one-off types the optional period fields stay.
- `src/app/evaluations/actions.ts` — `createEvaluation`/`updateEvaluation` must supply server-derived `periodKey`; `updateEvaluation` must recompute the key when type/intern changes; broad `catch` must be replaced by targeted unique-constraint handling with a week-specific message; never overwrite an existing row.
- `src/lib/evaluations/domain.ts` — add the pure week helpers (T140); remove dead `canSeeDraft` or leave behaviorally inert (Phase C cleanup).
- Feedback is unaffected; its routes are separate.

### 10.2 Insights

- `src/lib/insights/data.ts:31` — selects finalized evaluations in the selected date window, `orderBy evaluationDate desc`, and takes `[0]` as "latest". With multiple weekly rows, ties on the same `evaluationDate` are non-deterministic. Phase C must add `periodKey` to the select and a deterministic tiebreaker (periodKey desc, then id).
- The date-window filter stays `evaluationDate`; a late-recorded weekly evaluation may fall outside the selected window. That is existing semantics, not a weekly-specific regression — do not invent a new "week coverage" metric.
- `src/components/insight-detail.tsx` — renders the latest evaluation and a count; wording stays honest ("N finalized Evaluations in this period").

### 10.3 Portfolio

- `src/lib/portfolio/source.ts:33` — finalized-evaluation existence check unchanged.
- `src/lib/portfolio/automatic.ts:53-57` — maps every finalized evaluation to an entry titled only by type. With weekly rows this produces repeated "Progress evaluation" entries; Phase C should include the period label (and keep the deterministic order from the report).
- `src/lib/ai/evidence.ts:68` — `r.evaluations.slice(0, 10)` takes the **first 10 chronologically** (report order ascending). Long internships can now push out the INITIAL/MIDTERM/FINAL evidence. Phase C must select a representative set (keep the one-off evaluations + the most recent weekly rows) rather than a blind `slice(0, 10)`. This is a grounding-quality fix, not a new AI claim.
- AI provenance/redaction/explicit-save rules are unchanged; no new AI behavior is implied by weekly rows.

### 10.4 Reports / PDF

- `src/lib/reports/data.ts:29` — finalized evaluations, `orderBy evaluationDate asc`. Add `id`, `periodStart`, `periodEnd`, `periodKey` to the select and a deterministic tiebreaker.
- `src/components/intern-report.tsx` — record key `${evaluationType}-${evaluationDate.toISOString()}` **collides** when two weekly evaluations share a date. Phase C must key by `evaluation.id` (or include `periodKey`) and show the weekly period. This is the clearest concrete bug introduced by repeatable rows.
- `src/lib/reports/company.ts:20` — `FINAL` existence check. Unaffected: `FINAL` stays `SINGLE` and one-per-assignment.
- PDF export route renders the same report data; no PDF-specific change beyond the above.

### 10.5 AI evidence

- `src/lib/ai/evidence.ts` — as in 10.3 (selection cap) and the evidence title should include the week. No score aggregation, no trend/ranking, no new metrics.
- `src/app/ai/actions.ts:72-85` — evaluation drafting loads one evaluation and its period; a weekly evaluation is a normal single source. No change required, but the period label comes from stored `periodStart`/`periodEnd`.

### 10.6 Other surfaces

- `src/lib/profile/data.ts:32` — `latestEvaluation` takes 1 by `evaluationDate desc`; add a tiebreaker so the displayed "latest" is stable.
- `src/lib/calendar/data.ts` — finalized evaluations on a date; item keys use evaluation `id` in the surrounding builder, and multiple per date is already supported. Verify no "one per day" assumption.
- `src/app/admin/page.tsx:46`, `src/app/(authenticated)/dashboard/page.tsx`, `src/app/(authenticated)/students/page.tsx` — counts of finalized evaluations; multiple weekly rows are legitimately included. No formula change.
- `scripts/setup-demo-data.ts`, `scripts/test-evaluation-foundation.ts`, `scripts/verify-demo-data.ts` — see §7 and §10.1.
- `07_database_design.md` §8.4 currently documents the one-per-type unique constraint and suggests "include the evaluation date" if progress repeats. Phase C should update that document to the approved `periodKey` design after the migration is verified (documentation change, not a requirement change).

---

## 11. Migration-artifact safety (B2/T121 constraint)

**Verified fact:** the Gate A local database has exactly one pending Prisma migration — `20260913090000_restore_branches` — and `public.branches` is absent. Therefore:

- `prisma migrate deploy` against that database **would apply the Branch migration**, which is explicitly out of scope.
- `prisma migrate dev` is forbidden by this spec regardless.

**Required B2 workflow (proposal for approval):**

1. Do **not** connect any Prisma migration command to `.env` / `.env.local` (Production-backed). Only `.env.gatea.local` (loopback) may be used, and only after the environment preflight passes.
2. Prefer the **manually reviewed artifact workflow** allowed by Plan § Phase B: hand-author `migration.sql` exactly as §5, then create the directory only (no execution).
3. Validate the Prisma schema without applying anything: run schema validation/generation with the Gate A environment overlaid so no Production URL is read.
4. If tooling-based SQL generation is attempted, it must use a **disposable shadow database**, never the Gate A fixture database and never Production. If a shadow DB cannot be provisioned safely, stop and keep the manual artifact.
5. Do not use `migrate deploy` on the Gate A database. B3 execution should apply **only** the new migration SQL, inside an explicit transaction, against a target whose schema is known-good, and must not implicitly replay `20260913090000_restore_branches`. Prisma history bookkeeping, if needed for a clean `migrate status`, requires a separately approved approach — never manual `_prisma_migrations` edits.

---

## 12. Non-production verification protocol (T114)

**Preconditions**

1. `npm run gatea:env:preflight` → PASS; target must be loopback and separate from current config.
2. Confirm `DIRECT_URL` host is `127.0.0.1` (`GATEA_TARGET_ENV=test`).
3. Record the §6 preflight A/B/C outputs.
4. Record a Gate A fixture preservation baseline (read-only): counts and content fingerprints for users/assignments/attendance/evaluations/feedback/documents/portfolios/announcements/notifications. The stale status assertion in `verify-gatea-fixtures.ts` must not be the preservation proof (see §0).

**Schema verification (after apply, B3)**

```sql
-- Column exists, is NOT NULL, and has no default
SELECT column_name, is_nullable, column_default, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'evaluations' AND column_name = 'period_key';

-- Old unique gone, new unique present, others intact
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'evaluations' ORDER BY indexname;

-- Check constraints present
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'evaluations'::regclass ORDER BY conname;

-- Backfill correctness
SELECT evaluation_type, period_key, count(*)
FROM evaluations GROUP BY 1,2 ORDER BY 1,2;

-- No non-PROGRESS row with a date key, no PROGRESS row with SINGLE, no non-Monday PROGRESS key
SELECT id FROM evaluations
WHERE (evaluation_type <> 'PROGRESS' AND period_key <> 'SINGLE')
   OR (evaluation_type = 'PROGRESS' AND (
        period_key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        OR extract(isodow FROM period_key::date) <> 1));
```

Expected for the verified fixture set: `PROGRESS → 2026-09-28`, `FINAL → SINGLE`.

**Behavior verification without mutating fixtures.** Run inside one transaction and roll back, using savepoints so a failed duplicate insert does not abort the whole transaction:

```sql
BEGIN;

-- Use a disposable test assignment created in this transaction, or a synthetic
-- assignment id, so Gate A fixtures are never touched.
INSERT INTO evaluations (id, assignment_id, evaluator_id, evaluation_type, period_key,
                         evaluation_date, criteria_scores, status)
VALUES (gen_random_uuid(), '<disposable-assignment-id>', '<disposable-supervisor-id>',
        'PROGRESS', '2026-10-05', DATE '2026-10-05', '[]'::jsonb, 'DRAFT');       -- week 1 OK

SAVEPOINT same_week;
INSERT INTO evaluations (id, assignment_id, evaluator_id, evaluation_type, period_key,
                         evaluation_date, criteria_scores, status)
VALUES (gen_random_uuid(), '<disposable-assignment-id>', '<disposable-supervisor-id>',
        'PROGRESS', '2026-10-05', DATE '2026-10-06', '[]'::jsonb, 'DRAFT');       -- must FAIL (23505)
ROLLBACK TO SAVEPOINT same_week;

INSERT INTO evaluations (id, assignment_id, evaluator_id, evaluation_type, period_key,
                         evaluation_date, criteria_scores, status)
VALUES (gen_random_uuid(), '<disposable-assignment-id>', '<disposable-supervisor-id>',
        'PROGRESS', '2026-10-12', DATE '2026-10-12', '[]'::jsonb, 'DRAFT');       -- week 2 OK

SAVEPOINT invalid_key;
INSERT INTO evaluations (id, assignment_id, evaluator_id, evaluation_type, period_key,
                         evaluation_date, criteria_scores, status)
VALUES (gen_random_uuid(), '<disposable-assignment-id>', '<disposable-supervisor-id>',
        'PROGRESS', '2026-10-06', DATE '2026-10-06', '[]'::jsonb, 'DRAFT');       -- must FAIL (CHECK, non-Monday)
ROLLBACK TO SAVEPOINT invalid_key;

SAVEPOINT bad_single;
INSERT INTO evaluations (id, assignment_id, evaluator_id, evaluation_type, period_key,
                         evaluation_date, criteria_scores, status)
VALUES (gen_random_uuid(), '<disposable-assignment-id>', '<disposable-supervisor-id>',
        'FINAL', '2026-10-12', DATE '2026-10-12', '[]'::jsonb, 'DRAFT');          -- must FAIL (CHECK, not SINGLE)
ROLLBACK TO SAVEPOINT bad_single;

INSERT INTO evaluations (id, assignment_id, evaluator_id, evaluation_type, period_key,
                         evaluation_date, criteria_scores, status)
VALUES (gen_random_uuid(), '<disposable-assignment-id>', '<disposable-supervisor-id>',
        'FINAL', 'SINGLE', DATE '2026-10-12', '[]'::jsonb, 'DRAFT');              -- OK

INSERT INTO evaluations (id, assignment_id, evaluator_id, evaluation_type, period_key,
                         evaluation_date, criteria_scores, status)
VALUES (gen_random_uuid(), '<disposable-assignment-id>', '<disposable-supervisor-id>',
        'MIDTERM', 'SINGLE', DATE '2026-10-12', '[]'::jsonb, 'DRAFT');            -- OK (different type)

SAVEPOINT duplicate_final;
INSERT INTO evaluations (id, assignment_id, evaluator_id, evaluation_type, period_key,
                         evaluation_date, criteria_scores, status)
VALUES (gen_random_uuid(), '<disposable-assignment-id>', '<disposable-supervisor-id>',
        'FINAL', 'SINGLE', DATE '2026-10-13', '[]'::jsonb, 'DRAFT');              -- must FAIL (23505)
ROLLBACK TO SAVEPOINT duplicate_final;

ROLLBACK;   -- zero residue; fixtures untouched
```

**Required verifications**

| # | Check | Pass condition |
|---|---|---|
| 1 | Existing INITIAL/MIDTERM/FINAL rows | All rows still queryable; keys = `SINGLE`; content fingerprint unchanged |
| 2 | Existing PROGRESS row | Key = expected Monday derived from `COALESCE(period_start, evaluation_date)`; content unchanged |
| 3 | Second different-week PROGRESS | Succeeds |
| 4 | Same-week PROGRESS duplicate | Fails with unique violation (`23505`) on the new index; no overwrite |
| 5 | INITIAL/MIDTERM/FINAL uniqueness | One per assignment/type still enforced |
| 6 | Non-Monday PROGRESS key / wrong `SINGLE` usage | Rejected by CHECK |
| 7 | Prisma Client regeneration | Client exposes `periodKey` and `assignmentId_evaluationType_periodKey`; no DB execution |
| 8 | Application compatibility | Evaluation list/detail/review pages compile after Phase C supplies the key; no runtime create path missing `periodKey` |
| 9 | Fixture preservation | Gate A row-level fingerprint identical before/after |
| 10 | No unrelated migrations | `_prisma_migrations` and `public.branches` unchanged; Branch migration still unapplied |

---

## 13. Rollback and recovery

- **Forward-only rule:** the applied migration is never edited. Recovery is another forward migration or environment re-provisioning.
- **Before Phase C writes multiple weekly rows**, a compensating forward migration can restore the previous state: drop the new unique index, drop the CHECK, drop `period_key`, recreate `evaluations_assignment_type_key`. This is safe only while at most one PROGRESS row exists per assignment.
- **After Phase C writes multiple weekly rows for the same assignment**, restoring the old unique index is impossible without deleting/merging evaluations. That requires an explicit human data decision (which rows to keep/void), a backup, and a separately approved data-repair script. Do **not** automate this.
- **Non-production recovery:** treat the local verification database as disposable; re-provision/re-seed is preferred over hand-repair. The Gate A fixtures were produced by a documented setup script and must not be "restored" by ad-hoc edits.
- **Backup expectation before any execution:** table-level snapshot (`pg_dump -t evaluations` or CSV export) stored outside the repo, plus the §6 content fingerprint. Production execution remains separately forbidden.

---

## 14. Test plan

### 14.1 Phase B2 (artifact/static only, no execution)

1. Schema validation with the Gate A environment overlaid; assert no Production URL is read.
2. Static assertions on the schema: `periodKey` required `@db.VarChar(20)`, old unique absent, new composite unique with the exact map name, all other indexes/constraints unchanged.
3. Static assertions on the migration SQL: exactly one `ADD COLUMN`, one backfill `UPDATE`, one duplicate guard, one `SET NOT NULL`, one `DROP INDEX`, one `CREATE UNIQUE INDEX`, one CHECK; no `DROP TABLE`/`DELETE`/`TRUNCATE`/`ALTER TYPE`/`UPDATE` beyond the key.
4. Confirm the migration does not mention Branch/Notification/Task/enum changes.
5. Record the expected TypeScript break list (create/update calls supplying `periodKey`, demo seed compound-unique input) and confirm each is a Phase C item — do not claim full typecheck passes while those are pending.

### 14.2 Phase B3 (verified non-production only)

Run §12 in order. Behavioral inserts are transactional and rolled back. Then:

6. Prisma Client smoke query: `findMany` selecting `periodKey`, `findUnique` by the new compound key, and a duplicate create expecting `P2002` with the new index name.
7. Fixture fingerprint equality.
8. Confirm `public.branches` still absent and the Branch migration still unapplied.

### 14.3 Phase C (application tests, after migration approval)

- Pure helper tests (no DB): Monday/Sunday for Sunday, Monday, month boundary, year boundary, leap day, `Asia/Manila` plus a non-Manila timezone fallback; `periodKey` format and Monday invariant.
- Domain tests: client cannot submit `periodKey`; PROGRESS period is server-derived; one-off types produce `SINGLE`; duplicate-week error message is specific and non-destructive.
- Source/authorization tests: Supervisor-only mutation with ACTIVE own assignment; Intern finalized-only own rows; Coordinator finalized school rows; Representative/Admin denial; detail route uses `evaluationWhere`.
- Reporting/Insights/Portfolio tests: multiple weekly rows render distinct entries; report keys do not collide; chronological order deterministic; FINAL completion formula unchanged; AI evidence selection keeps one-off evaluations and recent weeks.
- Rewrite `scripts/test-evaluation-foundation.ts` and `scripts/setup-demo-data.ts` for the new key; preserve all unrelated assertions.
- Responsive checks for Evaluations list/detail/form at 390/768/1024/1440 (Gate D scope).

---

## 15. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-B1-01 | Design adds exactly one derived identity column and replaces one unique key; no enum change and no new table. |
| AC-B1-02 | `SINGLE` is the only legal key for INITIAL/MIDTERM/FINAL; ISO Monday `YYYY-MM-DD` is the only legal key for PROGRESS, enforced in the database. |
| AC-B1-03 | `(assignmentId, evaluationType, periodKey)` is unique; same assignment/type/week duplicates are impossible. |
| AC-B1-04 | Every existing Evaluation row is preserved byte-for-byte except the new derived key. |
| AC-B1-05 | The migration is atomic, forward-only, and cannot delete or merge records; duplicate detection aborts rather than repairs. |
| AC-B1-06 | `periodKey` is never accepted from the client and is derived from the assignment's branch/company timezone with `Asia/Manila` fallback. |
| AC-B1-07 | No Representative/Admin Evaluation authority is added; Intern/Coordinator finalized scopes and company/school isolation are preserved. |
| AC-B1-08 | All impacted surfaces (list/detail, Insights, Portfolio, Reports/PDF, AI evidence) have a named Phase C change and no invented metric. |
| AC-B1-09 | No migration file was created, no database was modified, and no Gate A fixture was changed in B1. |
| AC-B1-10 | Rollback consequences before vs. after weekly writes are documented, including the human data-decision requirement. |

---

## 16. Risks and open decisions

### Risks

| ID | Risk | Mitigation |
|---|---|---|
| R-1 | Applying the schema before application code supplies `periodKey` breaks evaluation creation | Coordinated non-production release; no DB default to mask it; production release separately approved |
| R-2 | `prisma migrate deploy` on the current target would implicitly apply `20260913090000_restore_branches` | Targeted/manual artifact workflow; no `migrate deploy` on the fixture DB; verification asserts Branch schema/migration unchanged |
| R-3 | Legacy monthly-style PROGRESS row blocks its containing week and disagrees with stored period display | Preserve content; display canonical week label alongside stored period; document rather than rewrite |
| R-4 | Removed compound-unique input breaks `setup-demo-data.ts` and old tests | Explicit Phase B2/C item; expected compile failure recorded, not hidden |
| R-5 | Multiple weekly rows cause report key collisions and duplicate-looking entries | Phase C: key by evaluation id, show period, deterministic ordering |
| R-6 | Blind `slice(0, 10)` drops INITIAL/FINAL evidence from AI input | Phase C selection policy: all one-off evaluations + recent weekly rows |
| R-7 | Migration lock window on a large evaluation table | Small table now; NOT VALID/VALIDATE not-null pattern documented; split/batched execution would need separate approval |
| R-8 | Ops-level duplicate creation race | DB unique index is authoritative; app catches `P2002` and never overwrites |

### Open decisions — human input required before or at Gate B2

**OD-1 — Can a Supervisor record a past week?**
Recommendation: yes, allow selecting a week within `[assignment.startDate, min(today, assignment.endDate)]`, never a future week; the server still normalizes to Monday and derives `periodKey`. Strict "current week only" would make missed weeks unrecoverable. The spec does not forbid either choice; this affects T144 UI and T141 validation.

**OD-2 — Add the type/key consistency CHECK?**
Recommendation: yes. It is additive, does not change any row after backfill, and enforces the Monday invariant even for non-app writers. It is beyond the Plan's minimum, so it needs explicit approval.

**OD-3 — Should a VOIDED weekly evaluation free its week for replacement?**
Current approved design (full unique key) says no. `07_database_design.md` §8.4 says an incorrect submitted evaluation should be set to `VOIDED` and replaced, which would require a partial unique index excluding `VOIDED`. The app has no VOID action today. Recommendation: keep the full unique key for V1 and defer VOIDED-replacement; if approved later, it requires a new migration and a Prisma partial-index strategy.

**OD-4 — Should legacy PROGRESS `periodStart`/`periodEnd` be normalized?**
Recommendation: no. The Plan forbids rewriting content beyond the derived key. Normalizing would misrepresent the historical record. Display the canonical week explicitly instead.

**OD-5 — Update `verify-gatea-fixtures.ts` stale ACTIVE assertion?**
Recommendation: yes, under a separately approved Gate A artifact task, so fixture verification passes against the accepted E6 end state. Not changed in B1.

---

## 17. Traceability and explicit non-actions

| Requirement / task | Coverage |
|---|---|
| `REQ-FR-EVL-2` (recurring weekly/progress evaluations) | §2, §3, §5, §6, §7, §15 |
| `AC-F-04` (repeat across weeks; same-week duplicate prevented) | §3, §5, §6, §12, §14 |
| `DEC-2026-011` (forward-only schema change) | §5, §13 |
| `REQ-FR-EVL-1` / `REQ-FR-EVL-3` / `REQ-FR-EVL-5` (authority and read scope) | §9, §10.1 |
| `REQ-FR-AI-3` / `REQ-FR-AI-6` (grounded evidence, no invented metrics) | §10.3, §10.5 |
| `REQ-FR-REP-3` / `REQ-FR-REP-4` (report formulas unchanged) | §10.4 |
| T110 | §1 |
| T111 | §2, §4 |
| T112 | §5 |
| T113 | §6 |
| T114 | §12, §14 |
| T115 | this document + §16 |

**Explicitly not done:** schema edit, migration creation/execution, database mutation, fixture mutation, Production access, port 3000, deploy/push, Phase B2/C implementation.

**Gate B1:** awaiting explicit human approval to create the Prisma schema edit and migration artifact (T120–T125). Migration execution (T130+) and production remain separately gated.
