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
