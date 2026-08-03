"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireInternAssignment } from "@/lib/required-hours/intern-context";
import { creditedHours, requiredHoursSchema, validateAgainstCredit } from "@/lib/required-hours/domain";

export async function submitRequiredHours(formData: FormData) {
  const { assignment } = await requireInternAssignment({ allowUnset: true });
  if (formData.get("confirmed") !== "on") redirect("/onboarding/internship-hours?error=Confirmation+is+required.");
  const parsed = requiredHoursSchema.safeParse(formData.get("requiredHours"));
  if (!parsed.success) redirect(`/onboarding/internship-hours?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Review the value.")}`);
  const sum = await prisma.attendance.aggregate({ where: { assignmentId: assignment.id, status: "APPROVED" }, _sum: { creditedMinutes: true } });
  const error = validateAgainstCredit(parsed.data, creditedHours(sum._sum.creditedMinutes ?? 0));
  if (error) redirect(`/onboarding/internship-hours?error=${encodeURIComponent(error)}`);
  const updated = await prisma.internshipAssignment.updateMany({ where: { id: assignment.id, requiredHours: null, requiredHoursConfirmedAt: null }, data: { requiredHours: parsed.data, requiredHoursConfirmedAt: new Date() } });
  if (updated.count !== 1) redirect("/onboarding/internship-hours?error=Required+hours+were+already+submitted.");
  ["/dashboard", "/attendance", "/work-logs", "/admin/users"].forEach(path => revalidatePath(path));
  redirect("/dashboard");
}
