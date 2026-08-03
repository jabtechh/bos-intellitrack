import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { correctionInputSchema } from "../src/lib/attendance-corrections/domain.ts";

const id="11111111-1111-4111-8111-111111111111";

test("correction actions ignore internal organization and relationship identifiers",()=>{const parsed=correctionInputSchema.parse({attendanceId:id,reason:"Incorrect time",companyId:id,assignmentId:id,branchId:id,status:"APPROVED"});for(const key of ["companyId","assignmentId","branchId","status"])assert.equal(key in parsed,false)});

test("correction and attendance UI use single-office terminology",()=>{const paths=["src/app/attendance/page.tsx","src/app/attendance/review/page.tsx","src/app/attendance/review/[attendanceId]/page.tsx","src/app/attendance/corrections/page.tsx","src/app/attendance/corrections/new/page.tsx","src/app/attendance/corrections/review/page.tsx","src/app/dashboard/page.tsx"];const source=paths.map(path=>readFileSync(path,"utf8")).join("\n");assert.match(source,/Bo’s Coffee Main Office/);assert.doesNotMatch(source,/Bo’s Coffee Branch|Distance from Branch|Branch Supervisor|No active assignment/)});

test("review authorization verifies Main Office membership and intern-specific supervisor scope",()=>{const source=readFileSync("src/lib/attendance/authorization.ts","utf8");assert.match(source,/BO_COFFEE_OFFICE_CODE/);assert.match(source,/REPRESENTATIVE[\s\S]*companyCode:BO_COFFEE_OFFICE_CODE/);assert.match(source,/SUPERVISOR[\s\S]*supervisorProfileId:context\.profileId/)});

test("administrator navigation contains no multi-organization management entries",()=>{const source=readFileSync("src/app/admin/layout.tsx","utf8");assert.doesNotMatch(source,/>\s*(Companies|Branches|Assignments|Placements)\s*</)});
