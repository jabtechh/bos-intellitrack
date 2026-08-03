-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('INTERN', 'SUPERVISOR', 'COORDINATOR', 'REPRESENTATIVE', 'ADMIN');

-- CreateEnum
CREATE TYPE "admin_access_level" AS ENUM ('STANDARD', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "internship_status" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "attendance_status" AS ENUM ('CLOCKED_IN', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'INCOMPLETE', 'ABSENT', 'VOIDED');

-- CreateEnum
CREATE TYPE "attendance_classification" AS ENUM ('UNDETERMINED', 'ON_TIME', 'LATE', 'EARLY_DEPARTURE', 'LATE_AND_EARLY_DEPARTURE');

-- CreateEnum
CREATE TYPE "correction_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "work_log_status" AS ENUM ('DRAFT', 'SUBMITTED', 'REVISION_REQUIRED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "task_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "evaluation_type" AS ENUM ('INITIAL', 'MIDTERM', 'PROGRESS', 'FINAL');

-- CreateEnum
CREATE TYPE "evaluation_status" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'VOIDED');

-- CreateEnum
CREATE TYPE "feedback_type" AS ENUM ('GENERAL', 'PRAISE', 'IMPROVEMENT', 'TASK_RELATED', 'ATTENDANCE_RELATED', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "feedback_visibility" AS ENUM ('INTERN_AND_STAFF', 'STAFF_ONLY', 'INTERN_ONLY');

-- CreateEnum
CREATE TYPE "document_category" AS ENUM ('INTERNSHIP_REQUIREMENT', 'ENDORSEMENT_LETTER', 'INTERNSHIP_AGREEMENT', 'IDENTIFICATION', 'MEDICAL_DOCUMENT', 'DAILY_REPORT', 'WEEKLY_REPORT', 'FINAL_REPORT', 'CERTIFICATE', 'WORK_SAMPLE', 'SUPPORTING_DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'REPLACED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "announcement_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "announcement_audience" AS ENUM ('ALL_USERS', 'INTERNS', 'SUPERVISORS', 'COORDINATORS', 'REPRESENTATIVES', 'ADMINISTRATORS', 'SCHOOL', 'COMPANY');

-- CreateEnum
CREATE TYPE "announcement_status" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "portfolio_status" AS ENUM ('DRAFT', 'GENERATED', 'UNDER_REVIEW', 'FINALIZED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100) NOT NULL,
    "suffix" VARCHAR(20),
    "phone_number" VARCHAR(30),
    "profile_photo_path" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intern_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_number" VARCHAR(100) NOT NULL,
    "course" VARCHAR(150) NOT NULL,
    "year_level" VARCHAR(50),
    "section" VARCHAR(50),
    "date_of_birth" DATE,
    "address" TEXT,
    "emergency_contact_name" VARCHAR(200),
    "emergency_contact_number" VARCHAR(30),
    "emergency_contact_relationship" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intern_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisor_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_number" VARCHAR(100),
    "position" VARCHAR(150) NOT NULL,
    "department" VARCHAR(150),
    "office_location" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervisor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coordinator_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "employee_number" VARCHAR(100),
    "position" VARCHAR(150) NOT NULL,
    "department" VARCHAR(150),
    "office" VARCHAR(150),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coordinator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "representative_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employee_number" VARCHAR(100),
    "position" VARCHAR(150) NOT NULL,
    "department" VARCHAR(150),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "representative_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "access_level" "admin_access_level" NOT NULL DEFAULT 'STANDARD',
    "designation" VARCHAR(150),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL,
    "school_code" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "address_line" TEXT,
    "city" VARCHAR(100),
    "province" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "contact_email" VARCHAR(255),
    "contact_number" VARCHAR(30),
    "website_url" TEXT,
    "logo_path" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "company_code" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "branch_name" VARCHAR(255),
    "address_line" TEXT NOT NULL,
    "city" VARCHAR(100),
    "province" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "contact_email" VARCHAR(255),
    "contact_number" VARCHAR(30),
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "geofence_radius_meters" INTEGER NOT NULL DEFAULT 100,
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Manila',
    "logo_path" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internship_assignments" (
    "id" UUID NOT NULL,
    "intern_profile_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "supervisor_profile_id" UUID NOT NULL,
    "coordinator_profile_id" UUID NOT NULL,
    "assignment_code" VARCHAR(100) NOT NULL,
    "position_title" VARCHAR(150),
    "department" VARCHAR(150),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "required_hours" INTEGER NOT NULL,
    "rendered_hours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "schedule_start_time" TIME(0),
    "schedule_end_time" TIME(0),
    "grace_period_minutes" INTEGER NOT NULL DEFAULT 0,
    "status" "internship_status" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "activated_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internship_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "attendance_date" DATE NOT NULL,
    "clock_in" TIMESTAMPTZ(6),
    "clock_out" TIMESTAMPTZ(6),
    "clock_in_latitude" DECIMAL(10,7),
    "clock_in_longitude" DECIMAL(10,7),
    "clock_in_accuracy_meters" DECIMAL(10,2),
    "clock_in_distance_meters" DECIMAL(10,2),
    "clock_in_inside_geofence" BOOLEAN,
    "clock_in_selfie_path" TEXT,
    "clock_out_latitude" DECIMAL(10,7),
    "clock_out_longitude" DECIMAL(10,7),
    "clock_out_accuracy_meters" DECIMAL(10,2),
    "clock_out_distance_meters" DECIMAL(10,2),
    "clock_out_inside_geofence" BOOLEAN,
    "clock_out_selfie_path" TEXT,
    "worked_minutes" INTEGER NOT NULL DEFAULT 0,
    "credited_minutes" INTEGER NOT NULL DEFAULT 0,
    "classification" "attendance_classification" NOT NULL DEFAULT 'UNDETERMINED',
    "status" "attendance_status" NOT NULL DEFAULT 'CLOCKED_IN',
    "review_required" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_remarks" TEXT,
    "intern_remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_corrections" (
    "id" UUID NOT NULL,
    "attendance_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "original_clock_in" TIMESTAMPTZ(6),
    "original_clock_out" TIMESTAMPTZ(6),
    "requested_clock_in" TIMESTAMPTZ(6),
    "requested_clock_out" TIMESTAMPTZ(6),
    "original_credited_minutes" INTEGER NOT NULL DEFAULT 0,
    "requested_credited_minutes" INTEGER,
    "reason" TEXT NOT NULL,
    "supporting_document_path" TEXT,
    "status" "correction_status" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_remarks" TEXT,
    "applied_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_logs" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "skills_applied" JSONB,
    "challenges" TEXT,
    "learnings" TEXT,
    "hours_reported" DECIMAL(5,2),
    "attachment_path" TEXT,
    "status" "work_log_status" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ(6),
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_remarks" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "assigned_by_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" "task_priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "task_status" NOT NULL DEFAULT 'TODO',
    "start_at" TIMESTAMPTZ(6),
    "due_at" TIMESTAMPTZ(6),
    "progress_percentage" INTEGER NOT NULL DEFAULT 0,
    "completion_notes" TEXT,
    "completion_evidence_path" TEXT,
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "evaluator_id" UUID NOT NULL,
    "evaluation_type" "evaluation_type" NOT NULL,
    "evaluation_date" DATE NOT NULL,
    "period_start" DATE,
    "period_end" DATE,
    "criteria_scores" JSONB NOT NULL DEFAULT '[]',
    "overall_score" DECIMAL(5,2),
    "strengths" TEXT,
    "areas_for_improvement" TEXT,
    "comments" TEXT,
    "ai_summary" TEXT,
    "status" "evaluation_status" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ(6),
    "acknowledged_by_id" UUID,
    "acknowledged_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "feedback_type" "feedback_type" NOT NULL DEFAULT 'GENERAL',
    "title" VARCHAR(255),
    "content" TEXT NOT NULL,
    "visibility" "feedback_visibility" NOT NULL DEFAULT 'INTERN_AND_STAFF',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "related_task_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "storage_bucket" VARCHAR(100) NOT NULL DEFAULT 'internship-documents',
    "storage_path" TEXT NOT NULL,
    "mime_type" VARCHAR(150) NOT NULL,
    "file_extension" VARCHAR(20),
    "file_size_bytes" BIGINT NOT NULL,
    "checksum" VARCHAR(128),
    "category" "document_category" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "status" "document_status" NOT NULL DEFAULT 'PENDING_REVIEW',
    "is_portfolio_eligible" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "review_remarks" TEXT,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "priority" "announcement_priority" NOT NULL DEFAULT 'NORMAL',
    "audience" "announcement_audience" NOT NULL DEFAULT 'ALL_USERS',
    "school_id" UUID,
    "company_id" UUID,
    "status" "announcement_status" NOT NULL DEFAULT 'DRAFT',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_for" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "professional_summary" TEXT,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "achievements" JSONB NOT NULL DEFAULT '[]',
    "selected_work" JSONB NOT NULL DEFAULT '[]',
    "evaluation_summary" TEXT,
    "reflection" TEXT,
    "source_snapshot" JSONB,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_provider" VARCHAR(100),
    "ai_model" VARCHAR(150),
    "ai_generated_at" TIMESTAMPTZ(6),
    "last_generated_by_id" UUID,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "status" "portfolio_status" NOT NULL DEFAULT 'DRAFT',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "exported_pdf_path" TEXT,
    "exported_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_id_key" ON "users"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_active_role_idx" ON "users"("is_active", "role");

-- CreateIndex
CREATE INDEX "users_last_name_idx" ON "users"("last_name");

-- CreateIndex
CREATE UNIQUE INDEX "intern_profiles_user_id_key" ON "intern_profiles"("user_id");

-- CreateIndex
CREATE INDEX "intern_profiles_school_id_idx" ON "intern_profiles"("school_id");

-- CreateIndex
CREATE INDEX "intern_profiles_course_idx" ON "intern_profiles"("course");

-- CreateIndex
CREATE UNIQUE INDEX "intern_profiles_school_student_key" ON "intern_profiles"("school_id", "student_number");

-- CreateIndex
CREATE UNIQUE INDEX "supervisor_profiles_user_id_key" ON "supervisor_profiles"("user_id");

-- CreateIndex
CREATE INDEX "supervisor_profiles_company_id_idx" ON "supervisor_profiles"("company_id");

-- CreateIndex
CREATE INDEX "supervisor_profiles_company_department_idx" ON "supervisor_profiles"("company_id", "department");

-- CreateIndex
CREATE UNIQUE INDEX "supervisor_profiles_company_employee_key" ON "supervisor_profiles"("company_id", "employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "coordinator_profiles_user_id_key" ON "coordinator_profiles"("user_id");

-- CreateIndex
CREATE INDEX "coordinator_profiles_school_id_idx" ON "coordinator_profiles"("school_id");

-- CreateIndex
CREATE INDEX "coordinator_profiles_school_department_idx" ON "coordinator_profiles"("school_id", "department");

-- CreateIndex
CREATE UNIQUE INDEX "coordinator_profiles_school_employee_key" ON "coordinator_profiles"("school_id", "employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "representative_profiles_user_id_key" ON "representative_profiles"("user_id");

-- CreateIndex
CREATE INDEX "representative_profiles_company_id_idx" ON "representative_profiles"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "representative_profiles_company_employee_key" ON "representative_profiles"("company_id", "employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "admin_profiles_user_id_key" ON "admin_profiles"("user_id");

-- CreateIndex
CREATE INDEX "admin_profiles_access_level_idx" ON "admin_profiles"("access_level");

-- CreateIndex
CREATE UNIQUE INDEX "schools_school_code_key" ON "schools"("school_code");

-- CreateIndex
CREATE INDEX "schools_name_idx" ON "schools"("name");

-- CreateIndex
CREATE INDEX "schools_is_active_idx" ON "schools"("is_active");

-- CreateIndex
CREATE INDEX "schools_city_idx" ON "schools"("city");

-- CreateIndex
CREATE UNIQUE INDEX "companies_company_code_key" ON "companies"("company_code");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE INDEX "companies_active_idx" ON "companies"("is_active");

-- CreateIndex
CREATE INDEX "companies_city_idx" ON "companies"("city");

-- CreateIndex
CREATE INDEX "companies_name_branch_idx" ON "companies"("name", "branch_name");

-- CreateIndex
CREATE UNIQUE INDEX "internship_assignments_code_key" ON "internship_assignments"("assignment_code");

-- CreateIndex
CREATE INDEX "internship_assignments_intern_idx" ON "internship_assignments"("intern_profile_id");

-- CreateIndex
CREATE INDEX "internship_assignments_company_idx" ON "internship_assignments"("company_id");

-- CreateIndex
CREATE INDEX "internship_assignments_supervisor_idx" ON "internship_assignments"("supervisor_profile_id");

-- CreateIndex
CREATE INDEX "internship_assignments_coordinator_idx" ON "internship_assignments"("coordinator_profile_id");

-- CreateIndex
CREATE INDEX "internship_assignments_status_idx" ON "internship_assignments"("status");

-- CreateIndex
CREATE INDEX "internship_assignments_dates_idx" ON "internship_assignments"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "internship_assignments_company_status_idx" ON "internship_assignments"("company_id", "status");

-- CreateIndex
CREATE INDEX "internship_assignments_supervisor_status_idx" ON "internship_assignments"("supervisor_profile_id", "status");

-- CreateIndex
CREATE INDEX "attendance_assignment_idx" ON "attendance"("assignment_id");

-- CreateIndex
CREATE INDEX "attendance_date_idx" ON "attendance"("attendance_date");

-- CreateIndex
CREATE INDEX "attendance_status_idx" ON "attendance"("status");

-- CreateIndex
CREATE INDEX "attendance_review_required_idx" ON "attendance"("review_required");

-- CreateIndex
CREATE INDEX "attendance_assignment_status_idx" ON "attendance"("assignment_id", "status");

-- CreateIndex
CREATE INDEX "attendance_date_status_idx" ON "attendance"("attendance_date", "status");

-- CreateIndex
CREATE INDEX "attendance_reviewed_by_idx" ON "attendance"("reviewed_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_assignment_date_key" ON "attendance"("assignment_id", "attendance_date");

-- CreateIndex
CREATE INDEX "attendance_corrections_attendance_idx" ON "attendance_corrections"("attendance_id");

-- CreateIndex
CREATE INDEX "attendance_corrections_status_idx" ON "attendance_corrections"("status");

-- CreateIndex
CREATE INDEX "attendance_corrections_requested_by_idx" ON "attendance_corrections"("requested_by_id");

-- CreateIndex
CREATE INDEX "attendance_corrections_reviewed_by_idx" ON "attendance_corrections"("reviewed_by_id");

-- CreateIndex
CREATE INDEX "attendance_corrections_created_at_idx" ON "attendance_corrections"("created_at");

-- CreateIndex
CREATE INDEX "attendance_corrections_status_created_idx" ON "attendance_corrections"("status", "created_at");

-- CreateIndex
CREATE INDEX "work_logs_assignment_idx" ON "work_logs"("assignment_id");

-- CreateIndex
CREATE INDEX "work_logs_work_date_idx" ON "work_logs"("work_date");

-- CreateIndex
CREATE INDEX "work_logs_status_idx" ON "work_logs"("status");

-- CreateIndex
CREATE INDEX "work_logs_assignment_status_idx" ON "work_logs"("assignment_id", "status");

-- CreateIndex
CREATE INDEX "work_logs_reviewed_by_idx" ON "work_logs"("reviewed_by_id");

-- CreateIndex
CREATE INDEX "work_logs_status_submitted_idx" ON "work_logs"("status", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "work_logs_assignment_date_key" ON "work_logs"("assignment_id", "work_date");

-- CreateIndex
CREATE INDEX "tasks_assignment_idx" ON "tasks"("assignment_id");

-- CreateIndex
CREATE INDEX "tasks_assigned_by_idx" ON "tasks"("assigned_by_id");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_due_at_idx" ON "tasks"("due_at");

-- CreateIndex
CREATE INDEX "tasks_priority_idx" ON "tasks"("priority");

-- CreateIndex
CREATE INDEX "tasks_assignment_status_idx" ON "tasks"("assignment_id", "status");

-- CreateIndex
CREATE INDEX "tasks_assignment_due_idx" ON "tasks"("assignment_id", "due_at");

-- CreateIndex
CREATE INDEX "tasks_status_due_idx" ON "tasks"("status", "due_at");

-- CreateIndex
CREATE INDEX "evaluations_assignment_idx" ON "evaluations"("assignment_id");

-- CreateIndex
CREATE INDEX "evaluations_evaluator_idx" ON "evaluations"("evaluator_id");

-- CreateIndex
CREATE INDEX "evaluations_type_idx" ON "evaluations"("evaluation_type");

-- CreateIndex
CREATE INDEX "evaluations_status_idx" ON "evaluations"("status");

-- CreateIndex
CREATE INDEX "evaluations_date_idx" ON "evaluations"("evaluation_date");

-- CreateIndex
CREATE INDEX "evaluations_assignment_status_idx" ON "evaluations"("assignment_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_assignment_type_key" ON "evaluations"("assignment_id", "evaluation_type");

-- CreateIndex
CREATE INDEX "feedback_assignment_idx" ON "feedback"("assignment_id");

-- CreateIndex
CREATE INDEX "feedback_author_idx" ON "feedback"("author_id");

-- CreateIndex
CREATE INDEX "feedback_recipient_idx" ON "feedback"("recipient_id");

-- CreateIndex
CREATE INDEX "feedback_recipient_read_idx" ON "feedback"("recipient_id", "is_read");

-- CreateIndex
CREATE INDEX "feedback_assignment_created_idx" ON "feedback"("assignment_id", "created_at");

-- CreateIndex
CREATE INDEX "feedback_related_task_idx" ON "feedback"("related_task_id");

-- CreateIndex
CREATE INDEX "feedback_visibility_idx" ON "feedback"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storage_path_key" ON "documents"("storage_path");

-- CreateIndex
CREATE INDEX "documents_assignment_idx" ON "documents"("assignment_id");

-- CreateIndex
CREATE INDEX "documents_uploaded_by_idx" ON "documents"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "documents_category_idx" ON "documents"("category");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_assignment_category_idx" ON "documents"("assignment_id", "category");

-- CreateIndex
CREATE INDEX "documents_assignment_status_idx" ON "documents"("assignment_id", "status");

-- CreateIndex
CREATE INDEX "documents_status_created_idx" ON "documents"("status", "created_at");

-- CreateIndex
CREATE INDEX "documents_portfolio_eligible_idx" ON "documents"("assignment_id", "is_portfolio_eligible");

-- CreateIndex
CREATE INDEX "announcements_created_by_idx" ON "announcements"("created_by_id");

-- CreateIndex
CREATE INDEX "announcements_status_idx" ON "announcements"("status");

-- CreateIndex
CREATE INDEX "announcements_audience_idx" ON "announcements"("audience");

-- CreateIndex
CREATE INDEX "announcements_school_idx" ON "announcements"("school_id");

-- CreateIndex
CREATE INDEX "announcements_company_idx" ON "announcements"("company_id");

-- CreateIndex
CREATE INDEX "announcements_scheduled_for_idx" ON "announcements"("scheduled_for");

-- CreateIndex
CREATE INDEX "announcements_expires_at_idx" ON "announcements"("expires_at");

-- CreateIndex
CREATE INDEX "announcements_feed_idx" ON "announcements"("status", "published_at");

-- CreateIndex
CREATE INDEX "announcements_audience_status_idx" ON "announcements"("audience", "status");

-- CreateIndex
CREATE INDEX "announcements_pinned_idx" ON "announcements"("is_pinned", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_assignment_key" ON "portfolios"("assignment_id");

-- CreateIndex
CREATE INDEX "portfolios_status_idx" ON "portfolios"("status");

-- CreateIndex
CREATE INDEX "portfolios_generated_by_idx" ON "portfolios"("last_generated_by_id");

-- CreateIndex
CREATE INDEX "portfolios_approved_by_idx" ON "portfolios"("approved_by_id");

-- CreateIndex
CREATE INDEX "portfolios_updated_at_idx" ON "portfolios"("updated_at");

-- AddForeignKey
ALTER TABLE "intern_profiles" ADD CONSTRAINT "intern_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intern_profiles" ADD CONSTRAINT "intern_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_profiles" ADD CONSTRAINT "supervisor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisor_profiles" ADD CONSTRAINT "supervisor_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coordinator_profiles" ADD CONSTRAINT "coordinator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coordinator_profiles" ADD CONSTRAINT "coordinator_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "representative_profiles" ADD CONSTRAINT "representative_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "representative_profiles" ADD CONSTRAINT "representative_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_assignments" ADD CONSTRAINT "internship_assignments_intern_profile_id_fkey" FOREIGN KEY ("intern_profile_id") REFERENCES "intern_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_assignments" ADD CONSTRAINT "internship_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_assignments" ADD CONSTRAINT "internship_assignments_supervisor_profile_id_fkey" FOREIGN KEY ("supervisor_profile_id") REFERENCES "supervisor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_assignments" ADD CONSTRAINT "internship_assignments_coordinator_profile_id_fkey" FOREIGN KEY ("coordinator_profile_id") REFERENCES "coordinator_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internship_assignments" ADD CONSTRAINT "internship_assignments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "internship_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "internship_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "internship_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "internship_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_acknowledged_by_id_fkey" FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "internship_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_related_task_id_fkey" FOREIGN KEY ("related_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "internship_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "internship_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_last_generated_by_id_fkey" FOREIGN KEY ("last_generated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- PostgreSQL-only constraints from project_docs/07_database_design.md
-- These cannot be represented directly in the Prisma schema and are
-- added here as a reviewed SQL migration.
-- ============================================================

-- ------------------------------------------------------------
-- Partial indexes (design doc §13.5)
-- ------------------------------------------------------------

-- One ACTIVE internship assignment per intern (§6.4)
CREATE UNIQUE INDEX "internship_assignments_one_active_per_intern"
  ON "internship_assignments" ("intern_profile_id")
  WHERE "status" = 'ACTIVE';

-- One PENDING attendance correction per attendance record (§7.4)
CREATE UNIQUE INDEX "attendance_corrections_one_pending"
  ON "attendance_corrections" ("attendance_id")
  WHERE "status" = 'PENDING';

-- Pending attendance review queue (§7.3)
CREATE INDEX "attendance_pending_review_idx"
  ON "attendance" ("attendance_date")
  WHERE "status" = 'PENDING_REVIEW';

-- Open tasks by due date (§8.3)
CREATE INDEX "tasks_open_due_idx"
  ON "tasks" ("due_at")
  WHERE "status" IN ('TODO', 'IN_PROGRESS', 'BLOCKED');

-- Scheduled announcements (§9.3)
CREATE INDEX "announcements_scheduled_idx"
  ON "announcements" ("scheduled_for")
  WHERE "status" = 'SCHEDULED';

-- ------------------------------------------------------------
-- CHECK constraints
-- ------------------------------------------------------------

-- users (§5.2)
ALTER TABLE "users" ADD CONSTRAINT "users_first_name_not_empty"
  CHECK (length(trim("first_name")) > 0);
ALTER TABLE "users" ADD CONSTRAINT "users_last_name_not_empty"
  CHECK (length(trim("last_name")) > 0);
ALTER TABLE "users" ADD CONSTRAINT "users_email_not_empty"
  CHECK (length(trim("email")) > 0);

-- companies (§6.3)
ALTER TABLE "companies" ADD CONSTRAINT "companies_latitude_range"
  CHECK ("latitude" >= -90 AND "latitude" <= 90);
ALTER TABLE "companies" ADD CONSTRAINT "companies_longitude_range"
  CHECK ("longitude" >= -180 AND "longitude" <= 180);
ALTER TABLE "companies" ADD CONSTRAINT "companies_geofence_radius_range"
  CHECK ("geofence_radius_meters" BETWEEN 20 AND 5000);

-- internship_assignments (§6.4)
ALTER TABLE "internship_assignments" ADD CONSTRAINT "internship_assignments_end_after_start"
  CHECK ("end_date" >= "start_date");
ALTER TABLE "internship_assignments" ADD CONSTRAINT "internship_assignments_required_hours_positive"
  CHECK ("required_hours" > 0);
ALTER TABLE "internship_assignments" ADD CONSTRAINT "internship_assignments_rendered_hours_non_negative"
  CHECK ("rendered_hours" >= 0);
ALTER TABLE "internship_assignments" ADD CONSTRAINT "internship_assignments_grace_period_non_negative"
  CHECK ("grace_period_minutes" >= 0);

-- attendance (§7.3)
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_clock_in_latitude_range"
  CHECK ("clock_in_latitude" IS NULL OR "clock_in_latitude" BETWEEN -90 AND 90);
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_clock_in_longitude_range"
  CHECK ("clock_in_longitude" IS NULL OR "clock_in_longitude" BETWEEN -180 AND 180);
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_clock_out_latitude_range"
  CHECK ("clock_out_latitude" IS NULL OR "clock_out_latitude" BETWEEN -90 AND 90);
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_clock_out_longitude_range"
  CHECK ("clock_out_longitude" IS NULL OR "clock_out_longitude" BETWEEN -180 AND 180);
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_clock_in_accuracy_non_negative"
  CHECK ("clock_in_accuracy_meters" IS NULL OR "clock_in_accuracy_meters" >= 0);
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_clock_out_accuracy_non_negative"
  CHECK ("clock_out_accuracy_meters" IS NULL OR "clock_out_accuracy_meters" >= 0);
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_clock_in_distance_non_negative"
  CHECK ("clock_in_distance_meters" IS NULL OR "clock_in_distance_meters" >= 0);
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_clock_out_distance_non_negative"
  CHECK ("clock_out_distance_meters" IS NULL OR "clock_out_distance_meters" >= 0);
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_clock_out_after_clock_in"
  CHECK ("clock_out" IS NULL OR "clock_in" IS NULL OR "clock_out" >= "clock_in");
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_worked_minutes_non_negative"
  CHECK ("worked_minutes" >= 0);
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_credited_minutes_non_negative"
  CHECK ("credited_minutes" >= 0);
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_credited_leq_worked"
  CHECK ("credited_minutes" <= "worked_minutes");

-- attendance_corrections (§7.4)
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_reason_not_empty"
  CHECK (length(trim("reason")) > 0);
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_original_credited_non_negative"
  CHECK ("original_credited_minutes" >= 0);
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_requested_credited_non_negative"
  CHECK ("requested_credited_minutes" IS NULL OR "requested_credited_minutes" >= 0);
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_requested_clock_out_after_in"
  CHECK ("requested_clock_out" IS NULL OR "requested_clock_in" IS NULL OR "requested_clock_out" >= "requested_clock_in");

-- work_logs (§8.2)
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_title_not_empty"
  CHECK (length(trim("title")) > 0);
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_description_not_empty"
  CHECK (length(trim("description")) > 0);
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_hours_reported_non_negative"
  CHECK ("hours_reported" IS NULL OR "hours_reported" >= 0);
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_hours_reported_max_24"
  CHECK ("hours_reported" IS NULL OR "hours_reported" <= 24);

-- tasks (§8.3)
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_title_not_empty"
  CHECK (length(trim("title")) > 0);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_progress_percentage_range"
  CHECK ("progress_percentage" >= 0 AND "progress_percentage" <= 100);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_due_after_start"
  CHECK ("due_at" IS NULL OR "start_at" IS NULL OR "due_at" >= "start_at");

-- evaluations (§8.4)
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_overall_score_non_negative"
  CHECK ("overall_score" IS NULL OR "overall_score" >= 0);
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_overall_score_max_100"
  CHECK ("overall_score" IS NULL OR "overall_score" <= 100);
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_period_end_after_start"
  CHECK ("period_end" IS NULL OR "period_start" IS NULL OR "period_end" >= "period_start");

-- feedback (§8.5)
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_content_not_empty"
  CHECK (length(trim("content")) > 0);
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_read_at_implies_is_read"
  CHECK ("read_at" IS NULL OR "is_read" = TRUE);

-- documents (§9.2)
ALTER TABLE "documents" ADD CONSTRAINT "documents_file_name_not_empty"
  CHECK (length(trim("file_name")) > 0);
ALTER TABLE "documents" ADD CONSTRAINT "documents_original_file_name_not_empty"
  CHECK (length(trim("original_file_name")) > 0);
ALTER TABLE "documents" ADD CONSTRAINT "documents_storage_path_not_empty"
  CHECK (length(trim("storage_path")) > 0);
ALTER TABLE "documents" ADD CONSTRAINT "documents_file_size_positive"
  CHECK ("file_size_bytes" > 0);
ALTER TABLE "documents" ADD CONSTRAINT "documents_version_number_positive"
  CHECK ("version_number" > 0);

-- announcements (§9.3)
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_title_not_empty"
  CHECK (length(trim("title")) > 0);
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_content_not_empty"
  CHECK (length(trim("content")) > 0);
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_expires_after_scheduled"
  CHECK ("expires_at" IS NULL OR "scheduled_for" IS NULL OR "expires_at" > "scheduled_for");
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_expires_after_published"
  CHECK ("expires_at" IS NULL OR "published_at" IS NULL OR "expires_at" > "published_at");

-- portfolios (§9.4)
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_title_not_empty"
  CHECK (length(trim("title")) > 0);
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_version_number_positive"
  CHECK ("version_number" > 0);

-- ------------------------------------------------------------
-- Case-insensitive email uniqueness (§5.2)
-- ------------------------------------------------------------
-- The design doc's recommended Version 1 approach is application-level
-- lowercase normalization. This index provides a database-level fallback.
-- NOTE: This is redundant with users_email_key if the application normalizes
-- emails to lowercase before storage.
CREATE UNIQUE INDEX "users_email_lower_key" ON "users" (LOWER("email"));
