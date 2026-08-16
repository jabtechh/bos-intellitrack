import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { assertDemoPlan, createDemoDataPlan, creditedMinutes, demoSeedEnabled, deterministicUuid, DEMO_DATA_IDENTITIES, DEMO_DATA_SEED } from "../src/lib/demo/data.ts";

const source = readFileSync("scripts/setup-demo-data.ts", "utf8");
const gitignore = readFileSync(".gitignore", "utf8");
const first = assertDemoPlan(createDemoDataPlan());
const second = assertDemoPlan(createDemoDataPlan());

test("safety switch prevents mutation", () => { assert.equal(demoSeedEnabled({}), false); assert.equal(demoSeedEnabled({ INTELLITRACK_DEMO_SEED: "0" }), false); assert.equal(demoSeedEnabled({ INTELLITRACK_DEMO_SEED: "1" }), true); assert.ok(source.indexOf("if (!enabled)") < source.indexOf("prisma.company.findMany")); });
test("fixed deterministic seed is used", () => assert.equal(DEMO_DATA_SEED, 20260817));
test("existing four demo users are preserved and reused", () => { const preserved = DEMO_DATA_IDENTITIES.filter((identity) => identity.existing); assert.deepEqual(preserved.map((identity) => `${identity.firstName} ${identity.lastName}`), ["John DemoAcc", "Jose DemoAcc", "Mary DemoAcc", "Maria DemoAcc"]); assert.match(source, /existing \? await tx\.user\.update/); });
test("target counts are deterministic", () => { assert.equal(first.interns.length, 10); assert.equal(first.identities.filter((x) => x.role === "SUPERVISOR").length, 3); assert.equal(first.identities.filter((x) => x.role === "COORDINATOR").length, 2); assert.equal(first.identities.filter((x) => x.role === "REPRESENTATIVE").length, 1); });
test("second plan is identical and deterministic IDs are stable", () => { assert.deepEqual(second, first); assert.equal(deterministicUuid("task-1-1"), deterministicUuid("task-1-1")); assert.notEqual(deterministicUuid("task-1-1"), deterministicUuid("task-1-2")); });
test("database writes use unique upserts or deterministic IDs", () => { assert.match(source, /attendance\.upsert/); assert.match(source, /workLog\.upsert/); assert.match(source, /task\.upsert/); assert.match(source, /evaluation\.upsert/); assert.match(source, /feedback\.upsert/); assert.match(source, /announcement\.upsert/); });
test("attendance dates are scheduled weekdays inside internships", () => { for (const intern of first.interns) for (const row of intern.attendance) { assert.ok(row.date >= intern.startDate && row.date <= intern.endDate); assert.ok(![0, 6].includes(row.date.getUTCDay())); } });
test("clock-out is after clock-in", () => { for (const intern of first.interns) for (const row of intern.attendance) if (row.clockIn && row.clockOut) assert.ok(row.clockOut > row.clockIn); });
test("credited totals are attendance-derived", () => { for (const intern of first.interns) assert.equal(creditedMinutes(intern), intern.attendance.reduce((sum, row) => sum + row.creditedMinutes, 0)); assert.match(source, /attendance\.aggregate/); });
test("Work Logs do not contribute credited hours", () => { assert.doesNotMatch(source, /workLog[\s\S]{0,200}(?:creditedMinutes|renderedHours)/); assert.match(source, /hoursReported: null/); });
test("Work Logs only exist on approved attended days", () => { for (const intern of first.interns) for (const log of intern.workLogs) assert.equal(intern.attendance.find((row) => row.date.getTime() === log.date.getTime())?.status, "APPROVED"); });
test("new Work Logs use only DRAFT and SUBMITTED", () => { for (const intern of first.interns) for (const log of intern.workLogs) assert.ok(["DRAFT", "SUBMITTED"].includes(log.status)); });
test("task dates and statuses are coherent", () => { for (const intern of first.interns) for (const task of intern.tasks) { assert.ok(task.startAt >= intern.startDate); assert.ok(task.dueAt >= task.startAt && task.dueAt <= intern.endDate); assert.ok(["TODO", "IN_PROGRESS", "SUBMITTED", "COMPLETED"].includes(task.status)); if (task.completedAt) assert.ok(task.completedAt >= task.startAt); } });
test("role relationships reference configured demo staff", () => { const keys = new Set(first.identities.map((identity) => identity.key)); for (const intern of first.interns) { assert.ok(keys.has(intern.supervisorKey)); assert.ok(keys.has(intern.coordinatorKey)); } });
test("one active internship per demo Intern is enforced", () => { assert.match(source, /active\.length > 1/); assert.match(source, /status: "ACTIVE"/); assert.equal(new Set(first.interns.map((intern) => intern.identity.key)).size, 10); });
test("no Notification rows are seeded", () => assert.doesNotMatch(source, /(?:tx|prisma)\.notification\.(?:create|upsert|update)/i));
test("no fake private Storage or evidence paths are created", () => { assert.doesNotMatch(source, /tx\.document\.(?:create|upsert)/); assert.match(source, /clockInSelfiePath: null/); assert.match(source, /clockOutSelfiePath: null/); assert.match(source, /completionEvidencePath: null/); assert.match(source, /supportingDocumentPath: null/); });
test("non-demo users and operational data are not modified", () => { assert.doesNotMatch(source, /(?:user|attendance|workLog|task|evaluation|feedback|announcement)\.delete/); assert.match(source, /where: \{ email: identity\.email \}/); });
test("credentials are ignored and never logged", () => { assert.match(gitignore, /\.demo-data-credentials\.local\.json/); assert.doesNotMatch(source, /console\.(?:log|error)\([^)]*(?:password|email|authId|DATABASE_URL|SUPABASE)/i); assert.doesNotMatch(source, /password:\s*["'][^"']+["']/); });
test("sanitized preflight is printed before mutation", () => { for (const label of ["Demo seed target", "Active office matches", "Active schools", "Current deterministic demo users", "Demo seed enabled"]) assert.match(source, new RegExp(label)); assert.ok(source.indexOf("printPreflight({ environmentLabel, officeCount") < source.indexOf("createAdminClient()")); });
test("normal execution is non-destructive and reset is absent", () => { assert.doesNotMatch(source, /INTELLITRACK_DEMO_SEED_RESET/); assert.doesNotMatch(source, /deleteMany|TRUNCATE|DROP/i); });
