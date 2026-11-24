"use server";
// DEC-2026-019 / REQ-FR-ATT-5 — face photo setup (automatic) and Supervisor reset.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccountSetupState } from "@/lib/auth/account-setup";
import { identityVerificationEnabled } from "@/lib/identity/config";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import type { CapturePurpose } from "@/lib/identity/domain";
import { identityDeps } from "@/lib/identity/runtime";
import { enrollReference, issueCaptureSession, resetReference } from "@/lib/identity/service";
import { prisma } from "@/lib/prisma";

export type IdentityActionState = { success: boolean; message: string };
export type CaptureSessionResult = { ok: true; token: string; expiresAt: string } | { ok: false; message: string };

const purposeSchema = z.enum(["ENROLLMENT", "CLOCK_IN", "CLOCK_OUT"]);
const PASSWORD_FIRST = "Set your new password first, then set up your face photo.";
const DISABLED = "Face photo verification is not enabled.";

/** Issues a short-lived, single-use capture session when the live camera starts. */
export async function startIdentityCapture(purpose: CapturePurpose): Promise<CaptureSessionResult> {
  const user = await requireCurrentUser();
  if (!identityVerificationEnabled()) return { ok: false, message: DISABLED };
  if ((await getAccountSetupState()).passwordChangeRequired) return { ok: false, message: PASSWORD_FIRST };
  const parsed = purposeSchema.safeParse(purpose);
  if (!parsed.success) return { ok: false, message: "This capture type is not supported." };
  const result = await issueCaptureSession(identityDeps(), { userId: user.id, role: user.role, purpose: parsed.data });
  return result.ok ? { ok: true, token: result.token, expiresAt: result.expiresAt.toISOString() } : result;
}

export async function submitIdentityReference(_state: IdentityActionState, formData: FormData): Promise<IdentityActionState> {
  const user = await requireCurrentUser();
  if (!identityVerificationEnabled()) return { success: false, message: DISABLED };
  if ((await getAccountSetupState()).passwordChangeRequired) return { success: false, message: PASSWORD_FIRST };
  const profile = user.role === "INTERN" ? await prisma.internProfile.findUnique({ where: { userId: user.id }, select: { id: true } }) : null;
  if (!profile) return { success: false, message: "Only interns can set up a face photo." };
  const file = formData.get("selfie"); const selfie = file instanceof File ? file : null;
  const result = await enrollReference(identityDeps(), {
    actor: { userId: user.id, role: user.role, internProfileId: profile.id },
    internProfileId: profile.id, // always the signed-in intern; never taken from the form
    token: formData.get("captureToken"),
    image: selfie ? { bytes: new Uint8Array(await selfie.arrayBuffer()), mimeType: selfie.type, size: selfie.size } : null,
    consent: formData.get("consent") === "accepted",
  });
  if (!result.ok) return { success: false, message: result.message };
  revalidatePath("/onboarding"); revalidatePath("/attendance");
  return { success: true, message: result.replacement ? "Face photo updated. Your new photo is now used for Time In and Time Out." : "Face photo saved. You can now record Time In and Time Out." };
}

/** Assigned Company Supervisor only: retire an intern's face photo so the intern sets it up again. */
export async function resetIdentityReference(_state: IdentityActionState, formData: FormData): Promise<IdentityActionState> {
  const user = await requireCurrentUser();
  if (!identityVerificationEnabled()) return { success: false, message: DISABLED };
  const id = z.string().uuid().safeParse(formData.get("referenceId"));
  if (!id.success) return { success: false, message: "This face photo is invalid." };
  const raw = formData.get("remarks");
  const result = await resetReference(identityDeps(), { actor: { userId: user.id, role: user.role }, referenceId: id.data, remarks: typeof raw === "string" ? raw : null });
  if (!result.ok) return { success: false, message: result.message };
  const attendanceId = z.string().uuid().safeParse(formData.get("attendanceId"));
  if (attendanceId.success) revalidatePath(`/attendance/review/${attendanceId.data}`);
  return { success: true, message: "Face photo reset. The intern must set up a new face photo before their next Time In or Time Out." };
}
