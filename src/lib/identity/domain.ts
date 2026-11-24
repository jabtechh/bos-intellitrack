// DEC-2026-019 / REQ-FR-ATT-5 — pure identity verification rules.
// Every decision here is computed on the server from provider results and
// stored rows. Nothing submitted by the client can set an outcome.
import { createHash, timingSafeEqual } from "node:crypto";
import type { FaceComparison, LivenessCheck } from "@/lib/identity/provider";

export type CapturePurpose = "ENROLLMENT" | "CLOCK_IN" | "CLOCK_OUT";
export type VerificationOutcome = "VERIFIED" | "FACE_MISMATCH" | "LIVENESS_FAILED" | "INCONCLUSIVE" | "PROVIDER_UNAVAILABLE" | "NO_APPROVED_REFERENCE" | "SESSION_REJECTED";
export type LivenessResult = "PASSED" | "FAILED" | "INCONCLUSIVE" | "NOT_CONFIGURED" | "ERROR";
export type FaceMatchResult = "MATCH" | "NO_MATCH" | "INCONCLUSIVE" | "ERROR" | "NOT_RUN";
export type AttendanceDisposition = "ACCEPT_VERIFIED" | "ACCEPT_FLAGGED" | "BLOCK";

export const MAX_IDENTITY_IMAGE_BYTES = 5 * 1024 * 1024;
export const IDENTITY_IMAGE_TYPES = ["image/jpeg"] as const;

export function validateIdentityImage(file: { size: number; type: string } | null): string | null {
  if (!file || file.size === 0) return "A live camera selfie is required.";
  if (!(IDENTITY_IMAGE_TYPES as readonly string[]).includes(file.type)) return "Capture the selfie with the in-app camera.";
  if (file.size > MAX_IDENTITY_IMAGE_BYTES) return "The selfie is too large. Retake it with the in-app camera.";
  return null;
}

export function decideVerification(input: { liveness: LivenessCheck; comparison: FaceComparison; threshold: number }): {
  outcome: VerificationOutcome; liveness: LivenessResult; faceMatch: FaceMatchResult; similarity: number | null; failureReason: string | null;
} {
  const liveness = input.liveness.status;
  const similarity = input.comparison.kind === "scored" ? clampSimilarity(input.comparison.similarity) : null;
  const faceMatch: FaceMatchResult = input.comparison.kind === "error" ? "ERROR"
    : input.comparison.kind === "inconclusive" ? "INCONCLUSIVE"
    : similarity !== null && similarity >= input.threshold ? "MATCH" : "NO_MATCH";
  const base = { liveness, faceMatch, similarity };
  if (liveness === "ERROR") return { ...base, outcome: "PROVIDER_UNAVAILABLE", failureReason: input.liveness.status === "ERROR" ? input.liveness.reason : "liveness_error" };
  if (faceMatch === "ERROR") return { ...base, outcome: "PROVIDER_UNAVAILABLE", failureReason: input.comparison.kind === "error" ? input.comparison.reason : "match_error" };
  if (liveness === "FAILED") return { ...base, outcome: "LIVENESS_FAILED", failureReason: "liveness_failed" };
  if (liveness === "INCONCLUSIVE") return { ...base, outcome: "INCONCLUSIVE", failureReason: "liveness_inconclusive" };
  if (faceMatch === "INCONCLUSIVE") return { ...base, outcome: "INCONCLUSIVE", failureReason: input.comparison.kind === "inconclusive" ? input.comparison.reason : "match_inconclusive" };
  if (faceMatch === "NO_MATCH") return { ...base, outcome: "FACE_MISMATCH", failureReason: "below_threshold" };
  // MATCH with liveness PASSED or NOT_CONFIGURED. NOT_CONFIGURED is recorded and never presented as a liveness pass.
  return { ...base, outcome: "VERIFIED", failureReason: null };
}

function clampSimilarity(value: number) { return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0; }

/** Verified → normal attendance rules; doubtful → recorded but flagged for Supervisor review (0 credit); otherwise blocked. */
export function attendanceDisposition(outcome: VerificationOutcome): AttendanceDisposition {
  if (outcome === "VERIFIED") return "ACCEPT_VERIFIED";
  if (outcome === "FACE_MISMATCH" || outcome === "LIVENESS_FAILED" || outcome === "INCONCLUSIVE") return "ACCEPT_FLAGGED";
  return "BLOCK";
}

export function outcomeMessage(outcome: VerificationOutcome, reason: string | null): string {
  switch (outcome) {
    case "VERIFIED": return "Identity confirmed.";
    case "FACE_MISMATCH": return "Your selfie did not match your face photo. Your Supervisor will review this attendance before any hours are credited.";
    case "LIVENESS_FAILED": return "The live capture check did not pass. Your Supervisor will review this attendance before any hours are credited.";
    case "INCONCLUSIVE": return "We couldn't confirm your identity from this selfie. Your Supervisor will review this attendance before any hours are credited. Next time, face the camera in good light with only you in frame.";
    case "PROVIDER_UNAVAILABLE": return "Identity verification is temporarily unavailable, so attendance was not recorded. Try again in a few minutes or tell your Supervisor.";
    case "NO_APPROVED_REFERENCE": return "Set up your face photo in Getting started before recording attendance.";
    case "SESSION_REJECTED":
      return reason === "expired" ? "This camera capture expired. Retake your selfie and submit again."
        : reason === "replayed" ? "This camera capture was already used. Retake your selfie and submit again."
        : reason === "invalid_image" ? "The selfie could not be read. Retake it with the in-app camera."
        : "This selfie capture is not valid for your account. Retake your selfie and submit again.";
  }
}

// ---- single-use capture sessions -------------------------------------------------

export type CaptureSessionRow = { id: string; userId: string; purpose: CapturePurpose; secretHash: string; expiresAt: Date; consumedAt: Date | null };
export type SessionRejection = "malformed" | "unknown" | "foreign" | "wrong_purpose" | "replayed" | "expired" | "invalid_secret";

export function hashSecret(secret: string) { return createHash("sha256").update(secret, "utf8").digest("hex"); }

export function parseCaptureToken(token: unknown): { id: string; secret: string } | null {
  if (typeof token !== "string" || token.length > 200) return null;
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{32,100})$/.exec(token);
  return match ? { id: match[1], secret: match[2] } : null;
}

export function validateCaptureSession(session: CaptureSessionRow | null, expected: { userId: string; purpose: CapturePurpose; secret: string; now: Date }): SessionRejection | null {
  if (!session) return "unknown";
  if (session.userId !== expected.userId) return "foreign";
  if (session.purpose !== expected.purpose) return "wrong_purpose";
  if (!secretMatches(session.secretHash, expected.secret)) return "invalid_secret";
  if (session.consumedAt) return "replayed";
  if (session.expiresAt.getTime() <= expected.now.getTime()) return "expired";
  return null;
}

function secretMatches(storedHash: string, secret: string) {
  const actual = Buffer.from(hashSecret(secret), "hex"); const stored = Buffer.from(storedHash, "hex");
  return actual.length === stored.length && timingSafeEqual(actual, stored);
}

// ---- reference authorization -------------------------------------------------------

export type ReferenceDecisionActor = { userId: string; role: string };
export type ReferenceDecisionScope = { internUserId: string; assignedSupervisorUserIds: string[] };

/** Only the intern's directly assigned Company Supervisor may view the face photo or reset it. */
export function canResetReference(actor: ReferenceDecisionActor, scope: ReferenceDecisionScope): boolean {
  return actor.role === "SUPERVISOR" && actor.userId !== scope.internUserId && scope.assignedSupervisorUserIds.includes(actor.userId);
}

export function canEnrollReference(actor: { role: string; internProfileId: string | null }, targetInternProfileId: string): boolean {
  return actor.role === "INTERN" && actor.internProfileId !== null && actor.internProfileId === targetInternProfileId;
}

// ---- enrollment messages (DEC-2026-019 amendment: automatic save) ---------------------

export type EnrollmentFailure = "no_face" | "multiple_faces" | "low_confidence" | "mismatch" | "unavailable" | "reference_unreadable";

export function enrollmentMessage(reason: EnrollmentFailure | string): string {
  switch (reason) {
    case "no_face": return "We couldn't find a clear face in this photo. Face the camera in good light and retake it.";
    case "multiple_faces": return "More than one face was found. Make sure only you are in the frame and retake the photo.";
    case "low_confidence": return "Your face isn't clear enough. Remove sunglasses or a mask, move into better light and retake the photo.";
    case "mismatch": return "This photo doesn't match your current face photo, so it was not saved. If your appearance has changed, ask your Company Supervisor to reset your face photo, then set it up again.";
    case "reference_unreadable": return "Your current face photo could not be read. Ask your Company Supervisor to reset it, then set it up again.";
    default: return "The face check is temporarily unavailable, so your photo was not saved. Try again in a few minutes.";
  }
}

export function referenceStoragePath(internProfileId: string, referenceId: string) { return `${internProfileId}/${referenceId}.bin`; }
