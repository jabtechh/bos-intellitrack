import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUSINESS_ROLE_LABELS, canApproveOperationalReviews, canManageCompanyOperations, isTechnicalAdministrator } from "../src/lib/auth/roles.ts";
import { provisionUserSchema } from "../src/lib/admin/provisioning.ts";

const common={email:"person@example.test",firstName:"Test",lastName:"User"};

test("technical roles map to exact labels",()=>assert.deepEqual(BUSINESS_ROLE_LABELS,{INTERN:"Intern",SUPERVISOR:"Company Supervisor",COORDINATOR:"School Coordinator",REPRESENTATIVE:"Company Representative",ADMIN:"System Administrator"}));
test("Company Representative alone owns routine Company Operations",()=>{assert(canManageCompanyOperations("REPRESENTATIVE"));for(const role of ["ADMIN","INTERN","SUPERVISOR","COORDINATOR"] as const)assert(!canManageCompanyOperations(role))});
test("Company Supervisor alone owns routine operational reviews",()=>{assert(canApproveOperationalReviews("SUPERVISOR"));for(const role of ["REPRESENTATIVE","ADMIN","INTERN","COORDINATOR"] as const)assert(!canApproveOperationalReviews(role))});
test("System Administrator is technical only",()=>{assert(isTechnicalAdministrator("ADMIN"));for(const role of ["INTERN","SUPERVISOR","COORDINATOR","REPRESENTATIVE"] as const)assert(!isTechnicalAdministrator(role))});
test("normal provisioning excludes System Administrator",()=>{assert(!provisionUserSchema.safeParse({...common,role:"ADMIN",accessLevel:"STANDARD"}).success);assert.match(readFileSync("scripts/bootstrap-admin.ts","utf8"),/bootstrap/)});
test("Representative operations guard is server-side and scopes to its own active company",()=>{const guard=readFileSync("src/lib/auth/require-company-operations-manager.ts","utf8");assert.match(guard,/canManageCompanyOperations/);assert.match(guard,/representativeProfile/);assert.match(guard,/company:\s*\{\s*isActive:\s*true\s*\}/);assert.match(guard,/companyId/);assert.doesNotMatch(guard,/BO_COFFEE_OFFICE_CODE|BO_MAIN_OFFICE|role === "ADMIN"/)});
test("Attendance reviewer is Supervisor-only",()=>{const source=readFileSync("src/lib/attendance/authorization.ts","utf8");assert.match(source,/role !== "SUPERVISOR"/);assert.doesNotMatch(source,/REPRESENTATIVE|kind: "ADMIN"/)});
test("Coordinator dashboard remains school-scoped and read-only",()=>{const source=readFileSync("src/app/(authenticated)/dashboard/page.tsx","utf8");assert.match(source,/coordinatorProfile/);assert.match(source,/school/);});
test("required hours support an honest unset onboarding state",()=>{const schema=readFileSync("prisma/schema.prisma","utf8"),migration=readFileSync("prisma/migrations/20260804130000_support_required_hours_onboarding/migration.sql","utf8");assert.match(schema,/requiredHours\s+Int\?\s+@map\("required_hours"\)/);assert.match(migration,/ALTER COLUMN "required_hours" DROP NOT NULL/)});
