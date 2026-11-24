import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { creditedHours, progressValues } from "../src/lib/required-hours/domain.ts";
import { canTransition } from "../src/lib/assignments/validation.ts";

const read=(path:string)=>readFileSync(path,"utf8");
const list=read("src/app/admin/assignments/page.tsx");
const detail=read("src/app/admin/assignments/[assignmentId]/page.tsx");
const actions=read("src/app/admin/assignments/actions.ts");
const intern=read("src/app/admin/users/[userId]/page.tsx");
const navigation=read("src/components/app-shell.tsx");
const provisioning=read("src/app/admin/users/actions.ts");

test("Representative-only assignment list uses server-side company scope",()=>{
  assert.match(list,/requireCompanyOperationsManager/);
  assert.match(list,/where: \{ companyId: actor\.companyId \}/);
  assert.match(list,/href(?:=\{|: )\x60\/admin\/assignments\/\$\{row\.id\}\x60/); // row link in the shared data table
  assert.doesNotMatch(list,/redirect\("\/admin\/users/);
});

test("assignment detail denies cross-company lookup",()=>{
  assert.match(detail,/requireCompanyOperationsManager/);
  assert.match(detail,/where: \{ id: assignmentId, companyId: actor\.companyId \}/);
  assert.match(detail,/if \(!row\) notFound\(\)/);
  for(const name of ["activateAssignment","cancelAssignment","completeAssignment","terminateAssignment"])assert(detail.includes(name));
  assert.match(detail,/canTransition\(row\.status, status\)/);
});

test("existing lifecycle server actions independently enforce company boundary",()=>{
  assert.match(actions,/const actor = await requireCompanyOperationsManager\(\)/);
  assert.match(actions,/findFirst\(\{ select: internshipAssignmentBaseSelect, where: \{ id: assignmentId\.data, companyId: actor\.companyId \}/);
  assert.match(actions,/where: \{ id: assignment\.id, companyId: actor\.companyId, status: assignment\.status \}/);
  assert.match(actions,/updated\.count !== 1/);
  assert.equal(canTransition("ACTIVE","COMPLETED"),true);
  assert.equal(canTransition("COMPLETED","ACTIVE"),false);
});

test("Intern detail links to authorized assignment details without restoring duplicate sidebar",()=>{
  assert.match(intern,/href=\{\x60\/admin\/assignments\/\$\{detail\.id\}\x60\}/);
  const rep=navigation.split("export const representativeNav: ShellNavItem[] = [")[1].split("\n];")[0];
  assert(!rep.includes('href: "/admin/assignments"'));
  assert.match(provisioning,/internshipAssignment\.create/);
});

test("credited hours are calculated solely from APPROVED Attendance minutes",()=>{
  assert.match(intern,/prisma\.attendance\.aggregate/);
  assert.match(intern,/assignmentId:detail\.id,status:"APPROVED"/);
  assert.match(intern,/_sum:\{creditedMinutes:true\}/);
  assert.match(intern,/creditedHours\(credits\?\._sum\.creditedMinutes\?\?0\)/);
  assert.match(intern,/progressValues\(detail\.requiredHours,hours\)/);
  assert.doesNotMatch(intern,/Number\(detail\.renderedHours\)|String\(detail\.renderedHours\)/);
  assert.equal(creditedHours(150),2.5);
  assert.deepEqual(progressValues(100,creditedHours(150)),{required:100,credited:2.5,remaining:97.5,percentage:3});
});
