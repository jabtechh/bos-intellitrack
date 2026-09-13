import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";

export async function requireInternAssignment(options: { allowUnset?: boolean } = {}) {
  const user = await requireCurrentUser();
  if (user.role !== "INTERN") redirect("/dashboard");
  const assignment = await prisma.internshipAssignment.findFirst({ where: { status: "ACTIVE", internProfile: { userId: user.id } }, select: { id: true, requiredHours: true, requiredHoursConfirmedAt: true, startDate: true, endDate: true, scheduleStartTime: true, scheduleEndTime: true, company: { select: { name: true, branchName: true, timezone: true } }, attendance: { orderBy: { attendanceDate: "desc" }, take: 5, select: { id: true, attendanceDate: true, clockIn: true, clockOut: true, status: true } } } });
  if (!assignment) redirect("/dashboard");
  if (!options.allowUnset && assignment.requiredHours === null) redirect("/onboarding/internship-hours");
  return { user, assignment };
}
