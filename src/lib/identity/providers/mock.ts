// Deterministic test double. It does not compare faces and proves nothing about
// biometric accuracy. It is only constructed by automated tests; the runtime
// provider factory never returns it.
import type { FaceComparison, FaceQuality, FaceVerificationProvider, LivenessCheck } from "@/lib/identity/provider";

export type MockScript = { liveness?: LivenessCheck; comparison?: FaceComparison; quality?: FaceQuality; delayMs?: number; throws?: boolean };

export class MockFaceProvider implements FaceVerificationProvider {
  readonly name = "mock";
  calls = { liveness: 0, compare: 0, quality: 0 };
  constructor(private script: MockScript = {}, readonly livenessSupported = false) {}
  set(script: MockScript) { this.script = script; }
  async checkLiveness(): Promise<LivenessCheck> {
    this.calls.liveness += 1; await this.wait();
    return this.script.liveness ?? (this.livenessSupported ? { status: "PASSED" } : { status: "NOT_CONFIGURED" });
  }
  async compareFaces(): Promise<FaceComparison> {
    this.calls.compare += 1; await this.wait();
    return this.script.comparison ?? { kind: "scored", similarity: 0.99 };
  }
  async checkFaceQuality(): Promise<FaceQuality> {
    this.calls.quality += 1; await this.wait();
    return this.script.quality ?? { kind: "clear" };
  }
  private async wait() {
    if (this.script.delayMs) await new Promise((resolve) => setTimeout(resolve, this.script.delayMs));
    if (this.script.throws) throw new Error("mock provider failure");
  }
}
