-- DEC-2026-021 — Certificate of Completion (forward-only, additive).
-- One certificate per COMPLETED internship assignment, issued in the same transaction as the
-- COMPLETED transition and the Portfolio snapshot. No existing table or row is changed.
-- Apply only after 20261124120000_add_attendance_identity_verification on the same target.
-- CreateEnum
CREATE TYPE "certificate_status" AS ENUM ('ISSUED', 'REVOKED');

-- CreateTable
CREATE TABLE "internship_certificates" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "certificate_number" VARCHAR(40) NOT NULL,
    "status" "certificate_status" NOT NULL DEFAULT 'ISSUED',
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "issued_by_id" UUID,
    "signatory_name" VARCHAR(255) NOT NULL,
    "signatory_position" VARCHAR(150) NOT NULL,
    "intern_name" VARCHAR(255) NOT NULL,
    "position_title" VARCHAR(150),
    "company_name" VARCHAR(255) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL,
    "credited_minutes" INTEGER NOT NULL,
    "required_hours" INTEGER,
    "revoked_at" TIMESTAMPTZ(6),
    "revoked_by_id" UUID,
    "revoke_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internship_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "internship_certificates_assignment_key" ON "internship_certificates"("assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "internship_certificates_number_key" ON "internship_certificates"("certificate_number");

-- CreateIndex
CREATE INDEX "internship_certificates_status_idx" ON "internship_certificates"("status");

-- CreateIndex
CREATE INDEX "internship_certificates_issued_by_idx" ON "internship_certificates"("issued_by_id");

-- AddForeignKey
ALTER TABLE "internship_certificates" ADD CONSTRAINT "internship_certificates_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "internship_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_certificates" ADD CONSTRAINT "internship_certificates_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_certificates" ADD CONSTRAINT "internship_certificates_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A revoked certificate must record when and why; an issued one must not carry revocation data.
ALTER TABLE "internship_certificates" ADD CONSTRAINT "internship_certificates_revocation_check"
  CHECK (("status" = 'ISSUED' AND "revoked_at" IS NULL AND "revoke_reason" IS NULL)
      OR ("status" = 'REVOKED' AND "revoked_at" IS NOT NULL AND length(btrim(coalesce("revoke_reason", ''))) > 0));

ALTER TABLE "internship_certificates" ADD CONSTRAINT "internship_certificates_values_check"
  CHECK ("credited_minutes" >= 0 AND ("required_hours" IS NULL OR "required_hours" > 0) AND "end_date" >= "start_date");

-- Server-side access only (the Supabase Data API cannot read certificates).
ALTER TABLE "internship_certificates" ENABLE ROW LEVEL SECURITY;
