// DEC-2026-019 / REQ-FR-ATT-5 — identity verification configuration.
// Missing or invalid configuration never enables a bypass: the provider is
// reported as unavailable and attendance actions fail closed.

export const IDENTITY_CONSENT_VERSION = "2026-11-24";
export const IDENTITY_BUCKET = "identity-references";
/** Where an intern sets up or updates the face photo (inside Getting started). */
export const IDENTITY_SETUP_HREF = "/onboarding#face-photo";

export type IdentityConfig = {
  comprefaceUrl: string | null;
  comprefaceApiKey: string | null;
  /** CompreFace similarity (0–1) required to accept a match. Calibrate per model. */
  matchThreshold: number;
  captureTtlSeconds: number;
  providerTimeoutMs: number;
  /** base64-encoded 32-byte AES-256-GCM key for reference images at rest. */
  referenceEncryptionKey: Buffer | null;
};

export function identityConfig(env: Record<string, string | undefined> = process.env): IdentityConfig {
  return {
    comprefaceUrl: httpUrl(env.COMPREFACE_URL),
    comprefaceApiKey: env.COMPREFACE_VERIFICATION_API_KEY?.trim() || null,
    matchThreshold: bounded(env.IDENTITY_MATCH_THRESHOLD, 0.9, 0.5, 0.999),
    captureTtlSeconds: Math.trunc(bounded(env.IDENTITY_CAPTURE_TTL_SECONDS, 180, 30, 600)),
    providerTimeoutMs: Math.trunc(bounded(env.IDENTITY_PROVIDER_TIMEOUT_MS, 10_000, 1_000, 30_000)),
    referenceEncryptionKey: encryptionKey(env.IDENTITY_REFERENCE_ENCRYPTION_KEY),
  };
}

function bounded(raw: string | undefined, fallback: number, min: number, max: number) {
  const value = Number(raw);
  return raw !== undefined && raw.trim() !== "" && Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

function httpUrl(raw: string | undefined) {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin + url.pathname.replace(/\/+$/, "") : null;
  } catch { return null; }
}

function encryptionKey(raw: string | undefined) {
  if (!raw?.trim()) return null;
  const key = Buffer.from(raw.trim(), "base64");
  return key.length === 32 ? key : null;
}
/**
 * DEC-2026-019 release switch. Identity (face) verification runs only when IDENTITY_VERIFICATION_ENABLED is
 * exactly "true". Off (the default, and Production until CompreFace, the encryption key, the private bucket and
 * privacy sign-off are in place): attendance works as before (selfie evidence only, no face matching), and the
 * face photo setup is hidden.
 */
export function identityVerificationEnabled(env: Record<string, string | undefined> = process.env) {
  return env.IDENTITY_VERIFICATION_ENABLED?.trim() === "true";
}
