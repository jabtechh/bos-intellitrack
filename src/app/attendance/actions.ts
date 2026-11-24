"use server";
import { assignmentBranch } from "@/lib/branches/compatibility";
import { internshipAssignmentBaseSelect } from "@/lib/assignments/projection";


import { resolveAttendanceLocation } from "@/lib/branches/domain";
import { revalidatePath } from "next/cache";

import { coordinatesSchema, validateSelfie } from "@/lib/attendance/domain";
import { removeEvidence, uploadEvidence } from "@/lib/attendance/storage";
import { identitySubmission, recordClockIn, recordClockOut, type AttendanceDeps } from "@/lib/attendance/transactions";
import { identityVerificationEnabled } from "@/lib/identity/config";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";
import { identityDeps } from "@/lib/identity/runtime";

export type AttendanceActionState = { success: boolean; message: string };

export async function clockIn(_state: AttendanceActionState, formData: FormData): Promise<AttendanceActionState> {
  const context = await activeInternContext(); if (!context.ok) return context.error;
  const evidence = parseEvidence(formData); if (!evidence.ok) return evidence.error;
  const result = await recordClockIn(runtimeDeps(), { userId: context.user.id, internProfileId: context.internProfileId, assignment: context.assignment, location: context.location }, evidence, identitySubmission(formData));
  if (result.success) revalidateAttendance();
  return { success: result.success, message: result.message };
}

export async function clockOut(_state: AttendanceActionState, formData: FormData): Promise<AttendanceActionState> {
  const context = await activeInternContext(); if (!context.ok) return context.error;
  const evidence = parseEvidence(formData); if (!evidence.ok) return evidence.error;
  const result = await recordClockOut(runtimeDeps(), { userId: context.user.id, internProfileId: context.internProfileId, assignment: context.assignment, location: context.location }, evidence, identitySubmission(formData));
  if (result.success) revalidateAttendance();
  return { success: result.success, message: result.message };
}

function runtimeDeps(): AttendanceDeps {
  return { db: prisma, identity: identityDeps(), evidence: { upload: uploadEvidence, remove: removeEvidence }, identityEnabled: identityVerificationEnabled() };
}

async function activeInternContext() {
  const user = await requireCurrentUser(); if (user.role !== "INTERN") return { ok: false as const, error: failure("Only active interns can capture attendance.") };
  const profile = await prisma.internProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!profile) return { ok: false as const, error: failure("Your intern profile is not available.") };
  const assignment = await prisma.internshipAssignment.findFirst({ where: { internProfileId: profile.id, status: "ACTIVE" }, select: { ...internshipAssignmentBaseSelect,  company: true } });
  if (!assignment) return { ok: false as const, error: failure("No active internship is available.") };
  if (assignment.requiredHours === null) return { ok: false as const, error: failure("Complete required-hours onboarding before recording attendance.") };
  if (!assignment.company.isActive) return { ok: false as const, error: failure("Bo’s Coffee Main Office is not currently available for attendance.") };
  return { ok: true as const, user, internProfileId: profile.id, assignment, location: resolveAttendanceLocation({ ...assignment, branch: await assignmentBranch(assignment.id) }) };
}
function parseEvidence(formData: FormData) {
  const coordinates = coordinatesSchema.safeParse({ latitude: formData.get("latitude"), longitude: formData.get("longitude"), accuracy: formData.get("accuracy") });
  if (!coordinates.success) return { ok: false as const, error: failure("Valid GPS coordinates and accuracy are required.") };
  const file = formData.get("selfie"); const selfie = file instanceof File ? file : null; const selfieError = validateSelfie(selfie);
  if (selfieError || !selfie) return { ok: false as const, error: failure(selfieError ?? "A selfie is required.") };
  const rawRemarks = formData.get("remarks"); const remarks = typeof rawRemarks === "string" && rawRemarks.trim() ? rawRemarks.trim().slice(0, 2000) : null;
  return { ok: true as const, coordinates: coordinates.data, file: selfie, remarks };
}
function failure(message: string): AttendanceActionState { return { success: false, message }; }
function revalidateAttendance() { revalidatePath("/attendance"); revalidatePath("/attendance/history"); revalidatePath("/attendance/review"); revalidatePath("/dashboard"); }
