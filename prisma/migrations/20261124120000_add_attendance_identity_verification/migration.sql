-- DEC-2026-019 / REQ-FR-ATT-5: attendance identity verification against a
-- Company Supervisor-approved onboarding reference selfie.
--
-- Forward-only and additive. No existing row is rewritten:
--   * attendance gains two NULLABLE columns; NULL means the record predates
--     identity verification and keeps its existing status/credited minutes.
--   * four new tables and six new enums.
-- Biometric images are NOT stored in the database; only private Storage keys.
-- Row level security is enabled with no policies so the Supabase Data API
-- (anon/authenticated) cannot read these tables; the server-side Prisma
-- connection is unaffected.
--
-- Apply only to a verified isolated environment, and only after any earlier
-- pending migration (e.g. 20261104120000_support_weekly_evaluations) has been
-- applied and verified on that target.

-- CreateEnum
CREATE TYPE "identity_reference_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "identity_reference_action" AS ENUM ('ENROLLED', 'REPLACEMENT_REQUESTED', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "identity_capture_purpose" AS ENUM ('ENROLLMENT', 'CLOCK_IN', 'CLOCK_OUT');

-- CreateEnum
CREATE TYPE "identity_verification_outcome" AS ENUM ('VERIFIED', 'FACE_MISMATCH', 'LIVENESS_FAILED', 'INCONCLUSIVE', 'PROVIDER_UNAVAILABLE', 'NO_APPROVED_REFERENCE', 'SESSION_REJECTED');

-- CreateEnum
CREATE TYPE "liveness_check_result" AS ENUM ('PASSED', 'FAILED', 'INCONCLUSIVE', 'NOT_CONFIGURED', 'ERROR');

-- CreateEnum
CREATE TYPE "face_match_check_result" AS ENUM ('MATCH', 'NO_MATCH', 'INCONCLUSIVE', 'ERROR', 'NOT_RUN');

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "clock_in_identity_verified" BOOLEAN,
ADD COLUMN     "clock_out_identity_verified" BOOLEAN;

-- CreateTable
CREATE TABLE "identity_references" (
    "id" UUID NOT NULL,
    "intern_profile_id" UUID NOT NULL,
    "status" "identity_reference_status" NOT NULL DEFAULT 'PENDING',
    "storage_path" TEXT NOT NULL,
    "consent_version" VARCHAR(40) NOT NULL,
    "consented_at" TIMESTAMPTZ(6) NOT NULL,
    "replaces_id" UUID,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "decision_remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_reference_events" (
    "id" UUID NOT NULL,
    "reference_id" UUID NOT NULL,
    "intern_profile_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" "identity_reference_action" NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_reference_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_capture_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "identity_capture_purpose" NOT NULL,
    "secret_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_capture_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_verification_attempts" (
    "id" UUID NOT NULL,
    "intern_profile_id" UUID NOT NULL,
    "session_id" UUID,
    "reference_id" UUID,
    "attendance_id" UUID,
    "purpose" "identity_capture_purpose" NOT NULL,
    "outcome" "identity_verification_outcome" NOT NULL,
    "liveness" "liveness_check_result" NOT NULL,
    "face_match" "face_match_check_result" NOT NULL,
    "similarity" DECIMAL(6,5),
    "threshold" DECIMAL(6,5),
    "provider" VARCHAR(40) NOT NULL,
    "provider_reference" VARCHAR(200),
    "failure_reason" VARCHAR(200),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_verification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "identity_references_intern_status_idx" ON "identity_references"("intern_profile_id", "status");

-- CreateIndex
CREATE INDEX "identity_references_status_idx" ON "identity_references"("status");

-- CreateIndex
CREATE INDEX "identity_reference_events_reference_idx" ON "identity_reference_events"("reference_id", "created_at");

-- CreateIndex
CREATE INDEX "identity_reference_events_intern_idx" ON "identity_reference_events"("intern_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "identity_capture_sessions_user_idx" ON "identity_capture_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "identity_capture_sessions_expires_idx" ON "identity_capture_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "identity_attempts_intern_idx" ON "identity_verification_attempts"("intern_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "identity_attempts_attendance_idx" ON "identity_verification_attempts"("attendance_id");

-- CreateIndex
CREATE INDEX "identity_attempts_outcome_idx" ON "identity_verification_attempts"("outcome");

-- AddForeignKey
ALTER TABLE "identity_references" ADD CONSTRAINT "identity_references_intern_profile_id_fkey" FOREIGN KEY ("intern_profile_id") REFERENCES "intern_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_references" ADD CONSTRAINT "identity_references_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_references" ADD CONSTRAINT "identity_references_replaces_id_fkey" FOREIGN KEY ("replaces_id") REFERENCES "identity_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_reference_events" ADD CONSTRAINT "identity_reference_events_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "identity_references"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_reference_events" ADD CONSTRAINT "identity_reference_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_capture_sessions" ADD CONSTRAINT "identity_capture_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verification_attempts" ADD CONSTRAINT "identity_verification_attempts_intern_profile_id_fkey" FOREIGN KEY ("intern_profile_id") REFERENCES "intern_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verification_attempts" ADD CONSTRAINT "identity_verification_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "identity_capture_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verification_attempts" ADD CONSTRAINT "identity_verification_attempts_reference_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "identity_references"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verification_attempts" ADD CONSTRAINT "identity_verification_attempts_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- One APPROVED and at most one PENDING reference per intern (partial unique).
CREATE UNIQUE INDEX "identity_references_one_approved_per_intern" ON "identity_references"("intern_profile_id") WHERE "status" = 'APPROVED';
CREATE UNIQUE INDEX "identity_references_one_pending_per_intern" ON "identity_references"("intern_profile_id") WHERE "status" = 'PENDING';

-- A decided reference must record who decided it and when.
ALTER TABLE "identity_references" ADD CONSTRAINT "identity_references_decision_check"
  CHECK ("status" = 'PENDING' OR ("decided_at" IS NOT NULL));

-- Capture sessions expire shortly after issue (defence in depth for the app TTL).
ALTER TABLE "identity_capture_sessions" ADD CONSTRAINT "identity_capture_sessions_ttl_check"
  CHECK ("expires_at" > "created_at" AND "expires_at" <= "created_at" + interval '15 minutes');

ALTER TABLE "identity_references" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity_reference_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity_capture_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity_verification_attempts" ENABLE ROW LEVEL SECURITY;
