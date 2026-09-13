import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { branchCompatibility } from "../src/lib/branches/compatibility-reader";
import { internshipAssignmentBaseSelect } from "../src/lib/assignments/projection";
import { resolveAttendanceLocation } from "../src/lib/branches/domain";

function store(available: boolean, failure?: Error) {
  const calls: unknown[] = [];
  const reader = { $queryRaw: async () => { if (failure) throw failure; return [{ available }]; }, internshipAssignment: { findUnique: async (args: unknown) => { calls.push(args); return { branch: { name: "Assigned Branch", latitude: 1, longitude: 2, geofenceRadiusMeters: 80, timezone: "Asia/Manila" } }; } } };
  return { calls, compatibility: branchCompatibility(reader as unknown as Parameters<typeof branchCompatibility>[0]) };
}
test("pre-Branch schema never queries the optional relation", async () => {
 const {calls,compatibility}=store(false); assert.equal(await compatibility.available(),false);assert.equal(await compatibility.assignment("owned-assignment"),null);assert.deepEqual(calls,[]);
});
test("post-Branch schema loads only the requested assignment Branch", async()=>{
 const {calls,compatibility}=store(true);assert.equal((await compatibility.assignment("owned-assignment"))?.name,"Assigned Branch");assert.deepEqual(calls,[{where:{id:"owned-assignment"},select:{branch:true}}]);
});
test("catalog failures propagate rather than masquerading as pending migration",async()=>{
 const failure=new Error("connection denied");const {compatibility}=store(false,failure);await assert.rejects(()=>compatibility.assignment("owned-assignment"),failure);
});
test("base projection excludes Branch fields but preserves legacy scheduling and scope",()=>{
 assert.ok(!("branchId" in internshipAssignmentBaseSelect));assert.ok(!("branch" in internshipAssignmentBaseSelect));
 for(const key of ["id","internProfileId","companyId","supervisorProfileId","coordinatorProfileId","requiredHours","scheduleStartTime","scheduleEndTime","gracePeriodMinutes"])assert.equal(internshipAssignmentBaseSelect[key as keyof typeof internshipAssignmentBaseSelect],true);
});
test("pre-migration geofence and post-migration Branch geofence retain existing rules",()=>{
 const company={latitude:14,longitude:121,geofenceRadiusMeters:100,timezone:"Asia/Manila"};
 assert.deepEqual(resolveAttendanceLocation({company,branch:null}),{...company,branchName:null});
 assert.equal(resolveAttendanceLocation({company,branch:{name:"Assigned",latitude:15,longitude:120,geofenceRadiusMeters:70,timezone:"Asia/Manila"}}).geofenceRadiusMeters,70);
 assert.deepEqual(resolveAttendanceLocation({company,branch:{name:"Unset",latitude:null,longitude:null,geofenceRadiusMeters:null,timezone:"Asia/Manila"}}),{...company,branchName:null});
});
test("Attendance reuses the authorized context without a second profile lookup",()=>{
 const page=readFileSync("src/app/(authenticated)/attendance/page.tsx","utf8");assert.match(page,/assignment: internship.*requireInternAssignment/);assert.doesNotMatch(page,/prisma.internProfile|branch: \{/);
 const context=readFileSync("src/lib/required-hours/intern-context.ts","utf8");assert.match(context,/status: "ACTIVE", internProfile: \{ userId: user.id \}/);assert.match(context,/assignment.requiredHours === null/);assert.doesNotMatch(context,/branchId|branch:/);
});

// Catch the original failure at both root queries and nested relation projections.
test("current app assignment reads explicitly select migration-safe fields", () => {
  const failures: string[] = [];
  function files(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
      ? entry.name === "generated" ? [] : files(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : []);
  }
  for (const file of files("src")) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const name = (node?: ts.Node) => node?.getText(source).replace(/["']/g, "");
    const check = (node: ts.Node | undefined) => {
      if (!node || !ts.isObjectLiteralExpression(node) || !node.properties.some(p => name(p.name) === "select"))
        failures.push(`${file}:${node ? source.getLineAndCharacterOfPosition(node.getStart()).line + 1 : 0}`);
    };
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && ts.isPropertyAccessExpression(node.expression.expression)
        && node.expression.expression.name.text === "internshipAssignment"
        && /^(findFirst|findUnique|findMany|findFirstOrThrow|findUniqueOrThrow|create|update|upsert|delete)$/.test(node.expression.name.text)) check(node.arguments[0]);
      if (ts.isPropertyAssignment(node) && ["assignment", "assignments", "assignmentsCreated", "requiredHoursUpdates"].includes(name(node.name) ?? "")) {
        const container = node.parent.parent;
        if (ts.isPropertyAssignment(container) && ["include", "select"].includes(name(container.name) ?? "")) {
          const owner = container.parent.parent;
          if (!(ts.isPropertyAssignment(owner) && name(owner.name) === "_count")) check(node.initializer);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(failures, []);
});
