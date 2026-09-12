-- Forward-only development artifact. Do not apply until the target environment is verified.
CREATE TABLE "branches" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "address" TEXT NOT NULL,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "geofence_radius_meters" INTEGER,
  "timezone" VARCHAR(100) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "branches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "branches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "branches_coordinates_check" CHECK (("latitude" IS NULL AND "longitude" IS NULL AND "geofence_radius_meters" IS NULL) OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL AND "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)),
  CONSTRAINT "branches_radius_check" CHECK ("geofence_radius_meters" IS NULL OR "geofence_radius_meters" BETWEEN 20 AND 5000),
  CONSTRAINT "branches_name_check" CHECK (length(trim("name")) > 0),
  CONSTRAINT "branches_address_check" CHECK (length(trim("address")) > 0)
);
CREATE UNIQUE INDEX "branches_company_name_key" ON "branches"("company_id", "name");
CREATE UNIQUE INDEX "branches_company_name_normalized_key" ON "branches"("company_id", lower(trim("name")));
CREATE INDEX "branches_company_active_idx" ON "branches"("company_id", "is_active");
ALTER TABLE "internship_assignments" ADD COLUMN "branch_id" UUID;
CREATE INDEX "internship_assignments_branch_idx" ON "internship_assignments"("branch_id");
ALTER TABLE "internship_assignments" ADD CONSTRAINT "internship_assignments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY;
-- Enforce company ownership even for administrative scripts outside the application.
CREATE UNIQUE INDEX "branches_id_company_key" ON "branches"("id", "company_id");
ALTER TABLE "internship_assignments" ADD CONSTRAINT "internship_assignments_branch_company_fkey" FOREIGN KEY ("branch_id", "company_id") REFERENCES "branches"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;
