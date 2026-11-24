// DEC-2026-019 / REQ-FR-ATT-5 — server-side integration tests against the
// ISOLATED Gate A database and Storage only.
//
//   npm run gatea:env:preflight
//   npx tsx --env-file=.env.gatea.local --test scripts/test-identity-integration.ts
//
// Database: every row (synthetic users, profiles, assignments, identity rows,
// attendance) is created inside ONE interactive transaction that is always
// rolled back, so protected Gate A fixtures and operational data are untouched.
// Storage: one disposable encrypted object under a test-only prefix of the
// private identity-references bucket is uploaded, checked and deleted.
// The face provider is the deterministic mock: these tests prove workflow,
// authorization and data rules, NOT biometric accuracy.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client.ts";
import { recordClockIn, recordClockOut, type AttendanceContext, type AttendanceDeps } from "../src/lib/attendance/transactions.ts";
import { IDENTITY_BUCKET, identityConfig } from "../src/lib/identity/config.ts";
import { encryptReference } from "../src/lib/identity/encryption.ts";
import { MockFaceProvider } from "../src/lib/identity/providers/mock.ts";
import { prismaIdentityRepository } from "../src/lib/identity/repository.ts";
import { enrollReference, issueCaptureSession, resetReference, type IdentityDeps, type ReferenceImageStore } from "../src/lib/identity/service.ts";
import { createAdminClient } from "../src/lib/supabase/admin.ts";

if (process.env.GATEA_TARGET_ENV !== "test" || process.env.GATEA_ENVIRONMENT_VERIFIED !== "1" || !process.env.DATABASE_URL) {
  throw new Error("BLOCKED: identity integration tests run only against the verified isolated Gate A environment (.env.gatea.local).");
}

class Rollback extends Error {}
const memoryStore = (): ReferenceImageStore & { objects: Map<string, Uint8Array> } => {
  const objects = new Map<string, Uint8Array>();
  return { objects, async put(p, b) { objects.set(p, b); }, async get(p) { const v = objects.get(p); if (!v) throw new Error("missing"); return v; }, async remove(p) { objects.delete(p); } };
};
const jpegFile = (fill: number) => new File([new Uint8Array(4096).fill(fill)], "selfie.jpg", { type: "image/jpeg" });
const jpeg = (fill: number) => { const bytes = new Uint8Array(4096).fill(fill); return { bytes, mimeType: "image/jpeg", size: bytes.length }; };

test("automatic face photo enrollment, update, Supervisor reset and verified attendance run end-to-end on the isolated database", async (t) => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    await prisma.$transaction(async (tx) => {
      await workflow(t, tx);
      throw new Rollback("always roll back");
    }, { timeout: 120_000, maxWait: 20_000 }).catch((error: unknown) => { if (!(error instanceof Rollback)) throw error; });
    // Rollback proof: nothing from the synthetic run persisted.
    assert.equal(await prisma.user.count({ where: { email: { startsWith: "identity-it-" } } }), 0, "synthetic users were rolled back");
  } finally { await prisma.$disconnect(); }
});

async function workflow(t: TestContext, tx: Prisma.TransactionClient) {
  const stamp = randomUUID().slice(0, 8);
  const company = await tx.company.findFirst({ where: { isActive: true }, select: { id: true, latitude: true, longitude: true, timezone: true } });
  const school = await tx.school.findFirst({ select: { id: true } });
  const coordinator = await tx.coordinatorProfile.findFirst({ select: { id: true } });
  assert(company && school && coordinator, "isolated environment needs an active company, school and coordinator");

  const user = (role: "INTERN" | "SUPERVISOR", name: string) => tx.user.create({ data: { authId: randomUUID(), email: `identity-it-${stamp}-${name}@example.invalid`, role, firstName: "Identity", lastName: `IT ${name}` }, select: { id: true } });
  const supervisorUser = await user("SUPERVISOR", "supervisor"); const otherSupervisorUser = await user("SUPERVISOR", "other");
  const supervisor = await tx.supervisorProfile.create({ data: { userId: supervisorUser.id, companyId: company.id, position: "Integration test" }, select: { id: true } });
  const internUser = await user("INTERN", "a"); const otherInternUser = await user("INTERN", "b");
  const profile = (userId: string, n: string) => tx.internProfile.create({ data: { userId, schoolId: school.id, studentNumber: `IT-${stamp}-${n}`, course: "Integration test" }, select: { id: true } });
  const internA = await profile(internUser.id, "a"); const internB = await profile(otherInternUser.id, "b");
  const assignment = (internProfileId: string, n: string) => tx.internshipAssignment.create({
    data: { internProfileId, companyId: company.id, supervisorProfileId: supervisor.id, coordinatorProfileId: coordinator.id, assignmentCode: `IT-${stamp}-${n}`, startDate: new Date("2026-11-01T00:00:00Z"), endDate: new Date("2026-12-31T00:00:00Z"), status: "ACTIVE", requiredHours: 300 },
    select: { id: true, startDate: true, endDate: true, scheduleStartTime: true, scheduleEndTime: true, gracePeriodMinutes: true },
  });
  const assignmentA = await assignment(internA.id, "a"); const assignmentB = await assignment(internB.id, "b");

  let now = new Date("2026-11-24T00:30:00Z"); // 08:30 Asia/Manila
  const provider = new MockFaceProvider({}, true);
  const store = memoryStore();
  const identity: IdentityDeps = { repo: prismaIdentityRepository(tx), store, provider, config: { ...identityConfig({}), referenceEncryptionKey: randomBytes(32) }, now: () => now };
  const evidence = new Map<string, File>();
  const deps: AttendanceDeps = { db: tx, identity, evidence: { async upload(p, f) { evidence.set(p, f); }, async remove(p) { evidence.delete(p); } }, now: () => now };
  const location = { latitude: company.latitude, longitude: company.longitude, geofenceRadiusMeters: 150 };
  const contextA: AttendanceContext = { userId: internUser.id, internProfileId: internA.id, assignment: { ...assignmentA, company: { timezone: company.timezone } }, location };
  const contextB: AttendanceContext = { userId: otherInternUser.id, internProfileId: internB.id, assignment: { ...assignmentB, company: { timezone: company.timezone } }, location };
  const inside = { latitude: Number(company.latitude), longitude: Number(company.longitude), accuracy: 15 };
  const session = async (userId: string, purpose: "ENROLLMENT" | "CLOCK_IN" | "CLOCK_OUT") => { const r = await issueCaptureSession(identity, { userId, role: "INTERN", purpose }); assert(r.ok); return r.token; };
  const clock = async (kind: "in" | "out", context: AttendanceContext, extra: { referenceId?: string; token?: string } = {}) => {
    const captureToken = extra.token ?? await session(context.userId, kind === "in" ? "CLOCK_IN" : "CLOCK_OUT");
    const run = kind === "in" ? recordClockIn : recordClockOut;
    return run(deps, context, { coordinates: inside, file: jpegFile(3), remarks: null }, { captureToken, referenceId: extra.referenceId });
  };
  const attendanceCount = (assignmentId: string) => tx.attendance.count({ where: { assignmentId } });

  let referenceA = "";
  const enrollA = async (fill: number) => enrollReference(identity, { actor: { userId: internUser.id, role: "INTERN", internProfileId: internA.id }, internProfileId: internA.id, token: await session(internUser.id, "ENROLLMENT"), image: jpeg(fill), consent: true });

  await t.test("7. attendance without a face photo is blocked and audited", async () => {
    const result = await clock("in", contextA);
    assert.equal(result.success, false); assert.match(result.message, /Set up your face photo/);
    assert.equal(await attendanceCount(assignmentA.id), 0);
    assert.equal((await tx.identityVerificationAttempt.findFirstOrThrow({ where: { internProfileId: internA.id }, orderBy: { createdAt: "desc" } })).outcome, "NO_APPROVED_REFERENCE");
  });

  await t.test("an unclear first photo is not saved", async () => {
    provider.set({ quality: { kind: "unclear", reason: "multiple_faces" } });
    const result = await enrollA(6); assert.equal(result.ok, false);
    assert.equal(await tx.identityReference.count({ where: { internProfileId: internA.id } }), 0); assert.equal(store.objects.size, 0);
    const attempt = await tx.identityVerificationAttempt.findFirstOrThrow({ where: { internProfileId: internA.id, purpose: "ENROLLMENT" } });
    assert.equal(attempt.outcome, "INCONCLUSIVE"); assert.equal(attempt.failureReason, "multiple_faces");
    provider.set({});
  });

  await t.test("1/2. a clear first photo is saved and active immediately, with no human approver (automatic)", async () => {
    const result = await enrollA(7); assert(result.ok); referenceA = result.referenceId;
    const row = await tx.identityReference.findUniqueOrThrow({ where: { id: referenceA } });
    assert.equal(row.status, "APPROVED"); assert.equal(row.decidedById, null); assert(row.decidedAt); assert(row.consentVersion); assert.match(row.decisionRemarks ?? "", /^Automatic/);
    const events = await tx.identityReferenceEvent.findMany({ where: { referenceId: referenceA }, orderBy: { createdAt: "asc" } });
    assert.deepEqual(events.map((e) => [e.action, e.actorUserId]).sort(), [["APPROVED", null], ["ENROLLED", internUser.id]]);
  });

  await t.test("database allows only one APPROVED reference per intern", async () => {
    await tx.$executeRawUnsafe("SAVEPOINT identity_dup");
    await assert.rejects(tx.identityReference.create({ data: { internProfileId: internA.id, status: "APPROVED", storagePath: "x", consentVersion: "t", consentedAt: now, decidedAt: now } }));
    await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT identity_dup");
  });

  await t.test("3/4/10. verified Time In and Time Out credit hours normally", async () => {
    const timeIn = await clock("in", contextA); assert(timeIn.success, timeIn.message);
    const duplicate = await clock("in", contextA); assert.equal(duplicate.success, false, "12. duplicate Time In still rejected"); assert.match(duplicate.message, /already been recorded/);
    now = new Date("2026-11-24T08:30:00Z"); // 16:30 Manila, 8h later
    const timeOut = await clock("out", contextA); assert(timeOut.success, timeOut.message);
    const again = await clock("out", contextA); assert.equal(again.success, false, "duplicate Time Out rejected");
    const row = await tx.attendance.findUniqueOrThrow({ where: { id: timeIn.attendanceId! } });
    assert.equal(row.status, "APPROVED"); assert.equal(row.workedMinutes, 480); assert.equal(row.creditedMinutes, 480);
    assert.equal(row.clockInIdentityVerified, true); assert.equal(row.clockOutIdentityVerified, true);
    const attempts = await tx.identityVerificationAttempt.findMany({ where: { attendanceId: row.id }, orderBy: { createdAt: "asc" } });
    assert.deepEqual(attempts.map((a) => [a.purpose, a.outcome, a.referenceId]), [["CLOCK_IN", "VERIFIED", referenceA], ["CLOCK_OUT", "VERIFIED", referenceA]], "both checks used the same approved reference");
  });

  await t.test("6/5/11. failed liveness on Time In and a mismatched face on Time Out are recorded but never credited", async () => {
    now = new Date("2026-11-25T00:30:00Z");
    provider.set({ liveness: { status: "FAILED" } });
    const timeIn = await clock("in", contextA); assert(timeIn.success); assert.match(timeIn.message, /Supervisor will review/);
    provider.set({ comparison: { kind: "scored", similarity: 0.2 } });
    now = new Date("2026-11-25T08:30:00Z");
    const timeOut = await clock("out", contextA); assert(timeOut.success); assert.match(timeOut.message, /did not match/);
    const row = await tx.attendance.findUniqueOrThrow({ where: { id: timeIn.attendanceId! } });
    assert.equal(row.status, "PENDING_REVIEW"); assert.equal(row.reviewRequired, true); assert.equal(row.creditedMinutes, 0);
    assert.equal(row.clockInIdentityVerified, false); assert.equal(row.clockOutIdentityVerified, false);
    const outcomes = (await tx.identityVerificationAttempt.findMany({ where: { attendanceId: row.id }, orderBy: { createdAt: "asc" } })).map((a) => a.outcome);
    assert.deepEqual(outcomes, ["LIVENESS_FAILED", "FACE_MISMATCH"]);
    provider.set({});
  });

  await t.test("release switch off: attendance works as before with no face check and no identity flags", async () => {
    now = new Date("2026-11-29T00:30:00Z"); provider.set({ throws: true }); // would block if it were consulted
    const offDeps: AttendanceDeps = { ...deps, identityEnabled: false };
    const attemptsBefore = await tx.identityVerificationAttempt.count({ where: { internProfileId: internA.id } });
    const timeIn = await recordClockIn(offDeps, contextA, { coordinates: inside, file: jpegFile(3), remarks: null }, { captureToken: undefined });
    assert(timeIn.success, timeIn.message); assert.equal(timeIn.message, "Time In recorded.");
    now = new Date("2026-11-29T08:30:00Z");
    const timeOut = await recordClockOut(offDeps, contextA, { coordinates: inside, file: jpegFile(3), remarks: null }, { captureToken: undefined });
    assert(timeOut.success, timeOut.message);
    const row = await tx.attendance.findUniqueOrThrow({ where: { id: timeIn.attendanceId! } });
    assert.equal(row.clockInIdentityVerified, null); assert.equal(row.clockOutIdentityVerified, null);
    assert.equal(row.status, "APPROVED"); assert.equal(row.creditedMinutes, 480, "no identity exception when the switch is off");
    assert.equal(await tx.identityVerificationAttempt.count({ where: { internProfileId: internA.id } }), attemptsBefore, "no face check ran");
    provider.set({});
  });

  await t.test("provider outage fails closed with no attendance row", async () => {
    now = new Date("2026-11-26T00:30:00Z"); provider.set({ throws: true });
    const before = await attendanceCount(assignmentA.id);
    const result = await clock("in", contextA); assert.equal(result.success, false); assert.match(result.message, /temporarily unavailable/);
    assert.equal(await attendanceCount(assignmentA.id), before); provider.set({});
  });

  await t.test("capture sessions are single-use in the database and bound to their purpose", async () => {
    const raw = await session(internUser.id, "CLOCK_OUT"); const id = raw.split(".")[0];
    assert.equal(await identity.repo.consumeSession(id, now), true); assert.equal(await identity.repo.consumeSession(id, now), false, "second consume (replay) fails atomically");
    now = new Date("2026-11-27T00:30:00Z");
    const captureToken = await session(internUser.id, "CLOCK_IN");
    const first = await clock("in", contextA, { token: captureToken }); assert(first.success);
    now = new Date("2026-11-27T08:30:00Z");
    const replay = await clock("out", contextA, { token: captureToken }); assert.equal(replay.success, false, "a CLOCK_IN token cannot be reused for Time Out");
  });

  await t.test("14/15. an update must match the current photo; a match replaces it atomically", async () => {
    provider.set({ comparison: { kind: "scored", similarity: 0.3 } });
    const refused = await enrollA(2); assert.equal(refused.ok, false);
    assert.equal((await tx.identityReference.findUniqueOrThrow({ where: { id: referenceA } })).status, "APPROVED", "current photo still active");
    assert.equal((await tx.identityVerificationAttempt.findFirstOrThrow({ where: { internProfileId: internA.id, purpose: "ENROLLMENT", outcome: "FACE_MISMATCH" } })).referenceId, referenceA);
    provider.set({});
    const updated = await enrollA(8); assert(updated.ok && updated.replacement);
    assert.equal((await tx.identityReference.findUniqueOrThrow({ where: { id: referenceA } })).status, "SUPERSEDED");
    const row = await tx.identityReference.findUniqueOrThrow({ where: { id: updated.referenceId } });
    assert.equal(row.status, "APPROVED"); assert.equal(row.replacesId, referenceA);
    assert.equal(await tx.identityReference.count({ where: { internProfileId: internA.id, status: "APPROVED" } }), 1);
    referenceA = updated.referenceId;
  });

  await t.test("2/3. only the assigned Supervisor can reset; the intern then sets up a new photo", async () => {
    assert.equal((await resetReference(identity, { actor: { userId: internUser.id, role: "INTERN" }, referenceId: referenceA, remarks: "x" })).ok, false);
    assert.equal((await resetReference(identity, { actor: { userId: otherSupervisorUser.id, role: "SUPERVISOR" }, referenceId: referenceA, remarks: "x" })).ok, false);
    assert.equal((await resetReference(identity, { actor: { userId: supervisorUser.id, role: "SUPERVISOR" }, referenceId: referenceA, remarks: "Photo shows someone else" })).ok, true);
    const row = await tx.identityReference.findUniqueOrThrow({ where: { id: referenceA } });
    assert.equal(row.status, "REJECTED"); assert.equal(row.decidedById, supervisorUser.id); assert.equal(row.decisionRemarks, "Photo shows someone else");
    now = new Date("2026-11-27T23:30:00Z");
    const blocked = await clock("in", contextA); assert.equal(blocked.success, false, "attendance blocked after reset");
    const again = await enrollA(5); assert(again.ok && !again.replacement); referenceA = again.referenceId;
  });

  await t.test("8. another intern's reference cannot be used", async () => {
    const enrolled = await enrollReference(identity, { actor: { userId: otherInternUser.id, role: "INTERN", internProfileId: internB.id }, internProfileId: internB.id, token: await session(otherInternUser.id, "ENROLLMENT"), image: jpeg(9), consent: true });
    assert(enrolled.ok);
    assert.equal((await enrollReference(identity, { actor: { userId: internUser.id, role: "INTERN", internProfileId: internA.id }, internProfileId: internB.id, token: await session(internUser.id, "ENROLLMENT"), image: jpeg(1), consent: true })).ok, false, "cannot enroll for another intern");
    now = new Date("2026-11-28T00:30:00Z");
    // Intern B cannot claim intern A's face photo.
    const borrowed = await clock("in", contextB, { referenceId: referenceA }); assert.equal(borrowed.success, false);
    assert.equal(await attendanceCount(assignmentB.id), 0);
    assert.equal((await tx.identityVerificationAttempt.findFirstOrThrow({ where: { internProfileId: internB.id }, orderBy: { createdAt: "desc" } })).failureReason, "foreign_reference");
    const foreign = await clock("in", contextA, { referenceId: enrolled.referenceId }); assert.equal(foreign.success, false, "intern A cannot claim intern B's reference");
    assert.equal((await tx.identityVerificationAttempt.findFirstOrThrow({ where: { internProfileId: internA.id }, orderBy: { createdAt: "desc" } })).failureReason, "foreign_reference");
  });

  await t.test("existing (pre-feature) attendance rows keep their status and credited minutes", async () => {
    const legacy = await tx.attendance.findFirst({ where: { clockInIdentityVerified: null, clockOutIdentityVerified: null, status: "APPROVED" }, select: { creditedMinutes: true, workedMinutes: true } });
    if (legacy) assert(legacy.creditedMinutes <= legacy.workedMinutes);
    assert.equal(await tx.attendance.count({ where: { OR: [{ clockInIdentityVerified: { not: null } }, { clockOutIdentityVerified: { not: null } }], assignment: { assignmentCode: { not: { startsWith: `IT-${stamp}` } } } } }), 0, "no pre-existing attendance row was given identity values");
  });
}

test("9. identity reference Storage is private and unreadable without the service role", async () => {
  const admin = createAdminClient().storage;
  const { data: bucket, error } = await admin.getBucket(IDENTITY_BUCKET);
  assert(!error && bucket, "run scripts/setup-identity-storage.ts against the isolated environment first");
  assert.equal(bucket.public, false, "bucket must be private");
  const path = `__identity-integration__/${randomUUID()}.bin`; const key = randomBytes(32);
  const plaintext = new Uint8Array(512).fill(42);
  const upload = await admin.from(IDENTITY_BUCKET).upload(path, Buffer.from(encryptReference(key, path, plaintext)), { contentType: "application/octet-stream", upsert: false });
  assert.equal(upload.error, null);
  try {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const anonymous = await anon.storage.from(IDENTITY_BUCKET).download(path);
    assert(anonymous.error, "anonymous download must fail");
    const publicUrl = admin.from(IDENTITY_BUCKET).getPublicUrl(path).data.publicUrl;
    assert.notEqual((await fetch(publicUrl)).status, 200, "public URL must not serve the object");
    const stored = await admin.from(IDENTITY_BUCKET).download(path);
    assert(stored.data); const bytes = new Uint8Array(await stored.data.arrayBuffer());
    assert.notDeepEqual(bytes.subarray(30, 60), plaintext.subarray(0, 30), "object at rest is ciphertext");
  } finally {
    await admin.from(IDENTITY_BUCKET).remove([path]);
  }
});
