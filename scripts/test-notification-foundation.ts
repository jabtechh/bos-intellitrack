import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatNotificationBadge, notificationInputSchema, safeNotificationHrefSchema } from "../src/lib/notifications/domain.ts";
import { NotificationUnavailableError, missingNotificationTableFallback, throwNotificationUnavailable } from "../src/lib/notifications/errors.ts";

const schema=readFileSync("prisma/schema.prisma","utf8"),service=readFileSync("src/lib/notifications/service.ts","utf8"),migration=readFileSync("prisma/migrations/20260817120000_add_notification_foundation/migration.sql","utf8"),page=readFileSync("src/app/(authenticated)/notifications/page.tsx","utf8"),item=readFileSync("src/components/notification-item.tsx","utf8"),shell=readFileSync("src/components/app-shell.tsx","utf8"),mobile=readFileSync("src/components/mobile-navigation.tsx","utf8");
const base={recipientId:"00000000-0000-4000-8000-000000000001",type:"task.assigned",title:"Assigned"} as const;

test("create notification contract is accepted",()=>assert(notificationInputSchema.safeParse(base).success));
test("system notification supports null actor",()=>assert(notificationInputSchema.safeParse({...base,actorId:null}).success));
test("actor-backed notification is accepted",()=>assert(notificationInputSchema.safeParse({...base,actorId:"00000000-0000-4000-8000-000000000002"}).success));
test("notifications are newest first",()=>assert.match(service,/orderBy: \[\{ createdAt: "desc" \}, \{ id: "desc" \}\]/));
test("unread filtering is recipient scoped",()=>assert.match(service,/recipientId: user\.id[\s\S]*readAt: null/));
test("unread count is persisted",()=>assert.match(service,/notification\.count\(\{ where: \{ recipientId: user\.id, readAt: null/));
test("mark one scopes id and current recipient",()=>assert.match(service,/where: \{ id: notificationId, recipientId: user\.id, readAt: null \}/));
test("another recipient cannot be supplied to client mutations",()=>assert.doesNotMatch(service,/markNotificationRead\([^)]*(userId|recipientId)/));
test("mark all affects current user only",()=>assert.match(service,/where: \{ recipientId: user\.id, readAt: null \}/));
test("dedupe is DB backed and P2002 is handled",()=>{assert.match(migration,/UNIQUE INDEX[\s\S]*recipient_id[\s\S]*dedupe_key/);assert.match(service,/P2002/);assert.doesNotMatch(service,/findFirst/)});
test("same key works for different recipients",()=>assert.match(schema,/@@unique\(\[recipientId, dedupeKey\]/));
test("null dedupe keys may coexist",()=>{assert.match(schema,/dedupeKey\s+String\?/);assert.doesNotMatch(migration,/dedupe_key[^\n]+NOT NULL/)});
test("valid internal href accepted",()=>assert(safeNotificationHrefSchema.safeParse("/tasks/123?tab=work").success));
test("external and protocol href rejected",()=>{for(const href of ["http://evil.test","https://evil.test","//evil.test","javascript:alert(1)","data:text/plain,x"])assert(!safeNotificationHrefSchema.safeParse(href).success)});
test("unsupported type rejected",()=>assert(!notificationInputSchema.safeParse({...base,type:"unknown.event"}).success));
test("badge formatting handles zero normal and 99+",()=>{assert.equal(formatNotificationBadge(0),null);assert.equal(formatNotificationBadge(8),"8");assert.equal(formatNotificationBadge(100),"99+")});
test("empty state exists",()=>assert.match(page,/No notifications/));
test("restricted fields are absent from strict input contract",()=>{for(const key of ["password","authId","token","cookie","latitude","longitude","selfiePath","signedUrl","storagePath","medicalContents","identificationContents"])assert(!notificationInputSchema.safeParse({...base,[key]:"secret"}).success)});
test("notification click marks read before safe navigation",()=>assert.match(item,/await markNotificationReadAction\(item\.id\);if\(item\.href\)router\.push/));
test("utility bell includes persisted badge without replacing approved Intern primary items",()=>{assert.match(shell,/getUnreadNotificationCount/);assert.match(shell,/ApplicationUtilities/);assert.match(mobile,/INTERN:\s*\["\/dashboard",\s*"\/attendance",\s*"\/work-logs",\s*"\/tasks",\s*"\/portfolio"\]/);assert.match(mobile,/More/)});

function prismaError(code:string,meta?:Record<string,unknown>){return Object.assign(new Error("Prisma request failed"),{code,meta})}
const missingTable=prismaError("P2021",{modelName:"Notification",table:"public.notifications"});
test("missing notification table unread count falls back to zero",()=>assert.equal(missingNotificationTableFallback(missingTable,0),0));
test("missing notification table list returns uninitialized empty result",()=>assert.deepEqual(missingNotificationTableFallback(missingTable,{initialized:false,items:[]}),{initialized:false,items:[]}));
test("missing notification table mutations fail with controlled error",()=>assert.throws(()=>throwNotificationUnavailable(missingTable),NotificationUnavailableError));
test("unrelated Prisma errors are not swallowed",()=>{const unrelated=prismaError("P2022",{modelName:"Notification"});assert.throws(()=>missingNotificationTableFallback(unrelated,0),error=>error===unrelated);const otherTable=prismaError("P2021",{table:"public.users"});assert.throws(()=>missingNotificationTableFallback(otherTable,0),error=>error===otherTable)});
test("normal notification service paths remain unchanged",()=>{assert.match(service,/initialized: true as const, items/);assert.match(service,/return await prisma\.notification\.count/);assert.match(service,/return await prisma\.notification\.updateMany/)});
