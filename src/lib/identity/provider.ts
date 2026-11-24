// DEC-2026-019 — provider abstraction for liveness, face matching and enrollment photo quality.
// Implementations: CompreFace (real, self-hosted) and a deterministic mock
// used only by automated tests. Providers return raw results; the threshold
// and the attendance decision are applied server-side in ./domain.ts.

export type IdentityImage = { bytes: Uint8Array; mimeType: string };

export type LivenessCheck =
  | { status: "PASSED" | "FAILED" | "INCONCLUSIVE"; providerReference?: string }
  | { status: "NOT_CONFIGURED" }
  | { status: "ERROR"; reason: string };

export type FaceComparison =
  | { kind: "scored"; similarity: number; providerReference?: string }
  | { kind: "inconclusive"; reason: string }
  | { kind: "error"; reason: string };

/** Enrollment photo check: exactly one clearly detected face. */
export type FaceQuality =
  | { kind: "clear" }
  | { kind: "unclear"; reason: "no_face" | "multiple_faces" | "low_confidence" }
  | { kind: "error"; reason: string };

export interface FaceVerificationProvider {
  readonly name: string;
  /** False when no liveness capability is configured. Liveness must then never be claimed. */
  readonly livenessSupported: boolean;
  checkLiveness(probe: IdentityImage, signal: AbortSignal): Promise<LivenessCheck>;
  compareFaces(reference: IdentityImage, probe: IdentityImage, signal: AbortSignal): Promise<FaceComparison>;
  /** Used before a face photo is saved automatically (DEC-2026-019 amendment). */
  checkFaceQuality(image: IdentityImage, signal: AbortSignal): Promise<FaceQuality>;
}

/** Runs a provider call with a hard timeout. Timeouts and thrown errors become ERROR results, never success. */
export async function withTimeout<T>(timeoutMs: number, onError: (reason: string) => T, call: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => { controller.abort(); resolve(onError("provider_timeout")); }, timeoutMs);
  });
  try {
    return await Promise.race([call(controller.signal).catch(() => onError("provider_error")), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
