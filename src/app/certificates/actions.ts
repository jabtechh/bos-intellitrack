"use server";
// DEC-2026-021 — Representative-only certificate revocation with a required reason.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { canRevokeCertificate, revokeReasonError } from "@/lib/certificates/domain";
import { revokeCertificate } from "@/lib/certificates/issue";
import { getCertificate } from "@/lib/certificates/data";
import { prisma } from "@/lib/prisma";

export type RevokeState = { success: boolean; message: string };

export async function revokeCertificateAction(_state: RevokeState, formData: FormData): Promise<RevokeState> {
  const user = await requireCurrentUser();
  if (!canRevokeCertificate(user.role)) return { success: false, message: "Only a Company Representative can revoke a certificate." };
  const assignmentId = z.string().uuid().safeParse(formData.get("assignmentId"));
  if (!assignmentId.success) return { success: false, message: "This certificate is invalid." };
  const reason = formData.get("reason");
  const reasonError = revokeReasonError(reason);
  if (reasonError) return { success: false, message: reasonError };
  // Re-authorize: the certificate must be inside this Representative's own Main Office scope.
  const certificate = await getCertificate({ userId: user.id, role: user.role }, assignmentId.data);
  if (!certificate) return { success: false, message: "This certificate is unavailable." };
  if (certificate.status !== "ISSUED") return { success: false, message: "This certificate has already been revoked." };
  const ok = await revokeCertificate(prisma, { certificateId: certificate.id, actorUserId: user.id, reason: String(reason), now: new Date() });
  if (!ok) return { success: false, message: "This certificate could not be revoked. Refresh and try again." };
  revalidatePath(`/certificates/${assignmentId.data}`); revalidatePath("/certificates");
  return { success: true, message: "Certificate revoked. The intern can no longer download it; the record and reason are kept." };
}
