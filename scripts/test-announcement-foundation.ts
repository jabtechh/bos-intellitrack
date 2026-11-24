import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { AUDIENCE_LABELS,AUDIENCE_OPTIONS,announcementInputSchema,audienceMatchesRole,canManageAnnouncements } from "../src/lib/announcements/domain.ts";

const read=(p:string)=>readFileSync(p,"utf8");
const auth=read("src/lib/announcements/authorization.ts");
const actions=read("src/app/announcements/actions.ts");
const recipients=read("src/lib/announcements/recipients.ts");
const notifications=read("src/lib/notifications/service.ts");

test("V1 authoring audiences are exact and labels are truthful",()=>{
  assert.deepEqual(AUDIENCE_OPTIONS,["ALL_USERS","INTERNS","SUPERVISORS","REPRESENTATIVES","COMPANY"]);
  assert.equal(AUDIENCE_LABELS.COMPANY,"Company interns and staff");
  assert.equal(AUDIENCE_LABELS.ALL_USERS,"All internship participants");
});

test("deferred audiences are rejected for new authoring",()=>{
  for(const audience of["SCHOOL","COORDINATORS","ADMINISTRATORS"])assert(!announcementInputSchema.safeParse({title:"Title",content:"Body",priority:"NORMAL",audience}).success);
});

test("Representative alone manages routine announcements",()=>{
  assert(canManageAnnouncements("REPRESENTATIVE"));
  for(const role of["ADMIN","INTERN","SUPERVISOR","COORDINATOR"] as const)assert(!canManageAnnouncements(role));
  assert(auth.includes('user.role === "REPRESENTATIVE"'));
  assert(!auth.includes('user.role === "ADMIN"'));
});

test("legacy reader semantics remain compatible without enabling authoring",()=>{
  assert(audienceMatchesRole("SCHOOL","INTERN"));
  assert(audienceMatchesRole("SCHOOL","COORDINATOR"));
  assert(!audienceMatchesRole("COMPANY","COORDINATOR"));
  assert(audienceMatchesRole("COMPANY","INTERN",true));
});

test("recipient resolver excludes Admin and inactive users",()=>{
  assert(recipients.includes("isActive:true"));
  for(const role of['role:"INTERN"','role:"SUPERVISOR"','role:"REPRESENTATIVE"','role:"COORDINATOR"'])assert(recipients.includes(role));
  assert(!recipients.includes('role:"ADMIN"'));
});

test("publication and notification persistence are one transaction",()=>{
  assert(actions.includes("prisma.$transaction"));
  assert(actions.includes("resolveAnnouncementRecipientIds(tx"));
  assert(actions.includes("createNotificationsInTransaction"));
  assert(actions.includes('status: "PUBLISHED"'));
});

test("announcement notifications use stable per-recipient dedupe key",()=>{
  assert(actions.includes("dedupeKey:"));
  assert(actions.includes("announcement:"));
  assert(actions.includes(":published"));
  assert(notifications.includes("createMany({ data, skipDuplicates: true })"));
});

test("missing notification infrastructure fails closed",()=>{
  assert(actions.includes("NotificationUnavailableError"));
  assert(actions.includes("Publishing is unavailable because in-app notifications are not initialized"));
  assert(actions.includes("throwNotificationUnavailable"));
});

test("zero recipients do not fabricate delivery claims",()=>{
  assert(actions.includes("if (recipientIds.length)"));
  assert(!/delivered to \d+|sent to all/i.test(actions));
});
