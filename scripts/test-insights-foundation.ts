import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { skillEvidenceTimeline } from "../src/lib/insights/domain.ts";

const read=(p:string)=>readFileSync(p,"utf8");
const auth=read("src/lib/insights/authorization.ts");
const data=read("src/lib/insights/data.ts");
const detail=read("src/components/insight-detail.tsx");

test("Insights is Intern-owned",()=>{
  assert(auth.includes("requirePortfolioViewer"));
  for(const role of["COORDINATOR","REPRESENTATIVE","ADMIN"])assert(!auth.includes(role));
});

test("dated skill evidence groups explicit Work Log skills",()=>{
  const timeline=skillEvidenceTimeline([
    {workDate:new Date("2026-08-01T00:00:00Z"),skillsApplied:["TypeScript","Communication"]},
    {workDate:new Date("2026-08-08T00:00:00Z"),skillsApplied:["typescript"]},
  ]);
  const ts=timeline.find(x=>x.skill.toLowerCase()==="typescript")!;
  assert.equal(ts.count,2);
  assert.equal(ts.firstSeen,"2026-08-01");
  assert.equal(ts.lastSeen,"2026-08-08");
});

test("Insights data uses full submitted Work Log skill evidence",()=>{
  assert(data.includes("allSkillLogs"));
  assert(data.includes('status:{in:["SUBMITTED","APPROVED"]}'));
  assert(data.includes("skillEvidenceTimeline(allSkillLogs)"));
});

test("Feedback source remains distinguishable",()=>{
  assert(data.includes("author: { select: { role: true } }"));
  assert(detail.includes("Workmate feedback"));
  assert(detail.includes("Supervisor coaching"));
});

test("visible Insights UI refuses proficiency/ranking claims",()=>{
  assert(detail.includes("evidence frequency, not a proficiency score"));
  assert(detail.includes("does not assign proficiency rankings"));
  assert(!/high performer|poor performer|employment recommendation|disciplinary recommendation/i.test(detail));
});
