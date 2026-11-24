import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { criteriaFromJson,evaluationInputSchema,EVALUATION_LABELS,isFinalized,parseCriteria } from "../src/lib/evaluations/domain.ts";
import { workmateEligible } from "../src/lib/feedback/domain.ts";

const read=(p:string)=>readFileSync(p,"utf8");
const actions=read("src/app/evaluations/actions.ts");
const auth=read("src/lib/evaluations/authorization.ts");
const schema=read("prisma/schema.prisma");
const feedbackActions=read("src/app/feedback/actions.ts");
const valid={internUserId:crypto.randomUUID(),evaluationType:"MIDTERM",evaluationDate:"2026-08-04",periodStart:"2026-07-01",periodEnd:"2026-07-31",overallScore:85,strengths:"Reliable",areasForImprovement:"Planning",comments:"Constructive remarks"};

test("weekly Evaluation identity replaces one-per-type uniqueness",()=>{
  assert(schema.includes("enum EvaluationStatus"));
  assert(schema.includes("DRAFT"));
  assert(schema.includes("SUBMITTED"));
  assert(schema.includes("@@unique([assignmentId, evaluationType, periodKey]"));
  assert(!schema.includes("@@unique([assignmentId, evaluationType],"));
});

test("evaluation validation remains strict",()=>{
  assert(evaluationInputSchema.safeParse(valid).success);
  assert(!evaluationInputSchema.safeParse({...valid,overallScore:101}).success);
  assert(!evaluationInputSchema.safeParse({...valid,periodStart:"2026-08-02",periodEnd:"2026-08-01"}).success);
  assert.deepEqual(criteriaFromJson([{criterion:"Quality",rating:6}]),[]);
  assert(!parseCriteria(new FormData()).success);
});

test("finalized states and friendly labels remain",()=>{
  assert(isFinalized("SUBMITTED"));
  assert(isFinalized("ACKNOWLEDGED"));
  assert(!isFinalized("DRAFT"));
  assert.equal(EVALUATION_LABELS.SUBMITTED,"Finalized");
});

test("Supervisor alone mutates direct-Intern Evaluations",()=>{
  assert(actions.includes("requireSupervisorEvaluationContext"));
  assert(actions.includes("supervisorProfileId"));
  assert(actions.includes("evaluatorId: c.user.id"));
  for(const role of["COORDINATOR","REPRESENTATIVE","ADMIN"])assert(!actions.includes(role));
});

test("read scopes are Intern finalized, Supervisor direct, Coordinator finalized school",()=>{
  assert(auth.includes('c.kind === "INTERN"'));
  assert(auth.includes('status: { in: ["SUBMITTED", "ACKNOWLEDGED"] }'));
  assert(auth.includes('c.kind === "SUPERVISOR"'));
  assert(auth.includes("supervisorProfileId: c.profileId"));
  assert(auth.includes("schoolId: c.schoolId"));
});

test("Representative and Admin have no routine Evaluation viewer branch",()=>{
  for(const token of['role === "REPRESENTATIVE"','role === "ADMIN"','kind: "ADMIN"','kind: "REPRESENTATIVE"'])assert(!auth.includes(token));
});

test("workmate eligibility requires distinct active overlapping Interns with same Supervisor",()=>{
  const base={status:"ACTIVE",supervisorProfileId:"sup",startDate:new Date("2026-08-01T00:00:00Z"),endDate:new Date("2026-09-30T00:00:00Z")};
  assert(workmateEligible({userId:"a",...base},{userId:"b",...base}));
  assert(!workmateEligible({userId:"a",...base},{userId:"a",...base}));
  assert(!workmateEligible({userId:"a",...base},{userId:"b",...base,supervisorProfileId:"other"}));
  assert(!workmateEligible({userId:"a",...base},{userId:"b",...base,startDate:new Date("2026-10-01T00:00:00Z"),endDate:new Date("2026-10-30T00:00:00Z")}));
  assert(!workmateEligible({userId:"a",...base},{userId:"b",...base,status:"COMPLETED"}));
});

test("workmate submission resolves relationship server-side and has no Branch dependency",()=>{
  assert(feedbackActions.includes("supervisorProfileId: actorAssignment.supervisorProfileId"));
  assert(feedbackActions.includes("startDate: { lte: actorAssignment.endDate }"));
  assert(feedbackActions.includes("endDate: { gte: actorAssignment.startDate }"));
  assert(!/branchId|branch:/i.test(feedbackActions));
  assert(feedbackActions.includes('visibility: "INTERN_AND_STAFF"'));
});
