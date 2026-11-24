// CompreFace (Exadel, Apache-2.0) self-hosted face verification adapter.
// API: POST {base}/api/v1/verification/verify with `source_image` and
// `target_image`; header `x-api-key` is a Verification-service key.
// Liveness is NOT provided by this adapter and is reported as NOT_CONFIGURED.
// No request or response payload is logged.
import type { FaceComparison, FaceQuality, FaceVerificationProvider, IdentityImage, LivenessCheck } from "@/lib/identity/provider";

type FaceBox = { probability?: number };
type VerifyResponse = { result?: Array<{ source_image_face?: { box?: FaceBox }; face_matches?: Array<{ similarity?: number; box?: FaceBox }> }> };
type VerifyCall = { kind: "body"; body: VerifyResponse | null } | { kind: "no_face" } | { kind: "error"; reason: string };

/** Minimum face-detection confidence for an enrollment photo to count as "clear". */
export const CLEAR_FACE_DETECTION_PROBABILITY = 0.9;

export class CompreFaceProvider implements FaceVerificationProvider {
  readonly name = "compreface";
  readonly livenessSupported = false;
  constructor(private readonly baseUrl: string, private readonly apiKey: string, private readonly fetcher: typeof fetch = fetch) {}

  async checkLiveness(): Promise<LivenessCheck> { return { status: "NOT_CONFIGURED" }; }

  async compareFaces(reference: IdentityImage, probe: IdentityImage, signal: AbortSignal): Promise<FaceComparison> {
    const call = await this.verify(reference, probe, signal);
    if (call.kind === "error") return call;
    if (call.kind === "no_face") return { kind: "inconclusive", reason: "no_face" };
    return interpretVerifyResponse(call.body);
  }

  /** Detects faces by verifying the photo against itself, using only faces detected with high confidence. */
  async checkFaceQuality(image: IdentityImage, signal: AbortSignal): Promise<FaceQuality> {
    const call = await this.verify(image, image, signal, `&det_prob_threshold=${CLEAR_FACE_DETECTION_PROBABILITY}`);
    if (call.kind === "error") return call;
    if (call.kind === "no_face") return { kind: "unclear", reason: "no_face" };
    return interpretQualityResponse(call.body);
  }

  private async verify(source: IdentityImage, target: IdentityImage, signal: AbortSignal, extraQuery = ""): Promise<VerifyCall> {
    const form = new FormData();
    form.set("source_image", new Blob([Buffer.from(source.bytes)], { type: source.mimeType }), "source.jpg");
    form.set("target_image", new Blob([Buffer.from(target.bytes)], { type: target.mimeType }), "target.jpg");
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/api/v1/verification/verify?status=false${extraQuery}`, { method: "POST", headers: { "x-api-key": this.apiKey }, body: form, signal, cache: "no-store" });
    } catch { return { kind: "error", reason: "provider_unreachable" }; }
    if (response.status === 401 || response.status === 403) return { kind: "error", reason: "provider_auth" };
    if (response.status >= 500) return { kind: "error", reason: "provider_server_error" };
    let body: (VerifyResponse & { code?: number }) | null = null;
    try { body = await response.json() as VerifyResponse & { code?: number }; } catch { return { kind: "error", reason: "provider_bad_response" }; }
    // CompreFace code 28 = "No face is found in the given image".
    if (response.status === 400) return body?.code === 28 ? { kind: "no_face" } : { kind: "error", reason: "provider_rejected_request" };
    if (!response.ok) return { kind: "error", reason: "provider_http_error" };
    return { kind: "body", body };
  }
}

export function interpretVerifyResponse(body: VerifyResponse | null): FaceComparison {
  const sources = body?.result;
  if (!Array.isArray(sources) || sources.length === 0) return { kind: "inconclusive", reason: "no_face" };
  if (sources.length > 1) return { kind: "inconclusive", reason: "multiple_reference_faces" };
  const matches = sources[0].face_matches;
  if (!Array.isArray(matches) || matches.length === 0) return { kind: "inconclusive", reason: "no_face" };
  if (matches.length > 1) return { kind: "inconclusive", reason: "multiple_faces" };
  const similarity = matches[0].similarity;
  return typeof similarity === "number" && Number.isFinite(similarity) ? { kind: "scored", similarity } : { kind: "error", reason: "provider_bad_response" };
}

export function interpretQualityResponse(body: VerifyResponse | null): FaceQuality {
  const sources = body?.result;
  if (!Array.isArray(sources) || sources.length === 0) return { kind: "unclear", reason: "no_face" };
  if (sources.length > 1) return { kind: "unclear", reason: "multiple_faces" };
  const matches = sources[0].face_matches;
  if (Array.isArray(matches) && matches.length > 1) return { kind: "unclear", reason: "multiple_faces" };
  const probability = sources[0].source_image_face?.box?.probability;
  if (typeof probability !== "number" || !Number.isFinite(probability)) return { kind: "error", reason: "provider_bad_response" };
  return probability >= CLEAR_FACE_DETECTION_PROBABILITY ? { kind: "clear" } : { kind: "unclear", reason: "low_confidence" };
}
