-- Support honest required-hours onboarding while preserving existing assignments.
ALTER TABLE "internship_assignments"
  ALTER COLUMN "required_hours" DROP NOT NULL,
  ADD COLUMN "required_hours_confirmed_at" TIMESTAMPTZ(6),
  ADD COLUMN "required_hours_updated_by_id" UUID,
  ADD COLUMN "required_hours_update_reason" TEXT;

ALTER TABLE "internship_assignments"
  DROP CONSTRAINT "internship_assignments_required_hours_positive",
  ADD CONSTRAINT "internship_assignments_required_hours_positive"
    CHECK ("required_hours" IS NULL OR "required_hours" > 0);

CREATE INDEX "internship_assignments_required_hours_updater_idx"
  ON "internship_assignments"("required_hours_updated_by_id");

ALTER TABLE "internship_assignments"
  ADD CONSTRAINT "internship_assignments_required_hours_updated_by_id_fkey"
  FOREIGN KEY ("required_hours_updated_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
