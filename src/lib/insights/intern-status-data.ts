// DEC-2026-022 — loads the records the status rules need, inside a caller-supplied (already authorized) scope.
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { computeInternStatus, statusRank, type InternStatus } from "./intern-status";

export type InternStatusRow = { assignmentId: string; internUserId: string; name: string; positionTitle: string | null; supervisorName: string | null; status: InternStatus };

export async function loadInternStatuses(scope: Prisma.InternshipAssignmentWhereInput, now = new Date()): Promise<InternStatusRow[]> {
  const rows = await prisma.internshipAssignment.findMany({
    where: { AND: [scope, { status: { in: ["ACTIVE", "COMPLETED"] } }] },
    select: {
      id: true, status: true, startDate: true, endDate: true, requiredHours: true, positionTitle: true,
      internProfile: { select: { userId: true, user: { select: { firstName: true, lastName: true } } } },
      supervisorProfile: { select: { user: { select: { firstName: true, lastName: true } } } },
      attendance: { select: { attendanceDate: true, clockIn: true, status: true, classification: true, creditedMinutes: true, reviewRequired: true } },
      workLogs: { select: { workDate: true, status: true } },
      tasks: { select: { dueAt: true, status: true } },
      evaluations: { select: { evaluationDate: true, overallScore: true, status: true } },
    },
  });
  return rows.map((row) => ({
    assignmentId: row.id,
    internUserId: row.internProfile.userId,
    name: `${row.internProfile.user.firstName} ${row.internProfile.user.lastName}`,
    positionTitle: row.positionTitle,
    supervisorName: row.supervisorProfile ? `${row.supervisorProfile.user.firstName} ${row.supervisorProfile.user.lastName}` : null,
    status: computeInternStatus(row, now),
  })).sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name));
}

export function statusCounts(rows: InternStatusRow[]) {
  const count = (level: string) => rows.filter((r) => r.status.level === level).length;
  return { total: rows.length, active: rows.length - count("Completed"), completed: count("Completed"), onTrack: count("On track"), attention: count("Needs attention"), atRisk: count("At risk") };
}
