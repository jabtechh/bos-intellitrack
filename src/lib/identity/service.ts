// DEC-2026-019 / REQ-FR-ATT-5 — face photo enrollment (saved automatically after a
// clear-face check; updates must match the current photo), Supervisor reset, and
// attendance verification workflow. Dependencies are injected so the same code runs with
// Prisma/Supabase in the app and with in-memory doubles in tests.
import { randomBytes, randomUUID } from "node:crypto";
import { IDENTITY_CONSENT_VERSION, type IdentityConfig } from "@/lib/identity/config";
import {
  attendanceDisposition, canEnrollReference, canResetReference, decideVerification, enrollmentMessage, hashSecret, outcomeMessage, parseCaptureToken,
  referenceStoragePath, validateCaptureSession, validateIdentityImage,
  type AttendanceDisposition, type CapturePurpose, type CaptureSessionRow, type FaceMatchResult, type LivenessResult, type VerificationOutcome,
} from "@/lib/identity/domain";
import { decryptReference, encryptReference } from "@/lib/identity/encryption";
import { withTimeout, type FaceComparison, type FaceQuality, type FaceVerificationProvider, type IdentityImage, type LivenessCheck } from "@/lib/identity/provider";

export type ReferenceStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUPERSEDED";
export type ReferenceRow = { id: string; internProfileId: string; status: ReferenceStatus; storagePath: string; replacesId: string | null };
export type ReferenceEventRow = { referenceId: string; internProfileId: string; actorUserId: string | null; action: "ENROLLED" | "REPLACEMENT_REQUESTED" | "APPROVED" | "REJECTED" | "SUPERSEDED"; remarks: string | null };
export type AttemptRow = {
  internProfileId: string; sessionId: string | null; referenceId: string | null; attendanceId: string | null; purpose: CapturePurpose; outcome: VerificationOutcome;
  liveness: LivenessResult; faceMatch: FaceMatchResult; similarity: number | null; threshold: number | null; provider: string; providerReference: string | null; failureReason: string | null;
};

export interface IdentityRepository {
  createSession(row: CaptureSessionRow & { createdAt: Date }): Promise<void>;
  findSession(id: string): Promise<CaptureSessionRow | null>;
  /** Atomically marks an unconsumed, unexpired session consumed. Returns false if another request won. */
  consumeSession(id: string, now: Date): Promise<boolean>;
  findReferences(internProfileId: string, statuses: ReferenceStatus[]): Promise<ReferenceRow[]>;
  findReferenceScope(referenceId: string): Promise<{ reference: ReferenceRow; internUserId: string; assignedSupervisorUserIds: string[] } | null>;
  /**
   * Transaction: if the intern's current APPROVED reference is still `expectedCurrentId` (null = none),
   * mark it SUPERSEDED and create `reference` as APPROVED with no human approver (automatic).
   * Returns ok=false when another change won the race.
   */
  activateReference(input: { reference: ReferenceRow & { consentVersion: string; consentedAt: Date }; expectedCurrentId: string | null; enrolledByUserId: string; now: Date; remarks: string }): Promise<{ ok: boolean; supersededPaths: string[] }>;
  /** APPROVED → REJECTED by the assigned Supervisor (reset). False if it is no longer APPROVED. */
  revokeReference(input: { referenceId: string; actorUserId: string; now: Date; remarks: string }): Promise<boolean>;
  recordAttempt(row: AttemptRow): Promise<string>;
  linkAttempt(attemptId: string, attendanceId: string): Promise<void>;
}

export interface ReferenceImageStore {
  put(path: string, bytes: Uint8Array): Promise<void>;
  get(path: string): Promise<Uint8Array>;
  remove(path: string): Promise<void>;
}

export type IdentityDeps = {
  repo: IdentityRepository;
  store: ReferenceImageStore;
  /** null when the provider is not configured; verification then fails closed. */
  provider: FaceVerificationProvider | null;
  config: IdentityConfig;
  now?: () => Date;
};

export type UploadedImage = { bytes: Uint8Array; mimeType: string; size: number };
type Failure = { ok: false; message: string };

const clock = (deps: IdentityDeps) => (deps.now ?? (() => new Date()))();

// ---- capture sessions ---------------------------------------------------------------

export async function issueCaptureSession(deps: IdentityDeps, input: { userId: string; role: string; purpose: CapturePurpose }): Promise<{ ok: true; token: string; expiresAt: Date } | Failure> {
  if (input.role !== "INTERN") return { ok: false, message: "Only interns can start an identity capture." };
  const now = clock(deps); const id = randomUUID(); const secret = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + deps.config.captureTtlSeconds * 1000);
  await deps.repo.createSession({ id, userId: input.userId, purpose: input.purpose, secretHash: hashSecret(secret), expiresAt, consumedAt: null, createdAt: now });
  return { ok: true, token: `${id}.${secret}`, expiresAt };
}

async function consumeCaptureSession(deps: IdentityDeps, token: unknown, userId: string, purpose: CapturePurpose): Promise<{ ok: true; sessionId: string } | { ok: false; sessionId: string | null; reason: string }> {
  const parsed = parseCaptureToken(token);
  if (!parsed) return { ok: false, sessionId: null, reason: "malformed" };
  const now = clock(deps);
  const session = await deps.repo.findSession(parsed.id);
  const rejection = validateCaptureSession(session, { userId, purpose, secret: parsed.secret, now });
  // Only link the attempt to a session the caller actually owns.
  const ownedId = session && session.userId === userId ? session.id : null;
  if (rejection) return { ok: false, sessionId: ownedId, reason: rejection };
  if (!(await deps.repo.consumeSession(parsed.id, now))) return { ok: false, sessionId: ownedId, reason: "replayed" };
  return { ok: true, sessionId: parsed.id };
}

// ---- enrollment (automatic, DEC-2026-019 amendment) -----------------------------------

export async function enrollReference(deps: IdentityDeps, input: {
  actor: { userId: string; role: string; internProfileId: string | null }; internProfileId: string; token: unknown; image: UploadedImage | null; consent: boolean;
}): Promise<{ ok: true; referenceId: string; replacement: boolean } | Failure> {
  if (!canEnrollReference(input.actor, input.internProfileId)) return { ok: false, message: "You can only set up your own face photo." };
  if (!input.consent) return { ok: false, message: "Read and accept the face photo consent before continuing." };
  const imageError = validateIdentityImage(input.image ? { size: input.image.size, type: input.image.mimeType } : null);
  if (imageError || !input.image) return { ok: false, message: imageError ?? "A live camera selfie is required." };
  const key = deps.config.referenceEncryptionKey; const provider = deps.provider;
  // Fail closed: a photo is never saved without the face check.
  if (!key || !provider) return { ok: false, message: "Face photo setup is not available yet. Try again later or tell your Company Supervisor." };
  const session = await consumeCaptureSession(deps, input.token, input.actor.userId, "ENROLLMENT");
  if (!session.ok) return { ok: false, message: outcomeMessage("SESSION_REJECTED", session.reason === "expired" || session.reason === "replayed" ? session.reason : null) };

  const probe: IdentityImage = { bytes: input.image.bytes, mimeType: input.image.mimeType };
  const timeoutMs = deps.config.providerTimeoutMs;
  const record = (row: Partial<AttemptRow> & Pick<AttemptRow, "outcome">) => deps.repo.recordAttempt({
    internProfileId: input.internProfileId, sessionId: session.sessionId, referenceId: null, attendanceId: null, purpose: "ENROLLMENT", liveness: "NOT_CONFIGURED",
    faceMatch: "NOT_RUN", similarity: null, threshold: null, provider: provider.name, providerReference: null, failureReason: null, ...row,
  });

  // 1. The photo must show exactly one clearly detected face.
  const quality = await withTimeout<FaceQuality>(timeoutMs, (reason) => ({ kind: "error", reason }), (signal) => provider.checkFaceQuality(probe, signal));
  if (quality.kind === "error") { await record({ outcome: "PROVIDER_UNAVAILABLE", failureReason: quality.reason }); return { ok: false, message: enrollmentMessage("unavailable") }; }
  if (quality.kind === "unclear") { await record({ outcome: "INCONCLUSIVE", failureReason: quality.reason }); return { ok: false, message: enrollmentMessage(quality.reason) }; }

  // 2. An update must show the same person as the current face photo.
  const [current] = await deps.repo.findReferences(input.internProfileId, ["APPROVED"]);
  let remarks = "Automatic: one clear face detected.";
  if (current) {
    let currentImage: IdentityImage;
    try { currentImage = { bytes: decryptReference(key, current.storagePath, await deps.store.get(current.storagePath)), mimeType: "image/jpeg" }; }
    catch { await record({ outcome: "PROVIDER_UNAVAILABLE", referenceId: current.id, failureReason: "reference_unreadable" }); return { ok: false, message: enrollmentMessage("reference_unreadable") }; }
    const comparison = await withTimeout<FaceComparison>(timeoutMs, (reason) => ({ kind: "error", reason }), (signal) => provider.compareFaces(currentImage, probe, signal));
    const decision = decideVerification({ liveness: { status: "NOT_CONFIGURED" }, comparison, threshold: deps.config.matchThreshold });
    const attempt = { referenceId: current.id, faceMatch: decision.faceMatch, similarity: decision.similarity, threshold: deps.config.matchThreshold, failureReason: decision.failureReason };
    await record({ ...attempt, outcome: decision.outcome });
    if (decision.outcome !== "VERIFIED") {
      return { ok: false, message: enrollmentMessage(decision.outcome === "FACE_MISMATCH" ? "mismatch" : decision.outcome === "INCONCLUSIVE" ? "no_face" : "unavailable") };
    }
    remarks = "Automatic: one clear face detected and matched the previous face photo.";
  }

  // 3. Store encrypted, then activate atomically.
  const referenceId = randomUUID(); const storagePath = referenceStoragePath(input.internProfileId, referenceId); const now = clock(deps);
  try { await deps.store.put(storagePath, encryptReference(key, storagePath, input.image.bytes)); }
  catch { return { ok: false, message: "Your face photo could not be stored securely. Try again." }; }
  const result = await deps.repo.activateReference({
    reference: { id: referenceId, internProfileId: input.internProfileId, status: "APPROVED", storagePath, replacesId: current?.id ?? null, consentVersion: IDENTITY_CONSENT_VERSION, consentedAt: now },
    expectedCurrentId: current?.id ?? null, enrolledByUserId: input.actor.userId, now, remarks,
  }).catch(() => ({ ok: false, supersededPaths: [] as string[] }));
  if (!result.ok) {
    await deps.store.remove(storagePath).catch(() => undefined);
    return { ok: false, message: "Your face photo changed while this one was being saved. Refresh the page and try again." };
  }
  for (const path of result.supersededPaths) await deps.store.remove(path).catch(() => undefined); // data minimisation; audit rows remain.
  return { ok: true, referenceId, replacement: Boolean(current) };
}

// ---- Supervisor reset -------------------------------------------------------------------

export async function resetReference(deps: IdentityDeps, input: { actor: { userId: string; role: string }; referenceId: string; remarks: string | null }): Promise<{ ok: true } | Failure> {
  const scope = await deps.repo.findReferenceScope(input.referenceId);
  if (!scope || !canResetReference(input.actor, scope)) return { ok: false, message: "This face photo is unavailable or outside your review scope." };
  if (scope.reference.status !== "APPROVED") return { ok: false, message: "This face photo is no longer active." };
  const remarks = input.remarks?.trim().slice(0, 2000) || null;
  if (!remarks) return { ok: false, message: "Explain why the face photo is being reset so the intern knows what to fix." };
  if (!(await deps.repo.revokeReference({ referenceId: input.referenceId, actorUserId: input.actor.userId, now: clock(deps), remarks }))) return { ok: false, message: "This face photo is no longer active." };
  await deps.store.remove(scope.reference.storagePath).catch(() => undefined); // data minimisation; the audit row remains.
  return { ok: true };
}

export async function readReferenceImage(deps: IdentityDeps, input: { actor: { userId: string; role: string }; referenceId: string }): Promise<IdentityImage | null> {
  const scope = await deps.repo.findReferenceScope(input.referenceId);
  if (!scope || !deps.config.referenceEncryptionKey) return null;
  const allowed = input.actor.userId === scope.internUserId || canResetReference(input.actor, scope);
  if (!allowed || scope.reference.status !== "APPROVED") return null;
  try { return { bytes: decryptReference(deps.config.referenceEncryptionKey, scope.reference.storagePath, await deps.store.get(scope.reference.storagePath)), mimeType: "image/jpeg" }; }
  catch { return null; }
}

// ---- attendance verification ------------------------------------------------------------

export type AttendanceIdentityResult = { outcome: VerificationOutcome; disposition: AttendanceDisposition; message: string; attemptId: string };

export async function verifyAttendanceIdentity(deps: IdentityDeps, input: {
  userId: string; internProfileId: string; purpose: "CLOCK_IN" | "CLOCK_OUT"; token: unknown; image: UploadedImage | null; claimedReferenceId?: unknown;
}): Promise<AttendanceIdentityResult> {
  const providerName = deps.provider?.name ?? "unconfigured";
  const record = async (row: Partial<AttemptRow> & Pick<AttemptRow, "outcome">): Promise<AttendanceIdentityResult> => {
    const attempt: AttemptRow = { internProfileId: input.internProfileId, sessionId: null, referenceId: null, attendanceId: null, purpose: input.purpose, liveness: "NOT_CONFIGURED", faceMatch: "NOT_RUN", similarity: null, threshold: null, provider: providerName, providerReference: null, failureReason: null, ...row };
    const attemptId = await deps.repo.recordAttempt(attempt);
    return { outcome: attempt.outcome, disposition: attendanceDisposition(attempt.outcome), message: outcomeMessage(attempt.outcome, attempt.failureReason), attemptId };
  };

  const session = await consumeCaptureSession(deps, input.token, input.userId, input.purpose);
  if (!session.ok) return record({ outcome: "SESSION_REJECTED", sessionId: session.sessionId, failureReason: session.reason });

  const imageError = validateIdentityImage(input.image ? { size: input.image.size, type: input.image.mimeType } : null);
  if (imageError || !input.image) return record({ outcome: "SESSION_REJECTED", sessionId: session.sessionId, failureReason: "invalid_image" });

  const [reference] = await deps.repo.findReferences(input.internProfileId, ["APPROVED"]);
  if (!reference || reference.internProfileId !== input.internProfileId) return record({ outcome: "NO_APPROVED_REFERENCE", sessionId: session.sessionId, failureReason: "no_approved_reference" });
  // A client can never choose the reference. Any reference other than this intern's approved one is rejected.
  if (input.claimedReferenceId !== undefined && input.claimedReferenceId !== null && input.claimedReferenceId !== "" && input.claimedReferenceId !== reference.id) {
    return record({ outcome: "SESSION_REJECTED", sessionId: session.sessionId, referenceId: reference.id, failureReason: "foreign_reference" });
  }

  const key = deps.config.referenceEncryptionKey;
  if (!deps.provider || !key) return record({ outcome: "PROVIDER_UNAVAILABLE", sessionId: session.sessionId, referenceId: reference.id, failureReason: "provider_not_configured" });
  let referenceImage: IdentityImage;
  try { referenceImage = { bytes: decryptReference(key, reference.storagePath, await deps.store.get(reference.storagePath)), mimeType: "image/jpeg" }; }
  catch { return record({ outcome: "PROVIDER_UNAVAILABLE", sessionId: session.sessionId, referenceId: reference.id, failureReason: "reference_unreadable" }); }

  const provider = deps.provider; const probe: IdentityImage = { bytes: input.image.bytes, mimeType: input.image.mimeType };
  const timeoutMs = deps.config.providerTimeoutMs;
  const liveness = await withTimeout<LivenessCheck>(timeoutMs, (reason) => ({ status: "ERROR", reason }), (signal) => provider.checkLiveness(probe, signal));
  const comparison = liveness.status === "ERROR" ? { kind: "error" as const, reason: "skipped_after_liveness_error" }
    : await withTimeout<FaceComparison>(timeoutMs, (reason) => ({ kind: "error", reason }), (signal) => provider.compareFaces(referenceImage, probe, signal));
  const decision = decideVerification({ liveness, comparison, threshold: deps.config.matchThreshold });
  const providerReference = comparison.kind === "scored" ? comparison.providerReference ?? null : null;
  return record({
    outcome: decision.outcome, sessionId: session.sessionId, referenceId: reference.id, liveness: decision.liveness, faceMatch: decision.faceMatch,
    similarity: decision.similarity, threshold: deps.config.matchThreshold, providerReference, failureReason: decision.failureReason,
  });
}

export async function linkAttemptToAttendance(deps: IdentityDeps, attemptId: string, attendanceId: string) {
  await deps.repo.linkAttempt(attemptId, attendanceId).catch(() => undefined);
}
