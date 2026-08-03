import { z } from "zod";

export const MAX_SELFIE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_SELFIE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const DEFAULT_GPS_ACCURACY_METERS = 100;

export const coordinatesSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().min(0, "GPS accuracy cannot be negative."),
});

export type Coordinates = z.infer<typeof coordinatesSchema>;

export function validateSelfie(file: { size: number; type: string } | null): string | null {
  if (!file || file.size === 0) return "A selfie is required.";
  if (!(ALLOWED_SELFIE_TYPES as readonly string[]).includes(file.type)) return "Use a JPEG, PNG, or WebP selfie.";
  if (file.size > MAX_SELFIE_BYTES) return "The selfie must be 10 MB or smaller.";
  return null;
}

export function haversineDistanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  coordinatesSchema.pick({ latitude: true, longitude: true }).parse(a);
  coordinatesSchema.pick({ latitude: true, longitude: true }).parse(b);
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude); const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude); const lat2 = radians(b.latitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function isInsideGeofence(distanceMeters: number, radiusMeters: number): boolean { return distanceMeters >= 0 && radiusMeters >= 0 && distanceMeters <= radiusMeters; }
export function isGpsAccurate(accuracyMeters: number, threshold = DEFAULT_GPS_ACCURACY_METERS): boolean { return accuracyMeters >= 0 && accuracyMeters <= threshold; }

export function localDateValue(timestamp: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(timestamp);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function localDate(timestamp: Date, timezone: string): Date { return new Date(`${localDateValue(timestamp, timezone)}T00:00:00.000Z`); }
export function calculateWorkedMinutes(clockIn: Date, clockOut: Date): number { return Math.max(0, Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000)); }

function localMinutes(timestamp: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(timestamp);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(value.hour) * 60 + Number(value.minute);
}
function scheduleMinutes(value: Date | null): number | null { return value ? value.getUTCHours() * 60 + value.getUTCMinutes() : null; }

export function classifyAttendance(input: { clockIn: Date; clockOut?: Date | null; scheduleStart: Date | null; scheduleEnd: Date | null; graceMinutes: number; timezone: string }) {
  const scheduledStart = scheduleMinutes(input.scheduleStart); const scheduledEnd = scheduleMinutes(input.scheduleEnd);
  if (scheduledStart === null || scheduledEnd === null) return "UNDETERMINED" as const;
  const late = localMinutes(input.clockIn, input.timezone) > scheduledStart + input.graceMinutes;
  const early = input.clockOut ? localMinutes(input.clockOut, input.timezone) < scheduledEnd : false;
  if (late && early) return "LATE_AND_EARLY_DEPARTURE" as const;
  if (late) return "LATE" as const;
  if (early) return "EARLY_DEPARTURE" as const;
  return "ON_TIME" as const;
}

export function attendanceNeedsReview(input: { clockInInside: boolean; clockOutInside?: boolean; clockInAccuracy: number; clockOutAccuracy?: number; hasClockInSelfie: boolean; hasClockOutSelfie?: boolean; workedMinutes?: number }, threshold = DEFAULT_GPS_ACCURACY_METERS): boolean {
  if (!input.clockInInside || !isGpsAccurate(input.clockInAccuracy, threshold) || !input.hasClockInSelfie) return true;
  if (input.clockOutInside === undefined) return false;
  return !input.clockOutInside || input.clockOutAccuracy === undefined || !isGpsAccurate(input.clockOutAccuracy, threshold) || !input.hasClockOutSelfie || input.workedMinutes === undefined || input.workedMinutes <= 0 || input.workedMinutes > 16 * 60;
}

export function finalAttendanceDecision(input: Parameters<typeof attendanceNeedsReview>[0], threshold = DEFAULT_GPS_ACCURACY_METERS) {
  const reviewRequired = attendanceNeedsReview(input, threshold);
  return { reviewRequired, status: reviewRequired ? "PENDING_REVIEW" as const : "APPROVED" as const, creditedMinutes: reviewRequired ? 0 : input.workedMinutes ?? 0 };
}

export function canClockIn(hasDailyRecord: boolean) { return !hasDailyRecord; }
export function canClockOut(record: { clockIn: Date | null; clockOut: Date | null } | null) { return Boolean(record?.clockIn && !record.clockOut); }

export type ReviewerScope = { role: "INTERN" | "SUPERVISOR" | "COORDINATOR" | "REPRESENTATIVE" | "ADMIN"; userId: string; supervisorUserId: string; representativeUserIds: string[] };
export function canReviewAttendance(scope: ReviewerScope): boolean { return scope.role === "ADMIN" || (scope.role === "SUPERVISOR" && scope.userId === scope.supervisorUserId) || (scope.role === "REPRESENTATIVE" && scope.representativeUserIds.includes(scope.userId)); }
export function ownsAttendance(internUserId: string, currentUserId: string): boolean { return internUserId === currentUserId; }
export function rejectionRemarksValid(value: unknown): boolean { return typeof value === "string" && value.trim().length > 0; }
