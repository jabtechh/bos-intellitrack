// REQ-FR-ATT-9 / REQ-FR-REP-4 — staff analytics loader: one query inside the caller's existing report scope.
// All aggregation is pure and lives in ./analytics-shared (also used by the client charts and unit tests).
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { buildReportAnalytics } from "./analytics-shared";
export * from "./analytics-shared";

/** One query, already limited by the caller's report scope; ACTIVE and COMPLETED internships only. */
export async function loadReportAnalytics(scope: Prisma.InternshipAssignmentWhereInput, now = new Date()) {
  const rows = await prisma.internshipAssignment.findMany({
    where: { AND: [scope, { status: { in: ["ACTIVE", "COMPLETED"] } }] },
    select: {
      status: true, requiredHours: true,
      attendance: { select: { attendanceDate: true, creditedMinutes: true, status: true, classification: true, reviewRequired: true, clockIn: true, clockOut: true } },
      workLogs: { select: { workDate: true, status: true } },
      evaluations: { select: { evaluationDate: true, overallScore: true, status: true } },
    },
  });
  return buildReportAnalytics(rows, now);
}
