import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BO_COFFEE_OFFICE_CODE, getBoCoffeeConfiguration, internalInternshipCode, timeOnReferenceDate } from "../src/lib/organization/bo-coffee.ts";

test("single office identity is stable",()=>assert.equal(BO_COFFEE_OFFICE_CODE,"BO_MAIN_OFFICE"));
test("office defaults are valid",()=>{const value=getBoCoffeeConfiguration();assert.equal(value.timezone,"Asia/Manila");assert.ok(value.geofenceRadiusMeters>=20)});
test("internal internship codes are stable and collision safe",()=>{const a=internalInternshipCode("11111111-1111-4111-8111-111111111111");assert.equal(a,internalInternshipCode("11111111-1111-4111-8111-111111111111"));assert.notEqual(a,internalInternshipCode("22222222-2222-4222-8222-222222222222"))});
test("schedule conversion is deterministic",()=>assert.equal(timeOnReferenceDate("08:30").toISOString(),"1970-01-01T08:30:00.000Z"));
test("legacy multi-office screens redirect",()=>{for(const path of ["src/app/admin/companies/page.tsx","src/app/admin/companies/new/page.tsx","src/app/admin/assignments/page.tsx","src/app/admin/assignments/new/page.tsx"])assert.match(readFileSync(path,"utf8"),/redirect\(/)});
test("intern provisioning has no client-controlled office, code, or status",()=>{const source=readFileSync("src/app/admin/users/new/provision-user-form.tsx","utf8");assert.doesNotMatch(source,/name="(?:companyId|assignmentCode|status)"/)});
