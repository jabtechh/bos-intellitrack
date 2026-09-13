import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dashboardAttendanceState, weeklyAttendance, relevantTasks, workLogAction, dashboardGreeting, workplaceLabel, type InternAttendanceRecord, type InternTask, type InternLog } from "../src/lib/dashboard/intern-presentation";
import { creditedMinutesFromAttendance, internshipProgress } from "../src/lib/internship-progress/domain";

const today = new Date("2026-09-16T00:00:00Z"), now = new Date("2026-09-16T05:00:00Z");
const row: InternAttendanceRecord = { id: "attendance-1", attendanceDate: today, status: "APPROVED", classification: "ON_TIME", clockIn: new Date("2026-09-16T00:00:00Z"), clockOut: new Date("2026-09-16T08:00:00Z"), creditedMinutes: 480, workedMinutes: 480, clockInInsideGeofence: true, clockOutInsideGeofence: true, hasTimeInSelfie: true, hasTimeOutSelfie: true, corrections: [] };
for (const [label,record,expected] of [
  ["not started", undefined, "not-started"],
  ["timed in", {...row,status:"CLOCKED_IN",clockOut:null},"clocked-in"],
  ["completed", row, "completed"],
  ["exception", {...row,status:"PENDING_REVIEW"},"needs-review"],
  ["incomplete takes precedence over an open timestamp", {...row,status:"INCOMPLETE",clockOut:null},"incomplete"],
  ["rejected is not completed", {...row,status:"REJECTED"},"needs-review"],
  ["missing Time In is not completed", {...row,clockIn:null},"incomplete"],
  ["historical unclosed record is incomplete", {...row,status:"CLOCKED_IN",clockOut:null,attendanceDate:new Date("2026-09-15T00:00:00Z")},"incomplete"],
  ["pending correction uses existing attention classification", {...row,corrections:[{id:"request-1"}]},"needs-review"],
] satisfies [string, InternAttendanceRecord | undefined, string][]) test(`Attendance: ${label}`,()=>assert.equal(dashboardAttendanceState(record,today),expected));

test("weekly Attendance uses exact dates across month boundaries and never fabricates records",()=>{
  const monday=new Date("2026-08-31T00:00:00Z"), week=weeklyAttendance([{...row,attendanceDate:monday}],new Date("2026-09-02T00:00:00Z"));
  assert.equal(week.length,7);assert.equal(week[0].date.toISOString().slice(0,10),"2026-08-31");assert.equal(week[6].date.toISOString().slice(0,10),"2026-09-06");assert.equal(week[0].state,"completed");assert.equal(week[2].isToday,true);assert.equal(week[2].record,undefined);assert.equal(week[2].state,"not-started");
});
const task=(id:string,status:InternTask["status"],dueAt:Date|null=null):InternTask=>({id,title:id,status,dueAt,updatedAt:now});
test("Tasks prioritize overdue and revision, then due soon, active, and completed",()=>{
  const items=[task("complete","COMPLETED"),task("active","IN_PROGRESS"),task("soon","TODO",new Date("2026-09-18")),task("revision","REVISION_REQUESTED"),task("overdue","IN_PROGRESS",new Date("2026-09-14")),task("cancelled","CANCELLED")];
  assert.deepEqual(relevantTasks(items,now).map(x=>x.id),["overdue","revision","soon","active","complete"]);assert.equal(items[0].id,"complete");
});
test("Tasks safely handle empty input and recently completed ordering",()=>{
  assert.deepEqual(relevantTasks([],now),[]);assert.deepEqual(relevantTasks([{...task("old","COMPLETED"),updatedAt:new Date("2026-09-01")},task("recent","COMPLETED")],now).map(x=>x.id),["recent","old"]);
});
const log:InternLog={id:"log-1",workDate:today,status:"DRAFT",description:"Work recorded",skillsApplied:[],learnings:null};
test("Work Log: no log opens the existing creation route",()=>assert.deepEqual(workLogAction(null),{label:"Write Today's Work Log",href:"/work-logs/new",status:"No log"}));
test("Work Log: draft continues the existing editor",()=>assert.deepEqual(workLogAction(log),{label:"Continue Work Log",href:"/work-logs/log-1/edit",status:"Draft"}));
test("Work Log: submitted and legacy completed logs stay read-only and say Submitted",()=>{for(const status of ["SUBMITTED","APPROVED"]){assert.equal(workLogAction({...log,status}).status,"Submitted");assert.equal(workLogAction({...log,status}).href,"/work-logs/log-1");}});
for(const [minutes,percent,remaining] of [[0,0,240],[7200,50,120],[14400,100,0],[18000,125,0]])test(`Progress: ${percent}% remains bounded visually`,()=>{const p=internshipProgress(240,minutes);assert.equal(p.percentage,percent);assert.equal(p.visualPercentage,Math.min(100,percent));assert.equal(p.remainingHours,remaining);});
test("progress credits only eligible Attendance, never Work Logs or exception minutes",()=>assert.equal(creditedMinutesFromAttendance([row,{...row,status:"PENDING_REVIEW",creditedMinutes:100},{...row,status:"INCOMPLETE",creditedMinutes:120}]),480));
test("greeting follows assignment timezone",()=>{assert.equal(dashboardGreeting(new Date("2026-09-16T01:00:00Z"),"Asia/Manila"),"Good morning");assert.equal(dashboardGreeting(now,"Asia/Manila"),"Good afternoon");assert.equal(dashboardGreeting(new Date("2026-09-16T12:00:00Z"),"Asia/Manila"),"Good evening");});
test("Branch presence and absence use only supplied workplace data",()=>{assert.equal(workplaceLabel("Assigned location","Company","Office"),"Assigned location");assert.equal(workplaceLabel(null,"Company","Office"),"Company · Office");assert.equal(workplaceLabel(null,"Company",null),"Company");});

test("Intern loader preserves ownership, exact-date Work Log reads, and private evidence boundaries",()=>{
  const loader=readFileSync("src/components/intern-dashboard-data.tsx","utf8");
  assert.match(loader,/status: "ACTIVE", internProfile: \{ userId: user.id \}/);assert.match(loader,/assignmentId_workDate: \{ assignmentId: assignment.id, workDate: today \}/);assert.match(loader,/signedEvidenceUrl\(current.clockInSelfiePath\)/);assert.match(loader,/hasTimeInSelfie: Boolean\(clockInSelfiePath\)/);assert.doesNotMatch(loader,/\.update\(|\.create\(|\$executeRaw|getPublicUrl/);
});
test("dashboard actions are self-service and onboarding disappears when complete",()=>{
 const view=readFileSync("src/components/intern-dashboard.tsx","utf8");assert.match(view,/onboarding && !onboarding.done/);assert.match(view,/supervisor \|\| "Not assigned"/);assert.doesNotMatch(view,/href="\/admin|\/tasks\/review|\/attendance\/review|\/profile\/\$|Face Match|sign.off|Clocked In|Approved Work Logs|competenc/i);
});
