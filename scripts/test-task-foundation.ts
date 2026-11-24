import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canInternTransition, canSupervisorTransition, completionNotesSchema, isOverdue, progressSchema, taskInputSchema, taskScopeAllowed, TASK_LABELS } from "../src/lib/tasks/domain";

const actions=readFileSync("src/app/tasks/actions.ts","utf8");
const schema=readFileSync("prisma/schema.prisma","utf8");
const detail=readFileSync("src/app/(authenticated)/tasks/[taskId]/page.tsx","utf8");
const auth=readFileSync("src/lib/tasks/authorization.ts","utf8");

test("legacy TaskStatus values remain in schema",()=>{
  for(const status of["TODO","IN_PROGRESS","BLOCKED","SUBMITTED","REVISION_REQUESTED","COMPLETED","CANCELLED"])assert.match(schema,new RegExp("\\b"+status+"\\b"));
});

test("input and progress validation remain strict",()=>{
  assert(!taskInputSchema.safeParse({internUserId:crypto.randomUUID(),title:"",description:"Work",priority:"MEDIUM"}).success);
  assert(!progressSchema.safeParse(-1).success);
  assert(!progressSchema.safeParse(101).success);
  assert(!completionNotesSchema.safeParse(" ").success);
});

test("Intern V1 lifecycle is Assigned to In progress to Submitted",()=>{
  assert(canInternTransition("TODO","IN_PROGRESS"));
  assert(canInternTransition("IN_PROGRESS","SUBMITTED"));
  assert(!canInternTransition("IN_PROGRESS","BLOCKED"));
  assert(!canInternTransition("BLOCKED","IN_PROGRESS"));
  assert(!canInternTransition("SUBMITTED","COMPLETED"));
});

test("Supervisor only confirms completion or administratively cancels",()=>{
  assert(canSupervisorTransition("SUBMITTED","COMPLETED"));
  assert(canSupervisorTransition("TODO","CANCELLED"));
  assert(canSupervisorTransition("IN_PROGRESS","CANCELLED"));
  assert(!canSupervisorTransition("SUBMITTED","REVISION_REQUESTED"));
});

test("legacy states remain readable and are visibly labeled legacy",()=>{
  assert.equal(TASK_LABELS.BLOCKED,"Blocked (legacy)");
  assert.equal(TASK_LABELS.REVISION_REQUESTED,"Revision requested (legacy)");
  assert.match(detail,/legacy status/);
});

test("only Intern and Supervisor have routine Task scope",()=>{
  assert(taskScopeAllowed("INTERN",{owned:true}));
  assert(taskScopeAllowed("SUPERVISOR",{assigned:true}));
  for(const role of["COORDINATOR","REPRESENTATIVE","ADMIN"] as const)assert(!taskScopeAllowed(role,{owned:true,assigned:true,school:true,company:true}));
  assert.match(auth,/role === "INTERN"/);
  assert.match(auth,/role === "SUPERVISOR"/);
  assert.doesNotMatch(auth,/role === "COORDINATOR"|role === "REPRESENTATIVE"|role === "ADMIN"/);
});

test("actions never create blocked or revision-requested transitions",()=>{
  assert.doesNotMatch(actions,/target=.*BLOCKED|target=.*REVISION_REQUESTED|status:"REVISION_REQUESTED"/);
  assert.match(actions,/status:"COMPLETED"/);
  assert.match(actions,/status:"CANCELLED"/);
});

test("overdue semantics remain safe",()=>{
  assert(isOverdue({dueAt:new Date(0),status:"IN_PROGRESS"}));
  assert(!isOverdue({dueAt:new Date(0),status:"COMPLETED"}));
  assert(!isOverdue({dueAt:new Date(0),status:"CANCELLED"}));
});
