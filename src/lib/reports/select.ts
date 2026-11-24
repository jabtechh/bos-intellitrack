import type { Prisma } from "@/generated/prisma/client";

// Prisma-free so DB-less unit tests can import the canonical selection.
type ReportViewerKind = "INTERN" | "SUPERVISOR" | "COORDINATOR";
/**
 * Canonical eligible-evidence selection for one Intern report. Shared by the
 * authorized report/Portfolio views and the completion-time Portfolio snapshot
 * (DEC-2026-020) so both apply exactly the same eligibility rules.
 */
export function internReportSelect(viewer: ReportViewerKind, date?: { gte?: Date; lte?: Date }) {
  return {
    startDate: true, endDate: true, status: true, requiredHours: true, requiredHoursConfirmedAt: true,
    internProfile: { select: { userId: true, studentNumber: true, course: true, yearLevel: true, user: { select: { firstName: true, lastName: true } }, school: { select: { name: true } } } },
    supervisorProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
    portfolio: { select: { title: true, professionalSummary: true, skills: true, achievements: true, selectedWork: true, reflection: true, status: true, updatedAt: true } },
    attendance: { where: { attendanceDate: date, status: { not: "VOIDED" } }, select: { attendanceDate: true, clockIn:true, clockOut:true, creditedMinutes: true, status: true, classification: true, reviewRequired: true }, orderBy: { attendanceDate: "asc" } },
    workLogs: { where: { workDate: date, status: { in: ["SUBMITTED", "APPROVED"] } }, select: { workDate: true, title: true, description: true, skillsApplied: true }, orderBy: { workDate: "asc" } },
    tasks: { where: { status: "COMPLETED", completedAt: date }, select: { title: true, description: true, completedAt: true }, orderBy: { completedAt: "asc" } },
    evaluations: { where: { status: { in: ["SUBMITTED", "ACKNOWLEDGED"] }, evaluationDate: date }, select: { id: true, evaluationType: true, periodKey: true, periodStart: true, periodEnd: true, evaluationDate: true, overallScore: true, strengths: true, areasForImprovement: true, comments: true }, orderBy: [{ evaluationDate: "asc" }, { periodKey: "asc" }, { id: "asc" }] },
    feedback: { where: { createdAt: date, ...(viewer === "INTERN" ? { visibility: { in: ["INTERN_AND_STAFF", "INTERN_ONLY"] } } : { visibility: { in: ["INTERN_AND_STAFF", "STAFF_ONLY"] } }) }, select: { title: true, content: true, feedbackType: true, createdAt: true, author: { select: { role: true } } }, orderBy: { createdAt: "asc" } },
    documents: { where: { status: "APPROVED", isPortfolioEligible: true, category: { notIn: ["IDENTIFICATION", "MEDICAL_DOCUMENT"] }, createdAt: date }, select: { fileName: true, category: true, description: true, createdAt: true }, orderBy: { createdAt: "asc" } },
  } satisfies Prisma.InternshipAssignmentSelect;
}
