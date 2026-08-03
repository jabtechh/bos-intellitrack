"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyOperationsManager } from "@/lib/auth/require-company-operations-manager";
import { correctionReasonSchema, creditedHours, requiredHoursSchema, validateAgainstCredit } from "@/lib/required-hours/domain";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";

export async function correctRequiredHours(internUserId: string, formData: FormData) {
  const actor = await requireCompanyOperationsManager();
  const hours = requiredHoursSchema.safeParse(formData.get("requiredHours"));
  const reason = correctionReasonSchema.safeParse(formData.get("reason"));
  const fail = (message: string): never => redirect(`/admin/users/${internUserId}?error=${encodeURIComponent(message)}`);
  if (!hours.success) return fail(hours.error.issues[0]?.message ?? "Review the required hours.");
  if (!reason.success) return fail(reason.error.issues[0]?.message ?? "A correction reason is required.");
  try {
    await prisma.$transaction(async tx => {
      const assignment = await tx.internshipAssignment.findFirst({ where: { status: "ACTIVE", company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true }, internProfile: { userId: internUserId, user: { role: "INTERN", isActive: true } } }, select: { id: true, requiredHours: true } });
      if (!assignment || assignment.requiredHours === null) throw new HoursError("The Intern must submit the initial requirement before it can be corrected.");
      const sum = await tx.attendance.aggregate({ where: { assignmentId: assignment.id, status: "APPROVED" }, _sum: { creditedMinutes: true } });
      const creditError = validateAgainstCredit(hours.data, creditedHours(sum._sum.creditedMinutes ?? 0));
      if (creditError) throw new HoursError(creditError);
      const updated = await tx.internshipAssignment.updateMany({ where: { id: assignment.id, requiredHours: assignment.requiredHours }, data: { requiredHours: hours.data, requiredHoursUpdatedById: actor.id, requiredHoursUpdateReason: reason.data } });
      if (updated.count !== 1) throw new HoursError("Required hours changed while this correction was being processed. Review the current value and try again.");
    });
  } catch (error) { fail(error instanceof HoursError ? error.message : "Required hours could not be corrected."); }
  ["/dashboard", "/attendance", "/work-logs", "/admin/users", `/admin/users/${internUserId}`].forEach(path => revalidatePath(path));
  redirect(`/admin/users/${internUserId}?updated=1`);
}
class HoursError extends Error {}
