// DEC-2026-019 / REQ-FR-ATT-5 — identity verification unit tests.
// Uses the real service with an in-memory repository and the deterministic
// mock provider. These tests prove workflow and security rules only; they do
// NOT establish biometric accuracy.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { attendanceNeedsReview, finalAttendanceDecision, getAttendanceExceptions } from "../src/lib/attendance/domain.ts";
import { identitySubmission } from "../src/lib/attendance/transactions.ts";
import { identityConfig, type IdentityConfig } from "../src/lib/identity/config.ts";
import { attendanceDisposition, canResetReference, decideVerification, parseCaptureToken } from "../src/lib/identity/domain.ts";
import { decryptReference, encryptReference } from "../src/lib/identity/encryption.ts";
import { CompreFaceProvider, interpretQualityResponse, interpretVerifyResponse } from "../src/lib/identity/providers/compreface.ts";
import { MockFaceProvider } from "../src/lib/identity/providers/mock.ts";
import {
  enrollReference, issueCaptureSession, readReferenceImage, resetReference, verifyAttendanceIdentity,
  type AttemptRow, type IdentityDeps, type IdentityRepository, type ReferenceEventRow, type ReferenceImageStore, type ReferenceRow,
} from "../src/lib/identity/service.ts";
import type { CaptureSessionRow } from "../src/lib/identity/domain.ts";

// ---- in-memory doubles ---------------------------------------------------------------------
type Ids = { internA: string; internB: string; userA: string; userB: string; supervisor: string; otherSupervisor: string };
const ids: Ids = { internA: "11111111-1111-4111-8111-111111111111", internB: "22222222-2222-4222-8222-222222222222", userA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", userB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", supervisor: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", otherSupervisor: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" };

class MemoryRepo implements IdentityRepository {
  sessions = new Map<string, CaptureSessionRow>(); references = new Map<string, ReferenceRow>(); events: ReferenceEventRow[] = []; attempts: (AttemptRow & { id: string })[] = [];
  owners = new Map([[ids.internA, { user: ids.userA, supervisors: [ids.supervisor] }], [ids.internB, { user: ids.userB, supervisors: [ids.otherSupervisor] }]]);
  /** Simulates another request changing the face photo between the check and the save. */
  loseActivationRace = false;
  async createSession(row: CaptureSessionRow & { createdAt: Date }) { const { createdAt: _createdAt, ...session } = row; void _createdAt; this.sessions.set(row.id, session); }
  async findSession(id: string) { const row = this.sessions.get(id); return row ? { ...row } : null; }
  async consumeSession(id: string, now: Date) { const row = this.sessions.get(id); if (!row || row.consumedAt || row.expiresAt <= now) return false; row.consumedAt = now; return true; }
  async findReferences(internProfileId: string, statuses: ReferenceRow["status"][]) { return [...this.references.values()].filter((r) => r.internProfileId === internProfileId && statuses.includes(r.status)); }
  async findReferenceScope(referenceId: string) { const reference = this.references.get(referenceId); if (!reference) return null; const owner = this.owners.get(reference.internProfileId)!; return { reference: { ...reference }, internUserId: owner.user, assignedSupervisorUserIds: owner.supervisors }; }
  async activateReference({ reference, expectedCurrentId, enrolledByUserId, remarks }: Parameters<IdentityRepository["activateReference"]>[0]) {
    const current = [...this.references.values()].filter((r) => r.internProfileId === reference.internProfileId && (r.status === "APPROVED" || r.status === "PENDING"));
    if (this.loseActivationRace || (current.find((r) => r.status === "APPROVED")?.id ?? null) !== expectedCurrentId) return { ok: false, supersededPaths: [] };
    for (const row of current) { row.status = "SUPERSEDED"; this.events.push({ referenceId: row.id, internProfileId: row.internProfileId, actorUserId: null, action: "SUPERSEDED", remarks: null }); }
    this.references.set(reference.id, { id: reference.id, internProfileId: reference.internProfileId, status: "APPROVED", storagePath: reference.storagePath, replacesId: reference.replacesId });
    this.events.push({ referenceId: reference.id, internProfileId: reference.internProfileId, actorUserId: enrolledByUserId, action: expectedCurrentId ? "REPLACEMENT_REQUESTED" : "ENROLLED", remarks: null });
    this.events.push({ referenceId: reference.id, internProfileId: reference.internProfileId, actorUserId: null, action: "APPROVED", remarks });
    return { ok: true, supersededPaths: current.map((row) => row.storagePath) };
  }
  async revokeReference({ referenceId, actorUserId, remarks }: { referenceId: string; actorUserId: string; remarks: string }) {
    const target = this.references.get(referenceId); if (!target || target.status !== "APPROVED") return false;
    target.status = "REJECTED"; this.events.push({ referenceId, internProfileId: target.internProfileId, actorUserId, action: "REJECTED", remarks }); return true;
  }
  async recordAttempt(row: AttemptRow) { const id = `attempt-${this.attempts.length + 1}`; this.attempts.push({ ...row, id }); return id; }
  async linkAttempt(attemptId: string, attendanceId: string) { const row = this.attempts.find((a) => a.id === attemptId); if (row) row.attendanceId = attendanceId; }
}
class MemoryStore implements ReferenceImageStore {
  objects = new Map<string, Uint8Array>(); failGet = false;
  async put(path: string, bytes: Uint8Array) { if (this.objects.has(path)) throw new Error("exists"); this.objects.set(path, bytes); }
  async get(path: string) { const v = this.objects.get(path); if (!v || this.failGet) throw new Error("missing"); return v; }
  async remove(path: string) { this.objects.delete(path); }
}

const jpeg = (fill = 1) => { const bytes = new Uint8Array(2048).fill(fill); return { bytes, mimeType: "image/jpeg", size: bytes.length }; };
function setup(overrides: Partial<IdentityConfig> = {}, provider: MockFaceProvider | null = new MockFaceProvider()) {
  let now = new Date("2026-11-24T01:00:00Z");
  const repo = new MemoryRepo(); const store = new MemoryStore();
  const config: IdentityConfig = { ...identityConfig({}), referenceEncryptionKey: randomBytes(32), ...overrides };
  const deps: IdentityDeps = { repo, store, provider, config, now: () => now };
  return { deps, repo, store, provider, advance: (seconds: number) => { now = new Date(now.getTime() + seconds * 1000); } };
}
const intern = (which: "A" | "B" = "A") => ({ userId: which === "A" ? ids.userA : ids.userB, role: "INTERN", internProfileId: which === "A" ? ids.internA : ids.internB });
const supervisorOf = { A: { userId: ids.supervisor, role: "SUPERVISOR" }, B: { userId: ids.otherSupervisor, role: "SUPERVISOR" } };
async function token(deps: IdentityDeps, purpose: "ENROLLMENT" | "CLOCK_IN" | "CLOCK_OUT", userId = ids.userA) {
  const result = await issueCaptureSession(deps, { userId, role: "INTERN", purpose }); assert(result.ok); return result.token;
}
async function enroll(env: ReturnType<typeof setup>, which: "A" | "B" = "A", fill = 7) {
  const actor = intern(which);
  return enrollReference(env.deps, { actor, internProfileId: actor.internProfileId, token: await token(env.deps, "ENROLLMENT", actor.userId), image: jpeg(fill), consent: true });
}
/** First enrollment: saved automatically after the clear-face check. */
async function approvedReference(env: ReturnType<typeof setup>, which: "A" | "B" = "A") {
  const enrolled = await enroll(env, which, which === "A" ? 7 : 9);
  assert(enrolled.ok, "enrollment should succeed");
  return enrolled.referenceId;
}
async function verify(env: ReturnType<typeof setup>, purpose: "CLOCK_IN" | "CLOCK_OUT" = "CLOCK_IN", extra: { claimedReferenceId?: unknown } = {}) {
  return verifyAttendanceIdentity(env.deps, { userId: ids.userA, internProfileId: ids.internA, purpose, token: await token(env.deps, purpose), image: jpeg(3), ...extra });
}

// ---- enrollment (automatic save, DEC-2026-019 amendment) ---------------------------------------
test("1. an intern cannot enroll a face photo for another intern", async () => {
  const env = setup();
  const result = await enrollReference(env.deps, { actor: intern("A"), internProfileId: ids.internB, token: await token(env.deps, "ENROLLMENT"), image: jpeg(), consent: true });
  assert.equal(result.ok, false); assert.equal(env.repo.references.size, 0); assert.equal(env.store.objects.size, 0);
  const admin = await enrollReference(env.deps, { actor: { userId: ids.supervisor, role: "SUPERVISOR", internProfileId: ids.internA }, internProfileId: ids.internA, token: await token(env.deps, "ENROLLMENT", ids.supervisor), image: jpeg(), consent: true });
  assert.equal(admin.ok, false, "only interns enroll");
});

test("enrollment requires consent, a camera JPEG and an ENROLLMENT session", async () => {
  const env = setup();
  assert.equal((await enrollReference(env.deps, { actor: intern(), internProfileId: ids.internA, token: await token(env.deps, "ENROLLMENT"), image: jpeg(), consent: false })).ok, false);
  assert.equal((await enrollReference(env.deps, { actor: intern(), internProfileId: ids.internA, token: await token(env.deps, "ENROLLMENT"), image: { ...jpeg(), mimeType: "image/png" }, consent: true })).ok, false, "gallery-style PNG upload rejected");
  assert.equal((await enrollReference(env.deps, { actor: intern(), internProfileId: ids.internA, token: await token(env.deps, "CLOCK_IN"), image: jpeg(), consent: true })).ok, false, "wrong-purpose session rejected");
  const captured = await token(env.deps, "ENROLLMENT");
  assert((await enrollReference(env.deps, { actor: intern(), internProfileId: ids.internA, token: captured, image: jpeg(), consent: true })).ok);
  assert.equal((await enrollReference(env.deps, { actor: intern(), internProfileId: ids.internA, token: captured, image: jpeg(), consent: true })).ok, false, "replayed session rejected");
  assert.equal(env.provider!.calls.quality, 1, "the face check runs only after the session is accepted");
});

test("a clear first photo is saved automatically, encrypted, with no human approver recorded", async () => {
  const env = setup();
  const result = await enroll(env, "A", 5); assert(result.ok); assert.equal(result.replacement, false);
  assert.equal(env.repo.references.get(result.referenceId)!.status, "APPROVED", "usable immediately");
  const stored = [...env.store.objects.values()][0];
  assert.notDeepEqual(stored.subarray(0, 64), jpeg(5).bytes.subarray(0, 64), "stored bytes are not the plaintext image");
  assert.deepEqual(env.repo.events.map((e) => [e.action, e.actorUserId]), [["ENROLLED", ids.userA], ["APPROVED", null]], "automatic approval has no human actor");
  assert.equal(env.provider!.calls.compare, 0, "first enrollment has nothing to compare against");
  assert.equal((await verify(env)).outcome, "VERIFIED", "attendance can use it right away");
});

test("unclear photos (no face, several faces, low confidence) are not saved and ask for a retake", async () => {
  for (const [reason, pattern] of [["no_face", /couldn't find a clear face/], ["multiple_faces", /only you are in the frame/], ["low_confidence", /isn't clear enough/]] as const) {
    const env = setup(); env.provider!.set({ quality: { kind: "unclear", reason } });
    const result = await enroll(env); assert.equal(result.ok, false); assert(!result.ok && pattern.test(result.message), reason);
    assert.equal(env.repo.references.size, 0); assert.equal(env.store.objects.size, 0);
    assert.equal(env.repo.attempts.at(-1)!.outcome, "INCONCLUSIVE"); assert.equal(env.repo.attempts.at(-1)!.failureReason, reason);
  }
});

test("enrollment fails closed: no provider, no key, provider error or timeout never saves a photo", async () => {
  const unconfigured = setup({}, null); assert.equal((await enroll(unconfigured)).ok, false); assert.equal(unconfigured.repo.references.size, 0);
  const noKey = setup({ referenceEncryptionKey: null }); assert.equal((await enroll(noKey)).ok, false); assert.equal(noKey.store.objects.size, 0);
  const broken = setup(); broken.provider!.set({ quality: { kind: "error", reason: "provider_unreachable" } });
  const result = await enroll(broken); assert(!result.ok && /temporarily unavailable/.test(result.message)); assert.equal(broken.repo.references.size, 0);
  const thrown = setup(); thrown.provider!.set({ throws: true }); assert.equal((await enroll(thrown)).ok, false); assert.equal(thrown.repo.references.size, 0);
  const slow = setup({ providerTimeoutMs: 50 }); slow.provider!.set({ delayMs: 500 });
  assert.equal((await enroll(slow)).ok, false); assert.equal(slow.repo.attempts.at(-1)!.failureReason, "provider_timeout"); assert.equal(slow.repo.references.size, 0);
});

test("14/15. an update that matches the current photo replaces it automatically and keeps the audit trail", async () => {
  const env = setup(); const first = await approvedReference(env); const firstPath = env.repo.references.get(first)!.storagePath;
  const update = await enroll(env, "A", 8); assert(update.ok && update.replacement);
  assert.equal(env.provider!.calls.compare, 1, "compared with the current photo");
  assert.equal(env.repo.references.get(first)!.status, "SUPERSEDED"); assert.equal(env.repo.references.get(update.referenceId)!.status, "APPROVED");
  assert.equal(env.repo.references.get(update.referenceId)!.replacesId, first);
  assert.equal(env.store.objects.has(firstPath), false, "old image deleted");
  assert.deepEqual(env.repo.events.map((e) => e.action), ["ENROLLED", "APPROVED", "SUPERSEDED", "REPLACEMENT_REQUESTED", "APPROVED"]);
  assert.equal([...env.repo.references.values()].filter((r) => r.status === "APPROVED").length, 1, "exactly one active photo");
  assert.equal(env.repo.attempts.at(-1)!.outcome, "VERIFIED"); assert.equal(env.repo.attempts.at(-1)!.purpose, "ENROLLMENT");
});

test("an update showing a different person is refused; the current photo stays active", async () => {
  const env = setup(); const first = await approvedReference(env);
  env.provider!.set({ comparison: { kind: "scored", similarity: 0.31 } });
  const update = await enroll(env, "A", 2); assert.equal(update.ok, false); assert(!update.ok && /ask your Company Supervisor to reset/.test(update.message));
  assert.equal(env.repo.references.get(first)!.status, "APPROVED"); assert.equal(env.repo.references.size, 1); assert.equal(env.store.objects.size, 1);
  assert.equal(env.repo.attempts.at(-1)!.outcome, "FACE_MISMATCH"); assert.equal(env.repo.attempts.at(-1)!.referenceId, first);
  env.provider!.set({ comparison: { kind: "inconclusive", reason: "multiple_faces" } }); assert.equal((await enroll(env, "A", 2)).ok, false, "inconclusive never replaces");
  env.provider!.set({ comparison: { kind: "error", reason: "provider_unreachable" } }); assert.equal((await enroll(env, "A", 2)).ok, false, "provider error never replaces");
  env.provider!.set({}); env.store.failGet = true; assert.equal((await enroll(env, "A", 2)).ok, false, "unreadable current photo never replaced silently");
  assert.equal(env.repo.references.get(first)!.status, "APPROVED");
});

test("a lost save race leaves no orphaned image", async () => {
  const env = setup(); env.repo.loseActivationRace = true;
  assert.equal((await enroll(env)).ok, false); assert.equal(env.store.objects.size, 0); assert.equal(env.repo.references.size, 0);
});

// ---- Supervisor reset ---------------------------------------------------------------------------
test("2/3. only the directly assigned Company Supervisor can reset a face photo", async () => {
  const env = setup(); const referenceId = await approvedReference(env);
  for (const actor of [{ userId: ids.userA, role: "INTERN" }, { userId: ids.otherSupervisor, role: "SUPERVISOR" }, { userId: ids.supervisor, role: "ADMIN" }, { userId: ids.supervisor, role: "REPRESENTATIVE" }, { userId: ids.supervisor, role: "COORDINATOR" }]) {
    assert.equal((await resetReference(env.deps, { actor, referenceId, remarks: "Wrong person" })).ok, false, JSON.stringify(actor));
  }
  assert.equal(env.repo.references.get(referenceId)!.status, "APPROVED");
  assert.equal(canResetReference({ userId: ids.userA, role: "SUPERVISOR" }, { internUserId: ids.userA, assignedSupervisorUserIds: [ids.userA] }), false, "self-reset blocked even with a supervisor role");
});

test("reset requires remarks, deletes the image, blocks attendance and lets the intern enroll again", async () => {
  const env = setup(); const referenceId = await approvedReference(env);
  assert.equal((await resetReference(env.deps, { actor: supervisorOf.A, referenceId, remarks: " " })).ok, false);
  assert.equal((await resetReference(env.deps, { actor: supervisorOf.A, referenceId, remarks: "Photo shows a different person" })).ok, true);
  assert.equal(env.repo.references.get(referenceId)!.status, "REJECTED"); assert.equal(env.store.objects.size, 0);
  assert.equal(env.repo.events.at(-1)!.action, "REJECTED"); assert.equal(env.repo.events.at(-1)!.actorUserId, ids.supervisor);
  assert.equal((await resetReference(env.deps, { actor: supervisorOf.A, referenceId, remarks: "again" })).ok, false, "already reset");
  assert.equal((await verify(env)).outcome, "NO_APPROVED_REFERENCE");
  const again = await enroll(env, "A", 4); assert(again.ok && !again.replacement, "re-enrollment is a fresh first enrollment");
});

test("face photos are readable only by the owner and the assigned Supervisor, and only while active", async () => {
  const env = setup(); const referenceId = await approvedReference(env);
  assert(await readReferenceImage(env.deps, { actor: { userId: ids.userA, role: "INTERN" }, referenceId }));
  assert(await readReferenceImage(env.deps, { actor: { userId: ids.supervisor, role: "SUPERVISOR" }, referenceId }));
  assert.equal(await readReferenceImage(env.deps, { actor: { userId: ids.userB, role: "INTERN" }, referenceId }), null);
  assert.equal(await readReferenceImage(env.deps, { actor: { userId: ids.otherSupervisor, role: "SUPERVISOR" }, referenceId }), null);
  await resetReference(env.deps, { actor: supervisorOf.A, referenceId, remarks: "Reset" });
  assert.equal(await readReferenceImage(env.deps, { actor: { userId: ids.userA, role: "INTERN" }, referenceId }), null);
});

// ---- 4–13, 16: attendance verification -------------------------------------------------------------
test("4/10. a missing face photo blocks attendance", async () => {
  const env = setup();
  const result = await verify(env); assert.equal(result.outcome, "NO_APPROVED_REFERENCE"); assert.equal(result.disposition, "BLOCK"); assert.equal(env.provider!.calls.compare, 0);
});

test("5/6. an approved reference with a passing match (and passing liveness when supported) verifies", async () => {
  const env = setup(); await approvedReference(env);
  const result = await verify(env); assert.equal(result.outcome, "VERIFIED"); assert.equal(result.disposition, "ACCEPT_VERIFIED");
  assert.equal(env.repo.attempts.at(-1)!.liveness, "NOT_CONFIGURED", "liveness is recorded as not configured, never as passed");
  const withLiveness = setup({}, new MockFaceProvider({}, true)); await approvedReference(withLiveness);
  const live = await verify(withLiveness); assert.equal(live.outcome, "VERIFIED"); assert.equal(withLiveness.repo.attempts.at(-1)!.liveness, "PASSED");
});

test("7. a face mismatch fails verification and is flagged, not approved", async () => {
  const env = setup(); await approvedReference(env); env.provider!.set({ comparison: { kind: "scored", similarity: 0.42 } });
  const result = await verify(env, "CLOCK_OUT"); assert.equal(result.outcome, "FACE_MISMATCH"); assert.equal(result.disposition, "ACCEPT_FLAGGED");
  assert.equal(env.repo.attempts.at(-1)!.faceMatch, "NO_MATCH");
});

test("threshold is applied server-side from configuration", async () => {
  const env = setup({ matchThreshold: 0.95 }); await approvedReference(env); env.provider!.set({ comparison: { kind: "scored", similarity: 0.94 } });
  assert.equal((await verify(env)).outcome, "FACE_MISMATCH");
  env.provider!.set({ comparison: { kind: "scored", similarity: 0.95 } }); assert.equal((await verify(env)).outcome, "VERIFIED");
});

test("8/9. liveness failure and inconclusive results never pass", async () => {
  const env = setup({}, new MockFaceProvider({}, true)); await approvedReference(env);
  env.provider!.set({ liveness: { status: "FAILED" } }); let result = await verify(env); assert.equal(result.outcome, "LIVENESS_FAILED"); assert.notEqual(result.disposition, "ACCEPT_VERIFIED");
  env.provider!.set({ liveness: { status: "INCONCLUSIVE" } }); result = await verify(env); assert.equal(result.outcome, "INCONCLUSIVE"); assert.notEqual(result.disposition, "ACCEPT_VERIFIED");
  env.provider!.set({ comparison: { kind: "inconclusive", reason: "multiple_faces" } }); result = await verify(env); assert.equal(result.outcome, "INCONCLUSIVE"); assert.notEqual(result.disposition, "ACCEPT_VERIFIED");
});

test("11. expired capture sessions are rejected", async () => {
  const env = setup({ captureTtlSeconds: 60 }); await approvedReference(env);
  const captured = await token(env.deps, "CLOCK_IN"); env.advance(61);
  const result = await verifyAttendanceIdentity(env.deps, { userId: ids.userA, internProfileId: ids.internA, purpose: "CLOCK_IN", token: captured, image: jpeg() });
  assert.equal(result.outcome, "SESSION_REJECTED"); assert.equal(result.disposition, "BLOCK"); assert.match(result.message, /expired/);
  assert.equal(env.provider!.calls.compare, 0);
});

test("12. replayed capture sessions are rejected", async () => {
  const env = setup(); await approvedReference(env); const captured = await token(env.deps, "CLOCK_IN");
  const first = await verifyAttendanceIdentity(env.deps, { userId: ids.userA, internProfileId: ids.internA, purpose: "CLOCK_IN", token: captured, image: jpeg() });
  const second = await verifyAttendanceIdentity(env.deps, { userId: ids.userA, internProfileId: ids.internA, purpose: "CLOCK_IN", token: captured, image: jpeg() });
  assert.equal(first.outcome, "VERIFIED"); assert.equal(second.outcome, "SESSION_REJECTED"); assert.match(second.message, /already used/);
});

test("sessions are bound to the user, the purpose and the secret", async () => {
  const env = setup(); await approvedReference(env);
  const other = await token(env.deps, "CLOCK_IN", ids.userB);
  assert.equal((await verifyAttendanceIdentity(env.deps, { userId: ids.userA, internProfileId: ids.internA, purpose: "CLOCK_IN", token: other, image: jpeg() })).outcome, "SESSION_REJECTED", "another user's session");
  const clockOut = await token(env.deps, "CLOCK_OUT");
  assert.equal((await verifyAttendanceIdentity(env.deps, { userId: ids.userA, internProfileId: ids.internA, purpose: "CLOCK_IN", token: clockOut, image: jpeg() })).outcome, "SESSION_REJECTED", "wrong purpose");
  const forged = (await token(env.deps, "CLOCK_IN")).replace(/\..*/, "." + "x".repeat(43));
  assert.equal((await verifyAttendanceIdentity(env.deps, { userId: ids.userA, internProfileId: ids.internA, purpose: "CLOCK_IN", token: forged, image: jpeg() })).outcome, "SESSION_REJECTED", "forged secret");
  assert.equal(parseCaptureToken("not-a-token"), null);
});

test("13. provider timeout, failure or missing configuration never bypasses verification", async () => {
  const slow = setup({ providerTimeoutMs: 50 }); await approvedReference(slow); slow.provider!.set({ delayMs: 500 });
  let result = await verify(slow); assert.equal(result.outcome, "PROVIDER_UNAVAILABLE"); assert.equal(result.disposition, "BLOCK"); assert.equal(slow.repo.attempts.at(-1)!.failureReason, "provider_timeout");
  const broken = setup(); await approvedReference(broken); broken.provider!.set({ throws: true });
  result = await verify(broken); assert.equal(result.disposition, "BLOCK");
  broken.provider!.set({ comparison: { kind: "error", reason: "provider_unreachable" } }); assert.equal((await verify(broken)).disposition, "BLOCK");
  const unconfigured = setup(); await approvedReference(unconfigured); unconfigured.deps.provider = null;
  assert.equal((await verify(unconfigured)).outcome, "PROVIDER_UNAVAILABLE");
  const unreadable = setup(); await approvedReference(unreadable); unreadable.store.failGet = true;
  assert.equal((await verify(unreadable)).outcome, "PROVIDER_UNAVAILABLE");
});

test("another intern's reference cannot be submitted or used", async () => {
  const env = setup(); await approvedReference(env, "A"); const otherReference = await approvedReference(env, "B");
  const result = await verify(env, "CLOCK_IN", { claimedReferenceId: otherReference });
  assert.equal(result.outcome, "SESSION_REJECTED"); assert.equal(result.disposition, "BLOCK"); assert.equal(env.repo.attempts.at(-1)!.failureReason, "foreign_reference");
  // An intern without their own approved reference cannot borrow someone else's.
  const loner = setup(); await approvedReference(loner, "B");
  assert.equal((await verify(loner)).outcome, "NO_APPROVED_REFERENCE");
});

test("16. client-supplied verification results cannot override the server decision", async () => {
  const form = new FormData(); form.set("captureToken", "t"); form.set("verified", "true"); form.set("identityVerified", "true"); form.set("outcome", "VERIFIED"); form.set("similarity", "1");
  assert.deepEqual(Object.keys(identitySubmission(form)).sort(), ["captureToken", "referenceId"], "only the capture token and an optional reference claim are read");
  const env = setup(); await approvedReference(env); env.provider!.set({ comparison: { kind: "scored", similarity: 0.1 } });
  const result = await verifyAttendanceIdentity(env.deps, { userId: ids.userA, internProfileId: ids.internA, purpose: "CLOCK_IN", token: await token(env.deps, "CLOCK_IN"), image: jpeg(), ...({ verified: true, outcome: "VERIFIED" } as object) });
  assert.equal(result.outcome, "FACE_MISMATCH");
});

test("every attempt is recorded for audit, including blocked ones", async () => {
  const env = setup(); await verify(env); await approvedReference(env); await verify(env);
  assert.deepEqual(env.repo.attempts.map((a) => a.outcome), ["NO_APPROVED_REFERENCE", "VERIFIED"]);
  assert(env.repo.attempts.every((a) => !("bytes" in a)), "no image bytes in attempt rows");
});

// ---- pure decision rules ----------------------------------------------------------------------------
test("decision table and dispositions", () => {
  const scored = (similarity: number) => ({ kind: "scored" as const, similarity });
  assert.equal(decideVerification({ liveness: { status: "NOT_CONFIGURED" }, comparison: scored(0.91), threshold: 0.9 }).outcome, "VERIFIED");
  assert.equal(decideVerification({ liveness: { status: "PASSED" }, comparison: scored(0.89), threshold: 0.9 }).outcome, "FACE_MISMATCH");
  assert.equal(decideVerification({ liveness: { status: "ERROR", reason: "x" }, comparison: scored(0.99), threshold: 0.9 }).outcome, "PROVIDER_UNAVAILABLE");
  assert.equal(decideVerification({ liveness: { status: "FAILED" }, comparison: scored(0.99), threshold: 0.9 }).outcome, "LIVENESS_FAILED");
  assert.equal(decideVerification({ liveness: { status: "PASSED" }, comparison: scored(Number.NaN), threshold: 0.9 }).outcome, "FACE_MISMATCH");
  assert.deepEqual(["VERIFIED", "FACE_MISMATCH", "LIVENESS_FAILED", "INCONCLUSIVE", "PROVIDER_UNAVAILABLE", "NO_APPROVED_REFERENCE", "SESSION_REJECTED"].map((o) => attendanceDisposition(o as never)),
    ["ACCEPT_VERIFIED", "ACCEPT_FLAGGED", "ACCEPT_FLAGGED", "ACCEPT_FLAGGED", "BLOCK", "BLOCK", "BLOCK"]);
});

test("unverified identity forces review with zero credited minutes; legacy (null) records are unchanged", () => {
  const clean = { clockInInside: true, clockOutInside: true, clockInAccuracy: 10, clockOutAccuracy: 10, hasClockInSelfie: true, hasClockOutSelfie: true, hasClockInLocation: true, hasClockOutLocation: true, clockOutPresent: true, workedMinutes: 480 };
  assert.deepEqual(finalAttendanceDecision({ ...clean, clockInIdentityVerified: true, clockOutIdentityVerified: true }), { reviewRequired: false, status: "APPROVED", creditedMinutes: 480 });
  assert.deepEqual(finalAttendanceDecision({ ...clean, clockInIdentityVerified: true, clockOutIdentityVerified: false }), { reviewRequired: true, status: "PENDING_REVIEW", creditedMinutes: 0 });
  assert.deepEqual(finalAttendanceDecision({ ...clean, clockInIdentityVerified: false, clockOutIdentityVerified: true }), { reviewRequired: true, status: "PENDING_REVIEW", creditedMinutes: 0 });
  assert.deepEqual(finalAttendanceDecision({ ...clean, clockInIdentityVerified: null, clockOutIdentityVerified: null }), { reviewRequired: false, status: "APPROVED", creditedMinutes: 480 });
  assert.deepEqual(getAttendanceExceptions({ ...clean, clockOutIdentityVerified: false }).map((e) => e.code), ["CLOCK_OUT_IDENTITY_UNVERIFIED"]);
  assert.equal(attendanceNeedsReview({ hasClockInSelfie: true, clockInIdentityVerified: false }), true);
});

// ---- provider adapter and encryption -----------------------------------------------------------------
test("CompreFace responses are interpreted conservatively", () => {
  assert.deepEqual(interpretVerifyResponse({ result: [{ face_matches: [{ similarity: 0.97 }] }] }), { kind: "scored", similarity: 0.97 });
  assert.equal(interpretVerifyResponse({ result: [{ face_matches: [{ similarity: 0.9 }, { similarity: 0.2 }] }] }).kind, "inconclusive");
  assert.equal(interpretVerifyResponse({ result: [{}, {}] }).kind, "inconclusive");
  assert.equal(interpretVerifyResponse({ result: [] }).kind, "inconclusive");
  assert.equal(interpretVerifyResponse({ result: [{ face_matches: [{}] }] }).kind, "error");
});

test("CompreFace HTTP failures map to errors, never matches", async () => {
  const image = { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" }; const signal = new AbortController().signal;
  const respond = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as typeof fetch;
  const run = (fetcher: typeof fetch) => new CompreFaceProvider("http://localhost:8000", "key", fetcher).compareFaces(image, image, signal);
  assert.deepEqual(await run(respond(400, { code: 28, message: "No face is found in the given image" })), { kind: "inconclusive", reason: "no_face" });
  assert.equal((await run(respond(401, {}))).kind, "error");
  assert.equal((await run(respond(503, {}))).kind, "error");
  assert.equal((await run((async () => { throw new TypeError("network"); }) as typeof fetch)).kind, "error");
  let sentKey: string | null = null;
  await run((async (_url: string, init?: RequestInit) => { sentKey = new Headers(init?.headers).get("x-api-key"); return new Response(JSON.stringify({ result: [{ face_matches: [{ similarity: 0.5 }] }] })); }) as unknown as typeof fetch);
  assert.equal(sentKey, "key");
  assert.equal((await new CompreFaceProvider("http://x", "k").checkLiveness()).status, "NOT_CONFIGURED");
});

test("configuration falls back safely and never enables a bypass", () => {
  const config = identityConfig({ COMPREFACE_URL: "javascript:alert(1)", IDENTITY_MATCH_THRESHOLD: "0.1", IDENTITY_REFERENCE_ENCRYPTION_KEY: "short" });
  assert.equal(config.comprefaceUrl, null); assert.equal(config.matchThreshold, 0.9); assert.equal(config.referenceEncryptionKey, null);
  assert.equal(identityConfig({ COMPREFACE_URL: "http://localhost:8000/" }).comprefaceUrl, "http://localhost:8000");
});

test("reference encryption is authenticated and bound to the storage path", () => {
  const key = randomBytes(32); const plain = new Uint8Array([9, 8, 7, 6, 5]);
  const sealed = encryptReference(key, "a/1.bin", plain);
  assert.deepEqual([...decryptReference(key, "a/1.bin", sealed)], [...plain]);
  assert.throws(() => decryptReference(key, "b/1.bin", sealed), "moved to another intern's path");
  assert.throws(() => decryptReference(randomBytes(32), "a/1.bin", sealed), "wrong key");
  const tampered = Uint8Array.from(sealed); tampered[tampered.length - 1] ^= 1; assert.throws(() => decryptReference(key, "a/1.bin", tampered), "tampered");
});

test("CompreFace enrollment quality check requires exactly one confidently detected face", async () => {
  assert.deepEqual(interpretQualityResponse({ result: [{ source_image_face: { box: { probability: 0.99 } }, face_matches: [{ similarity: 1 }] }] }), { kind: "clear" });
  assert.deepEqual(interpretQualityResponse({ result: [{ source_image_face: { box: { probability: 0.5 } }, face_matches: [{ similarity: 1 }] }] }), { kind: "unclear", reason: "low_confidence" });
  assert.deepEqual(interpretQualityResponse({ result: [{}, {}] }), { kind: "unclear", reason: "multiple_faces" });
  assert.deepEqual(interpretQualityResponse({ result: [] }), { kind: "unclear", reason: "no_face" });
  assert.equal(interpretQualityResponse({ result: [{ face_matches: [{ similarity: 1 }] }] }).kind, "error", "missing probability is never treated as clear");
  const image = { bytes: new Uint8Array([1, 2, 3]), mimeType: "image/jpeg" }; const signal = new AbortController().signal;
  let url = "";
  const provider = new CompreFaceProvider("http://localhost:8000", "key", (async (input: string) => { url = input; return new Response(JSON.stringify({ code: 28 }), { status: 400 }); }) as unknown as typeof fetch);
  assert.deepEqual(await provider.checkFaceQuality(image, signal), { kind: "unclear", reason: "no_face" });
  assert.match(url, /det_prob_threshold=0\.9/);
  assert.equal((await new CompreFaceProvider("http://localhost:8000", "key", (async () => new Response("{}", { status: 503 })) as unknown as typeof fetch).checkFaceQuality(image, signal)).kind, "error");
});

test("invited users set their password before face photo setup; there is no approval queue", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const read = (path: string) => readFileSync(path, "utf8");
  const onboarding = read("src/app/onboarding/page.tsx"), actions = read("src/app/identity/actions.ts"), layout = read("src/app/(authenticated)/layout.tsx");
  assert.match(layout, /passwordChangeRequired\) redirect\("\/account\/set-password"\)/, "authenticated pages send invited users to set their password");
  const guard = onboarding.indexOf('redirect("/account/set-password")');
  assert(guard > 0 && guard < onboarding.indexOf("getInternOnboarding(user.id)") && guard < onboarding.indexOf("identityReferenceState(user.id)"), "onboarding checks the password before loading the face photo step");
  assert.equal(actions.match(/passwordChangeRequired\) return/g)?.length, 2, "capture and submission both refuse until the password is set");
  assert.match(onboarding, /id="face-photo"/); assert.match(onboarding, /<IdentityEnrollment/);
  assert.equal(existsSync("src/app/(authenticated)/identity/review/page.tsx"), false, "Supervisor approval queue removed");
  assert.doesNotMatch(actions + read("src/app/(authenticated)/reviews/page.tsx"), /approveIdentityReference|Identity photos/);
});

test("release switch: identity verification is on only when explicitly set to \"true\"", async () => {
  const { identityVerificationEnabled } = await import("../src/lib/identity/config.ts");
  assert.equal(identityVerificationEnabled({}), false, "default off");
  for (const value of ["false", "", "1", "TRUE", "yes"]) assert.equal(identityVerificationEnabled({ IDENTITY_VERIFICATION_ENABLED: value }), false, value);
  assert.equal(identityVerificationEnabled({ IDENTITY_VERIFICATION_ENABLED: "true" }), true);
  assert.equal(identityVerificationEnabled({ IDENTITY_VERIFICATION_ENABLED: " true " }), true);
  const { readFileSync } = await import("node:fs");
  const transactions = readFileSync("src/lib/attendance/transactions.ts", "utf8");
  assert(transactions.includes("deps.identityEnabled === false ? null : await verifyAttendanceIdentity"), "Time In/Out skip the face check when off");
  assert(readFileSync("src/app/attendance/actions.ts", "utf8").includes("identityEnabled: identityVerificationEnabled()"));
});
