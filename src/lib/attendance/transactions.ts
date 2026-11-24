// SERVER-ONLY MODULE — never export these from a "use server" file: they trust
// the caller-provided, already-authenticated intern context.
// Time In / Time Out transaction rules (REQ-FR-ATT-1/2/3/5, DEC-2026-019).
// Extracted unchanged from the attendance server actions so the same code is
// exercised by integration tests with an injected database client.
import { randomUUID } from "node:crypto";
import { attendanceNeedsReview, calculateWorkedMinutes, canClockIn, canClockOut, classifyAttendance, finalAttendanceDecision, localDate, localDateValue, type Coordinates } from "@/lib/attendance/domain";
import { evidencePath } from "@/lib/attendance/storage";
import { linkAttemptToAttendance, verifyAttendanceIdentity, type IdentityDeps } from "@/lib/identity/service";
import type { Prisma } from "@/generated/prisma/client";

export type AttendanceResult = { success: boolean; message: string; attendanceId?: string };
export type AttendanceContext = {
  userId: string;
  internProfileId: string;
  assignment: { id: string; startDate: Date; endDate: Date; scheduleStartTime: Date | null; scheduleEndTime: Date | null; gracePeriodMinutes: number; company: { timezone: string } };
  location: { latitude: unknown; longitude: unknown; geofenceRadiusMeters: number };
};
export type AttendanceEvidence = { coordinates: Coordinates; file: File; remarks: string | null };
/** Identity fields read from the submitted form. Anything else (e.g. a client `verified` flag) is ignored. */
export type IdentitySubmission = { captureToken: unknown; referenceId?: unknown };
export type AttendanceDeps = {
  db: Prisma.TransactionClient;
  identity: IdentityDeps;
  evidence: { upload(path: string, file: File): Promise<void>; remove(path: string): Promise<unknown> };
  now?: () => Date;
  /** DEC-2026-019 release switch; `false` skips face verification (attendance as before). Defaults to enabled. */
  identityEnabled?: boolean;
};

export function identitySubmission(formData: FormData): IdentitySubmission {
  return { captureToken: formData.get("captureToken"), referenceId: formData.get("referenceId") ?? undefined };
}

export async function recordClockIn(deps: AttendanceDeps, context: AttendanceContext, evidence: AttendanceEvidence, submission: IdentitySubmission): Promise<AttendanceResult> {
  const now = (deps.now ?? (() => new Date()))(); const dateText = localDateValue(now, context.assignment.company.timezone);
  if (dateText < dateOnly(context.assignment.startDate) || dateText > dateOnly(context.assignment.endDate)) return failure("Your active internship is outside its valid date range.");
  const duplicate = await deps.db.attendance.findUnique({ where: { assignmentId_attendanceDate: { assignmentId: context.assignment.id, attendanceDate: localDate(now, context.assignment.company.timezone) } }, select: { id: true } });
  if (!canClockIn(Boolean(duplicate))) return failure("Attendance has already been recorded for today.");
  // DEC-2026-019: server-side identity verification against the approved reference. Fail closed.
  // When the release switch is off, no face check runs and the flag stays null (no identity exception).
  const identity = deps.identityEnabled === false ? null : await verifyAttendanceIdentity(deps.identity, { userId: context.userId, internProfileId: context.internProfileId, purpose: "CLOCK_IN", token: submission.captureToken, image: await identityImage(evidence.file), claimedReferenceId: submission.referenceId });
  if (identity?.disposition === "BLOCK") return failure(identity.message);
  const clockInIdentityVerified = identity ? identity.disposition === "ACCEPT_VERIFIED" : null;
  const attendanceId = randomUUID(); const path = evidencePath(context.assignment.id, attendanceId, "clock-in", evidence.file.type);
  const distance = distanceFor(context.location, evidence.coordinates);
  const inside = distance <= context.location.geofenceRadiusMeters;
  const reviewRequired = attendanceNeedsReview({ clockInInside: inside, clockInAccuracy: evidence.coordinates.accuracy, hasClockInSelfie: true, clockInIdentityVerified });
  try { await deps.evidence.upload(path, evidence.file); } catch { return failure("The Time In selfie could not be stored. Try again."); }
  try {
    await deps.db.attendance.create({ data: {
      id: attendanceId, assignmentId: context.assignment.id, attendanceDate: localDate(now, context.assignment.company.timezone), clockIn: now,
      clockInLatitude: evidence.coordinates.latitude, clockInLongitude: evidence.coordinates.longitude, clockInAccuracyMeters: evidence.coordinates.accuracy,
      clockInDistanceMeters: distance, clockInInsideGeofence: inside, clockInSelfiePath: path,
      classification: classifyAttendance({ clockIn: now, scheduleStart: context.assignment.scheduleStartTime, scheduleEnd: context.assignment.scheduleEndTime, graceMinutes: context.assignment.gracePeriodMinutes, timezone: context.assignment.company.timezone }),
      status: "CLOCKED_IN", reviewRequired, clockInIdentityVerified, internRemarks: evidence.remarks,
    } });
  } catch { await deps.evidence.remove(path); return failure("Time In could not be recorded. Attendance may already exist for today."); }
  if (identity) await linkAttemptToAttendance(deps.identity, identity.attemptId, attendanceId);
  if (!identity) return { success: true, attendanceId, message: reviewRequired ? "Time In recorded. The evidence will require review after Time Out." : "Time In recorded." };
  return { success: true, attendanceId, message: !clockInIdentityVerified ? `Time In recorded. ${identity.message}` : reviewRequired ? "Time In recorded. Identity confirmed. The evidence will require review after Time Out." : "Time In recorded. Identity confirmed." };
}

export async function recordClockOut(deps: AttendanceDeps, context: AttendanceContext, evidence: AttendanceEvidence, submission: IdentitySubmission): Promise<AttendanceResult> {
  const now = (deps.now ?? (() => new Date()))(); const today = localDate(now, context.assignment.company.timezone);
  const attendance = await deps.db.attendance.findUnique({ where: { assignmentId_attendanceDate: { assignmentId: context.assignment.id, attendanceDate: today } } });
  if (!attendance || !canClockOut(attendance)) return failure(attendance?.clockOut ? "Time Out has already been recorded." : "No open Time In exists for today.");
  const identity = deps.identityEnabled === false ? null : await verifyAttendanceIdentity(deps.identity, { userId: context.userId, internProfileId: context.internProfileId, purpose: "CLOCK_OUT", token: submission.captureToken, image: await identityImage(evidence.file), claimedReferenceId: submission.referenceId });
  if (identity?.disposition === "BLOCK") return failure(identity.message);
  const clockOutIdentityVerified = identity ? identity.disposition === "ACCEPT_VERIFIED" : null;
  const path = evidencePath(context.assignment.id, attendance.id, "clock-out", evidence.file.type);
  const distance = distanceFor(context.location, evidence.coordinates); const inside = distance <= context.location.geofenceRadiusMeters;
  const workedMinutes = calculateWorkedMinutes(attendance.clockIn!, now);
  const decision = finalAttendanceDecision({ clockInInside: attendance.clockInInsideGeofence, clockOutInside: inside, clockInAccuracy: attendance.clockInAccuracyMeters === null ? null : Number(attendance.clockInAccuracyMeters), clockOutAccuracy: evidence.coordinates.accuracy, hasClockInLocation: attendance.clockInLatitude !== null && attendance.clockInLongitude !== null, hasClockOutLocation: true, hasClockInSelfie: Boolean(attendance.clockInSelfiePath), hasClockOutSelfie: true, clockOutPresent: true, workedMinutes, clockInIdentityVerified: attendance.clockInIdentityVerified, clockOutIdentityVerified });
  try { await deps.evidence.upload(path, evidence.file); } catch { return failure("The Time Out selfie could not be stored. Try again."); }
  try {
    const updated = await deps.db.attendance.updateMany({ where: { id: attendance.id, clockOut: null, status: "CLOCKED_IN" }, data: {
      clockOut: now, clockOutLatitude: evidence.coordinates.latitude, clockOutLongitude: evidence.coordinates.longitude, clockOutAccuracyMeters: evidence.coordinates.accuracy,
      clockOutDistanceMeters: distance, clockOutInsideGeofence: inside, clockOutSelfiePath: path, workedMinutes, creditedMinutes: decision.creditedMinutes,
      classification: classifyAttendance({ clockIn: attendance.clockIn!, clockOut: now, scheduleStart: context.assignment.scheduleStartTime, scheduleEnd: context.assignment.scheduleEndTime, graceMinutes: context.assignment.gracePeriodMinutes, timezone: context.assignment.company.timezone }),
      status: decision.status, reviewRequired: decision.reviewRequired, clockOutIdentityVerified, ...(evidence.remarks ? { internRemarks: evidence.remarks } : {}),
    } });
    if (updated.count !== 1) throw new Error("concurrent update");
  } catch { await deps.evidence.remove(path); return failure("Time Out could not be recorded. Refresh and review today's attendance."); }
  if (identity) await linkAttemptToAttendance(deps.identity, identity.attemptId, attendance.id);
  if (!identity) return { success: true, attendanceId: attendance.id, message: decision.reviewRequired ? "Attendance recorded. A supervisor will review the flagged evidence before the rendered hours are approved." : "Attendance recorded successfully." };
  return { success: true, attendanceId: attendance.id, message: !clockOutIdentityVerified ? `Time Out recorded. ${identity.message}` : decision.reviewRequired ? "Attendance recorded. A supervisor will review the flagged evidence before the rendered hours are approved." : "Attendance recorded successfully. Your hours rendered have been approved." };
}

function distanceFor(branch: { latitude: unknown; longitude: unknown }, device: { latitude: number; longitude: number }) { const lat = Number(branch.latitude); const lon = Number(branch.longitude); const radians = (x: number) => x * Math.PI / 180; const dLat = radians(device.latitude - lat); const dLon = radians(device.longitude - lon); const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat)) * Math.cos(radians(device.latitude)) * Math.sin(dLon / 2) ** 2; return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)); }
async function identityImage(file: File) { return { bytes: new Uint8Array(await file.arrayBuffer()), mimeType: file.type, size: file.size }; }
function failure(message: string): AttendanceResult { return { success: false, message }; }
function dateOnly(value: Date) { return value.toISOString().slice(0, 10); }
