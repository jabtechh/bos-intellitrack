"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { attendanceNeedsReview, calculateWorkedMinutes, canClockIn, canClockOut, classifyAttendance, coordinatesSchema, finalAttendanceDecision, localDate, localDateValue, validateSelfie } from "@/lib/attendance/domain";
import { evidencePath, removeEvidence, uploadEvidence } from "@/lib/attendance/storage";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";

export type AttendanceActionState = { success: boolean; message: string };

export async function clockIn(_state: AttendanceActionState, formData: FormData): Promise<AttendanceActionState> {
  const context = await activeInternContext(); if (!context.ok) return context.error;
  const evidence = parseEvidence(formData); if (!evidence.ok) return evidence.error;
  const now = new Date(); const dateText = localDateValue(now, context.assignment.company.timezone);
  if (dateText < dateOnly(context.assignment.startDate) || dateText > dateOnly(context.assignment.endDate)) return failure("Your active internship is outside its valid date range.");
  const duplicate = await prisma.attendance.findUnique({ where: { assignmentId_attendanceDate: { assignmentId: context.assignment.id, attendanceDate: localDate(now, context.assignment.company.timezone) } }, select: { id: true } });
  if (!canClockIn(Boolean(duplicate))) return failure("Attendance has already been recorded for today.");
  const attendanceId = randomUUID(); const path = evidencePath(context.assignment.id, attendanceId, "clock-in", evidence.file.type);
  const distance = distanceFor(context.assignment.company, evidence.coordinates);
  const inside = distance <= context.assignment.company.geofenceRadiusMeters;
  const reviewRequired = attendanceNeedsReview({ clockInInside: inside, clockInAccuracy: evidence.coordinates.accuracy, hasClockInSelfie: true });
  try { await uploadEvidence(path, evidence.file); } catch { return failure("The clock-in selfie could not be stored. Try again."); }
  try {
    await prisma.attendance.create({ data: {
      id: attendanceId, assignmentId: context.assignment.id, attendanceDate: localDate(now, context.assignment.company.timezone), clockIn: now,
      clockInLatitude: evidence.coordinates.latitude, clockInLongitude: evidence.coordinates.longitude, clockInAccuracyMeters: evidence.coordinates.accuracy,
      clockInDistanceMeters: distance, clockInInsideGeofence: inside, clockInSelfiePath: path,
      classification: classifyAttendance({ clockIn: now, scheduleStart: context.assignment.scheduleStartTime, scheduleEnd: context.assignment.scheduleEndTime, graceMinutes: context.assignment.gracePeriodMinutes, timezone: context.assignment.company.timezone }),
      status: "CLOCKED_IN", reviewRequired, internRemarks: evidence.remarks,
    } });
  } catch { await removeEvidence(path); return failure("Clock-in could not be recorded. Attendance may already exist for today."); }
  revalidateAttendance(); return { success: true, message: reviewRequired ? "Clock-in recorded. The evidence will require review after clock-out." : "Clock-in recorded successfully." };
}

export async function clockOut(_state: AttendanceActionState, formData: FormData): Promise<AttendanceActionState> {
  const context = await activeInternContext(); if (!context.ok) return context.error;
  const evidence = parseEvidence(formData); if (!evidence.ok) return evidence.error;
  const now = new Date(); const today = localDate(now, context.assignment.company.timezone);
  const attendance = await prisma.attendance.findUnique({ where: { assignmentId_attendanceDate: { assignmentId: context.assignment.id, attendanceDate: today } } });
  if (!canClockOut(attendance)) return failure(attendance?.clockOut ? "Clock-out has already been recorded." : "No open clock-in exists for today.");
  const path = evidencePath(context.assignment.id, attendance!.id, "clock-out", evidence.file.type);
  const distance = distanceFor(context.assignment.company, evidence.coordinates); const inside = distance <= context.assignment.company.geofenceRadiusMeters;
  const workedMinutes = calculateWorkedMinutes(attendance!.clockIn!, now);
  const decision = finalAttendanceDecision({ clockInInside: attendance!.clockInInsideGeofence, clockOutInside: inside, clockInAccuracy: attendance!.clockInAccuracyMeters===null?null:Number(attendance!.clockInAccuracyMeters), clockOutAccuracy: evidence.coordinates.accuracy, hasClockInLocation:attendance!.clockInLatitude!==null&&attendance!.clockInLongitude!==null,hasClockOutLocation:true,hasClockInSelfie: Boolean(attendance!.clockInSelfiePath), hasClockOutSelfie: true,clockOutPresent:true, workedMinutes });
  try { await uploadEvidence(path, evidence.file); } catch { return failure("The clock-out selfie could not be stored. Try again."); }
  try {
    const updated = await prisma.attendance.updateMany({ where: { id: attendance!.id, clockOut: null, status: "CLOCKED_IN" }, data: {
      clockOut: now, clockOutLatitude: evidence.coordinates.latitude, clockOutLongitude: evidence.coordinates.longitude, clockOutAccuracyMeters: evidence.coordinates.accuracy,
      clockOutDistanceMeters: distance, clockOutInsideGeofence: inside, clockOutSelfiePath: path, workedMinutes, creditedMinutes: decision.creditedMinutes,
      classification: classifyAttendance({ clockIn: attendance!.clockIn!, clockOut: now, scheduleStart: context.assignment.scheduleStartTime, scheduleEnd: context.assignment.scheduleEndTime, graceMinutes: context.assignment.gracePeriodMinutes, timezone: context.assignment.company.timezone }),
      status: decision.status, reviewRequired: decision.reviewRequired, ...(evidence.remarks ? { internRemarks: evidence.remarks } : {}),
    } });
    if (updated.count !== 1) throw new Error("concurrent update");
  } catch { await removeEvidence(path); return failure("Clock-out could not be recorded. Refresh and review today's attendance."); }
  revalidateAttendance(); return { success: true, message: decision.reviewRequired ? "Attendance recorded. A supervisor will review the flagged evidence before your rendered time is credited." : "Attendance recorded successfully. Your rendered time has been credited." };
}

async function activeInternContext() {
  const user = await requireCurrentUser(); if (user.role !== "INTERN") return { ok: false as const, error: failure("Only active interns can capture attendance.") };
  const profile = await prisma.internProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!profile) return { ok: false as const, error: failure("Your intern profile is not available.") };
  const assignment = await prisma.internshipAssignment.findFirst({ where: { internProfileId: profile.id, status: "ACTIVE" }, include: { company: true } });
  if (!assignment) return { ok: false as const, error: failure("No active internship is available.") };
  if (assignment.requiredHours === null) return { ok: false as const, error: failure("Complete required-hours onboarding before recording attendance.") };
  if (!assignment.company.isActive) return { ok: false as const, error: failure("Bo’s Coffee Main Office is not currently available for attendance.") };
  return { ok: true as const, user, assignment };
}
function parseEvidence(formData: FormData) {
  const coordinates = coordinatesSchema.safeParse({ latitude: formData.get("latitude"), longitude: formData.get("longitude"), accuracy: formData.get("accuracy") });
  if (!coordinates.success) return { ok: false as const, error: failure("Valid GPS coordinates and accuracy are required.") };
  const file = formData.get("selfie"); const selfie = file instanceof File ? file : null; const selfieError = validateSelfie(selfie);
  if (selfieError || !selfie) return { ok: false as const, error: failure(selfieError ?? "A selfie is required.") };
  const rawRemarks = formData.get("remarks"); const remarks = typeof rawRemarks === "string" && rawRemarks.trim() ? rawRemarks.trim().slice(0, 2000) : null;
  return { ok: true as const, coordinates: coordinates.data, file: selfie, remarks };
}
function distanceFor(branch: { latitude: unknown; longitude: unknown }, device: { latitude: number; longitude: number }) { const lat = Number(branch.latitude); const lon = Number(branch.longitude); const radians=(x:number)=>x*Math.PI/180; const dLat=radians(device.latitude-lat); const dLon=radians(device.longitude-lon); const h=Math.sin(dLat/2)**2+Math.cos(radians(lat))*Math.cos(radians(device.latitude))*Math.sin(dLon/2)**2; return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)); }
function failure(message: string): AttendanceActionState { return { success: false, message }; }
function dateOnly(value: Date) { return value.toISOString().slice(0, 10); }
function revalidateAttendance() { revalidatePath("/attendance"); revalidatePath("/attendance/history"); revalidatePath("/attendance/review"); revalidatePath("/dashboard"); }
