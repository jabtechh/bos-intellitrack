import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AUDIENCE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  announcementInputSchema,
  audienceMatchesRole,
  canManageAnnouncements,
  isExpired,
  isLive,
  safeAnnouncementError,
} from "../src/lib/announcements/domain";

const auth = readFileSync("src/lib/announcements/authorization.ts", "utf8");
const actions = readFileSync("src/app/announcements/actions.ts", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");
const shell = readFileSync("src/components/app-shell.tsx", "utf8");
const mobileNavigation = readFileSync("src/components/mobile-intern-navigation.tsx", "utf8");
const listPage = readFileSync("src/app/(authenticated)/announcements/page.tsx", "utf8");
const detailPage = readFileSync("src/app/(authenticated)/announcements/[announcementId]/page.tsx", "utf8");
const managePage = readFileSync("src/app/(authenticated)/announcements/manage/page.tsx", "utf8");
const newPage = readFileSync("src/app/(authenticated)/announcements/new/page.tsx", "utf8");
const editPage = readFileSync("src/app/(authenticated)/announcements/[announcementId]/edit/page.tsx", "utf8");
const dashboard = readFileSync("src/app/(authenticated)/dashboard/page.tsx", "utf8");
const summary = readFileSync("src/components/announcement-dashboard-summary.tsx", "utf8");

test("schema contains announcement model", () => assert.match(schema, /model Announcement/));
test("schema supports title", () => assert.match(schema, /title\s+String\s+@db\.VarChar\(255\)/));
test("schema supports content", () => assert.match(schema, /content\s+String\s+@db\.Text/));
test("schema supports audience", () => assert.match(schema, /audience\s+AnnouncementAudience/));
test("schema supports priority", () => assert.match(schema, /priority\s+AnnouncementPriority/));
test("schema supports published state", () => assert.match(schema, /publishedAt\s+DateTime/));
test("schema supports expiration", () => assert.match(schema, /expiresAt\s+DateTime/));
test("schema supports creator", () => assert.match(schema, /createdById\s+String/));
test("schema supports archived state", () => assert.match(schema, /archivedAt\s+DateTime/));
test("schema supports scheduled state", () => assert.match(schema, /scheduledFor\s+DateTime/));
test("schema does not support attachments", () => assert.doesNotMatch(schema, /attachmentPath.*Announcement/));
test("schema does not support read tracking", () => assert.doesNotMatch(schema, /isRead.*Announcement|readAt.*Announcement/));
test("schema does not support acknowledgment", () => assert.doesNotMatch(schema, /acknowledged.*Announcement/));

test("representative may manage", () => assert(canManageAnnouncements("REPRESENTATIVE")));
test("administrator may manage", () => assert(canManageAnnouncements("ADMIN")));
test("intern cannot manage", () => assert(!canManageAnnouncements("INTERN")));
test("supervisor cannot manage", () => assert(!canManageAnnouncements("SUPERVISOR")));
test("coordinator cannot manage", () => assert(!canManageAnnouncements("COORDINATOR")));

test("auth restricts management to representative and admin", () => {
  assert.match(auth, /c\.kind === "ADMIN" \|\| c\.kind === "REPRESENTATIVE"/);
});
test("auth reader where excludes drafts", () => assert.match(auth, /status: "PUBLISHED"/));
test("auth reader where excludes expired", () => assert.match(auth, /expiresAt: \{ gt: now \}/));
test("auth manage where scopes representative", () => assert.match(auth, /companyId: c\.companyId/));
test("auth manage where admin sees all", () => assert.match(auth, /if \(c\.kind === "ADMIN"\) return \{\}/));

test("intern sees intern audience", () => assert(audienceMatchesRole("INTERNS", "INTERN")));
test("intern sees all users", () => assert(audienceMatchesRole("ALL_USERS", "INTERN")));
test("intern sees school audience", () => assert(audienceMatchesRole("SCHOOL", "INTERN")));
test("intern sees company audience", () => assert(audienceMatchesRole("COMPANY", "INTERN", true)));
test("intern cannot see supervisors", () => assert(!audienceMatchesRole("SUPERVISORS", "INTERN")));
test("supervisor sees supervisors", () => assert(audienceMatchesRole("SUPERVISORS", "SUPERVISOR")));
test("supervisor sees company", () => assert(audienceMatchesRole("COMPANY", "SUPERVISOR")));
test("coordinator sees coordinators", () => assert(audienceMatchesRole("COORDINATORS", "COORDINATOR")));
test("coordinator sees school", () => assert(audienceMatchesRole("SCHOOL", "COORDINATOR")));
test("coordinator cannot see company", () => assert(!audienceMatchesRole("COMPANY", "COORDINATOR")));
test("representative sees representatives", () => assert(audienceMatchesRole("REPRESENTATIVES", "REPRESENTATIVE")));
test("representative sees company", () => assert(audienceMatchesRole("COMPANY", "REPRESENTATIVE")));

test("title required", () => assert(!announcementInputSchema.safeParse({ title: "", content: "Body", priority: "NORMAL", audience: "ALL_USERS" }).success));
test("content required", () => assert(!announcementInputSchema.safeParse({ title: "Title", content: "", priority: "NORMAL", audience: "ALL_USERS" }).success));
test("valid input accepted", () => assert(announcementInputSchema.safeParse({ title: "Title", content: "Body", priority: "NORMAL", audience: "ALL_USERS" }).success));
test("invalid audience rejected", () => assert(!announcementInputSchema.safeParse({ title: "Title", content: "Body", priority: "NORMAL", audience: "INVALID" }).success));
test("invalid priority rejected", () => assert(!announcementInputSchema.safeParse({ title: "Title", content: "Body", priority: "INVALID", audience: "ALL_USERS" }).success));
test("expiration before schedule rejected", () => assert(!announcementInputSchema.safeParse({ title: "Title", content: "Body", priority: "NORMAL", audience: "ALL_USERS", scheduledFor: "2026-08-10T10:00", expiresAt: "2026-08-09T10:00" }).success));
test("malformed date rejected", () => assert(!announcementInputSchema.safeParse({ title: "Title", content: "Body", priority: "NORMAL", audience: "ALL_USERS", scheduledFor: "not-a-date" }).success));
test("title too long rejected", () => assert(!announcementInputSchema.safeParse({ title: "x".repeat(256), content: "Body", priority: "NORMAL", audience: "ALL_USERS" }).success));

test("expired detected", () => assert(isExpired({ expiresAt: new Date(0) })));
test("not expired when future", () => assert(!isExpired({ expiresAt: new Date(Date.now() + 100000) })));
test("not expired when null", () => assert(!isExpired({ expiresAt: null })));

test("live published", () => assert(isLive({ status: "PUBLISHED", publishedAt: new Date(0), expiresAt: null })));
test("not live when draft", () => assert(!isLive({ status: "DRAFT", publishedAt: null, expiresAt: null })));
test("not live when expired", () => assert(!isLive({ status: "PUBLISHED", publishedAt: new Date(0), expiresAt: new Date(0) })));

test("mutations authorize", () => assert.ok((actions.match(/requireAnnouncementViewer/g) || []).length >= 5));
test("mutations check manage permission", () => assert.ok((actions.match(/canManageAnnouncements\(c\)/g) || []).length >= 5));
test("updates use updateMany for stale prevention", () => assert.ok((actions.match(/updateMany/g) || []).length >= 4));
test("creator resolved server-side", () => assert.match(actions, /createdById: c\.user\.id/));
test("no hard delete", () => assert.doesNotMatch(actions, /\.delete\(/));
test("publish sets publishedAt", () => assert.match(actions, /publishedAt: now/));
test("archive sets archivedAt", () => assert.match(actions, /archivedAt: now/));
test("client creator fields ignored", () => assert.doesNotMatch(actions, /formData\.get\(["']createdById/));
test("client role fields ignored", () => assert.doesNotMatch(actions, /formData\.get\(["']role/));
test("client publish timestamps ignored", () => assert.doesNotMatch(actions, /formData\.get\(["']publishedAt/));
test("client organization ids ignored", () => assert.doesNotMatch(actions, /formData\.get\(["']companyId/));

test("navigation exists for all roles", () => {
  assert.match(shell, /\/announcements/);
  assert.ok((shell.match(/\/announcements/g) || []).length >= 4);
});
test("intern bottom nav preserved", () => { assert.match(shell, /MobileInternNavigation/); assert.match(mobileNavigation, /aria-label="Intern mobile navigation"/); });
test("bell icon used", () => assert.match(shell, /icon: "bell"/));

test("dashboard integrates announcements", () => {
  assert.match(dashboard, /AnnouncementReaderSummary/);
  assert.match(dashboard, /AnnouncementManagerSummary/);
});

test("list uses friendly labels for display", () => {
  assert.match(listPage, /AUDIENCE_LABELS\[row\.audience\]/);
  assert.match(listPage, /PRIORITY_LABELS\[row\.priority\]/);
});
test("detail uses friendly labels for display", () => {
  assert.match(detailPage, /AUDIENCE_LABELS\[announcement\.audience\]/);
  assert.match(detailPage, /PRIORITY_LABELS\[announcement\.priority\]/);
  assert.match(detailPage, /STATUS_LABELS\[announcement\.status\]/);
});
test("manage uses friendly labels for display", () => {
  assert.match(managePage, /AUDIENCE_LABELS\[row\.audience\]/);
  assert.match(managePage, /PRIORITY_LABELS\[row\.priority\]/);
  assert.match(managePage, /STATUS_LABELS\[row\.status\]/);
});
test("new uses friendly labels for options", () => {
  assert.match(newPage, /AUDIENCE_LABELS\[value\]/);
});
test("edit uses friendly labels for options", () => {
  assert.match(editPage, /AUDIENCE_LABELS\[value\]/);
});

test("friendly labels used", () => {
  assert.equal(AUDIENCE_LABELS.ALL_USERS, "Everyone");
  assert.equal(PRIORITY_LABELS.NORMAL, "Normal");
  assert.equal(STATUS_LABELS.DRAFT, "Draft");
});

test("no prohibited terminology in pages", () => {
  const pages = [listPage, detailPage, managePage, newPage, editPage, summary];
  for (const page of pages) {
    assert.doesNotMatch(page, /\bBranch\b/);
    assert.doesNotMatch(page, /\bAssignment\b/);
    assert.doesNotMatch(page, /\bPlacement\b/);
  }
});

test("no fake read tracking", () => {
  const pages = [listPage, detailPage, managePage, summary];
  for (const page of pages) {
    assert.doesNotMatch(page, /unread|readReceipt|read receipt|isRead|readAt/i);
  }
});

test("no fake delivery tracking", () => {
  const pages = [listPage, detailPage, managePage, summary];
  for (const page of pages) {
    assert.doesNotMatch(page, /push notification|email delivery|SMS|sent to|delivered to/i);
  }
});

test("confirmation before publish", () => assert.match(detailPage, /Publish this announcement/));
test("confirmation before archive", () => assert.match(detailPage, /Archive this announcement/));

test("safe error message exists", () => assert.ok(safeAnnouncementError().length > 0));

test("routes exist", () => {
  assert.match(listPage, /AnnouncementsPage/);
  assert.match(detailPage, /AnnouncementDetail/);
  assert.match(managePage, /ManageAnnouncements/);
  assert.match(newPage, /NewAnnouncement/);
  assert.match(editPage, /EditAnnouncement/);
});
