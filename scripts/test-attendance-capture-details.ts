import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifyFaces } from "../src/app/attendance/evidence-capture";

const read = (path: string) => readFileSync(path, "utf8");
const capture = read("src/app/attendance/evidence-capture.tsx");
const attendance = read("src/app/(authenticated)/attendance/page.tsx");
const dashboard = read("src/components/dashboard-attendance-card.tsx");
const history = read("src/app/(authenticated)/attendance/history/page.tsx");
const detail = read("src/app/(authenticated)/attendance/[attendanceId]/page.tsx");
const reviewer = read("src/app/(authenticated)/attendance/review/[attendanceId]/page.tsx");
const map = read("src/components/location-evidence-map.tsx");
const detector = read("src/lib/attendance/browser-face-detector.ts");

test("face classification requires one large centered face", () => {
  assert.equal(classifyFaces([], 1000, 1000), "no-face");
  assert.equal(classifyFaces([{ boundingBox: { x: 300, y: 250, width: 400, height: 450 }, confidence: .9 }, { boundingBox: { x: 10, y: 10, width: 250, height: 250 }, confidence: .8 }], 1000, 1000), "multiple");
  assert.equal(classifyFaces([{ boundingBox: { x: 460, y: 460, width: 100, height: 100 }, confidence: .9 }], 1000, 1000), "too-small");
  assert.equal(classifyFaces([{ boundingBox: { x: 0, y: 300, width: 300, height: 350 }, confidence: .9 }], 1000, 1000), "off-center");
  assert.equal(classifyFaces([{ boundingBox: { x: 300, y: 250, width: 400, height: 450 }, confidence: .9 }], 1000, 1000), "valid");
  assert.equal(classifyFaces([{ boundingBox: { x: 300, y: 250, width: 400, height: 450 }, confidence: .4 }], 1000, 1000), "no-face");
});

test("location and live camera capture are automatic and recoverable", () => {
  assert.match(capture, /getCurrentPosition/);
  assert.match(capture, /setTimeout\(checkLocation,\s*0\)/);
  assert.match(capture, /Retry location/);
  assert.match(capture, /getUserMedia/);
  assert.match(capture, /facingMode:\s*"user"/);
  assert.match(capture, /NotAllowedError/);
  assert.match(capture, /NotFoundError/);
  assert.match(capture, /NotReadableError/);
  assert.doesNotMatch(capture, /type="file"/);
});

test("selfie capture supports preview retake confirmation and cleanup", () => {
  assert.match(capture, /toBlob/);
  assert.match(capture, /new File/);
  assert.match(capture, /Captured selfie preview/);
  assert.match(capture, /Retake/);
  assert.match(capture, /Use this photo/);
  assert.match(capture, /getTracks\(\)\.forEach\(track\s*=>\s*track\.stop\(\)\)/);
  assert.match(capture, /URL\.revokeObjectURL/);
});

test("capture reuses existing authoritative Time In and Time Out actions", () => {
  assert.match(attendance, /import \{ clockIn, clockOut \}/);
  assert.match(attendance, /action=\{clockIn\} label="Time in"/);
  assert.match(attendance, /action=\{clockOut\} label="Time out"/);
  assert.doesNotMatch(capture, /prisma|haversine|geofence/i);
});

test("dashboard and history use Philippine attendance presentation", () => {
  for (const phrase of ["Time in", "Time out", "Time rendered today", "Hours rendered", "Timed in"]) assert.match(dashboard + history, new RegExp(phrase, "i"));
  assert.match(dashboard, /attendance-details-link/);
  assert.match(history, /DataToolbar/);
  assert.match(history, /name="status"/);
  assert.match(history, /name="date"/);
  assert.match(history, /name="perPage"/);
  assert.match(history, /Attendance pagination/);
  assert.match(history, /MobileRecordCard/);
});

test("authorized detail views provide compact human evidence presentation", () => {
  for (const source of [detail, reviewer]) {
    assert.match(source, /EvidenceThumbnail/);
    assert.match(source, /LocationEvidenceMap/);
    assert.match(source, /Needs review/);
    assert.match(source, /Within attendance area|Outside attendance area/);
  }
  assert.match(detail, /Technical location details/);
  assert.match(detail, /correction-history/);
  assert.match(map, /Location evidence relative to Main Office/);
  assert.doesNotMatch(map, /latitude\}|longitude\}/);
});

test("face detection makes no identity or liveness claim", () => {
  assert.match(detector, /@mediapipe\/tasks-vision/);
  assert.match(detector, /detectForVideo/);
  assert.doesNotMatch(capture, /window[^\n]*FaceDetector|Shape Detection|Face detection is not supported/);
  assert.match(capture, /Preparing selfie verification/);
  assert.match(capture, /Selfie verification couldn't start/);
  assert.match(capture, />Retry</);
  assert.match(capture, /setTimeout\(check,200\)/);
  assert.match(capture, /detectionActive/);
  assert.match(capture, /detectorRef\.current\?\.close/);
  assert.doesNotMatch(capture + detector, /identity|recognition|embedding|liveness|anti-spoof/i);
});
