import type { FaceDetector as MediaPipeFaceDetector } from "@mediapipe/tasks-vision";

export type BrowserDetectedFace = { boundingBox: { x: number; y: number; width: number; height: number }; confidence: number };
export type BrowserFaceDetector = { detect(video: HTMLVideoElement, timestamp: number): BrowserDetectedFace[]; close(): void };
const WASM_ROOT = "/mediapipe/wasm", MODEL_PATH = "/models/blaze_face_short_range.tflite";

export async function createBrowserFaceDetector(): Promise<BrowserFaceDetector> {
  const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
  let detector: MediaPipeFaceDetector;
  try { detector = await FaceDetector.createFromOptions(vision, options("GPU")); }
  catch { detector = await FaceDetector.createFromOptions(vision, options("CPU")); }
  return {
    detect(video, timestamp) { return detector.detectForVideo(video, timestamp).detections.map(detection => ({ boundingBox: { x: detection.boundingBox?.originX ?? 0, y: detection.boundingBox?.originY ?? 0, width: detection.boundingBox?.width ?? 0, height: detection.boundingBox?.height ?? 0 }, confidence: detection.categories[0]?.score ?? 0 })); },
    close() { detector.close(); },
  };
}
function options(delegate: "GPU" | "CPU") { return { baseOptions: { modelAssetPath: MODEL_PATH, delegate }, runningMode: "VIDEO" as const, minDetectionConfidence: .6, minSuppressionThreshold: .3 }; }
