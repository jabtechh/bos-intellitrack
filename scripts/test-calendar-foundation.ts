import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { eventReaderWhere,canManageCalendar } from "../src/lib/calendar/authorization";
import { itemsForDate,overflowCount,visibleItems,type CalendarItem } from "../src/lib/calendar/domain";
import { safelyFetchHolidayCandidates } from "../src/lib/calendar/holiday-provider";

const read=(p:string)=>readFileSync(p,"utf8");
const schema=read("prisma/schema.prisma");
const dashboard=read("src/app/(authenticated)/dashboard/page.tsx");
const shell=read("src/components/app-shell.tsx");

test("Calendar/Holiday compatibility schema remains",()=>{
  for(const name of["CalendarEvent","Holiday","CalendarEventType","HolidayType","HolidayScope"])assert(schema.includes(name));
});

test("Calendar management is not an Admin business workflow",()=>{
  assert(canManageCalendar({kind:"REPRESENTATIVE",user:{id:"r",role:"REPRESENTATIVE"},companyId:"c"}));
  assert(!canManageCalendar({kind:"INTERN",user:{id:"i",role:"INTERN"},schoolId:"s",companyId:"c"}));
});

test("Calendar reader remains server-scoped for compatibility",()=>{
  const intern=eventReaderWhere({kind:"INTERN",user:{id:"i",role:"INTERN"},schoolId:"s",companyId:"c"});
  const supervisor=eventReaderWhere({kind:"SUPERVISOR",user:{id:"s",role:"SUPERVISOR"},companyId:"c"});
  assert(JSON.stringify(intern).includes("INTERNS"));
  assert(JSON.stringify(supervisor).includes("SUPERVISORS"));
});

test("Intern read-only Calendar is discoverable without restoring Calendar management",()=>{
  assert(shell.includes('href: "/calendar", label: "Internship Calendar"'));
  assert(!shell.includes('href: "/calendar/manage"'));
  for(const token of["DashboardCalendar","getCalendarItems","Upcoming Calendar"])assert(!dashboard.includes(token));
});

test("Calendar domain helpers remain deterministic",()=>{
  const items:CalendarItem[]=[{key:"e",date:"2026-08-21",type:"event",title:"Orientation"}];
  assert.deepEqual(itemsForDate(items,"2026-08-21"),items);
  assert.equal(overflowCount(Array.from({length:5},(_,i)=>({key:String(i),date:"2026-08-21",type:"event",title:"x"})),3),2);
  assert.equal(visibleItems([{key:"t",date:"x",type:"task",title:"Due"}],"deadlines").length,1);
});

test("holiday provider failure is non-fatal",async()=>{
  const result=await safelyFetchHolidayCandidates({fetch:async()=>{throw new Error("offline")}},2026);
  assert.deepEqual(result.items,[]);
  assert.ok(result.error);
});
