ALTER TYPE "task_status" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "task_status" ADD VALUE IF NOT EXISTS 'REVISION_REQUESTED';

ALTER TABLE "tasks"
  ADD COLUMN "submitted_at" TIMESTAMPTZ(6),
  ADD COLUMN "reviewed_by_id" UUID,
  ADD COLUMN "reviewed_at" TIMESTAMPTZ(6),
  ADD COLUMN "review_remarks" TEXT;

CREATE INDEX "tasks_reviewed_by_idx" ON "tasks"("reviewed_by_id");

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
