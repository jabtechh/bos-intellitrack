import { prisma } from "@/lib/prisma";
import type { PortfolioContext } from "@/lib/portfolio/authorization";
import { portfolioForInternWhere } from "@/lib/portfolio/authorization";

export async function getInternReport(c: PortfolioContext, internUserId: string, period: { from?: Date; to?: Date }) {
  const date = period.from || period.to ? { gte: period.from, lte: period.to } : undefined;
  return prisma.internshipAssignment.findFirst({
    where: portfolioForInternWhere(c, internUserId),
    select: {
      startDate: true, endDate: true, status: true, requiredHours: true, requiredHoursConfirmedAt: true,
      internProfile: { select: { userId: true, studentNumber: true, course: true, yearLevel: true, user: { select: { firstName: true, lastName: true } }, school: { select: { name: true } } } },
      supervisorProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
      portfolio: { select: { title: true, professionalSummary: true, skills: true, achievements: true, selectedWork: true, reflection: true, status: true, updatedAt: true } },
      attendance: { where: { attendanceDate: date, status: { not: "VOIDED" } }, select: { attendanceDate: true, clockIn:true, clockOut:true, creditedMinutes: true, status: true, classification: true, reviewRequired: true }, orderBy: { attendanceDate: "asc" } },
      workLogs: { where: { workDate: date, status: { in: ["SUBMITTED", "APPROVED"] } }, select: { workDate: true, title: true, description: true }, orderBy: { workDate: "asc" } },
      tasks: { where: { status: "COMPLETED", completedAt: date }, select: { title: true, description: true, completedAt: true }, orderBy: { completedAt: "asc" } },
      evaluations: { where: { status: { in: ["SUBMITTED", "ACKNOWLEDGED"] }, evaluationDate: date }, select: { evaluationType: true, evaluationDate: true, overallScore: true, strengths: true, areasForImprovement: true, comments: true }, orderBy: { evaluationDate: "asc" } },
      feedback: { where: { createdAt: date, ...(c.kind === "INTERN" ? { visibility: { in: ["INTERN_AND_STAFF", "INTERN_ONLY"] } } : { visibility: { in: ["INTERN_AND_STAFF", "STAFF_ONLY"] } }) }, select: { title: true, content: true, feedbackType: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      documents: { where: { status: "APPROVED", isPortfolioEligible: true, category: { notIn: ["IDENTIFICATION", "MEDICAL_DOCUMENT"] }, createdAt: date }, select: { fileName: true, category: true, description: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });
}
export function reportTotals(report: NonNullable<Awaited<ReturnType<typeof getInternReport>>>) {
  const creditedMinutes = report.attendance.reduce((sum, row) => row.status==="APPROVED"?sum + row.creditedMinutes:sum, 0);
  const requiredMinutes = report.requiredHours == null ? null : Number(report.requiredHours) * 60;
  return { creditedMinutes, requiredMinutes, remainingMinutes: requiredMinutes == null ? null : Math.max(0, requiredMinutes - creditedMinutes), exceptionCount: report.attendance.filter((x) => x.reviewRequired || ["PENDING_REVIEW", "REJECTED", "INCOMPLETE", "ABSENT"].includes(x.status)).length };
}
