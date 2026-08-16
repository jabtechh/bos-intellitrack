import { prisma } from "@/lib/prisma";
import { criteriaFromJson } from "@/lib/evaluations/domain";
import { insightAssignmentWhere, insightForInternWhere, type InsightsContext } from "./authorization";
import { attendanceCounts, hoursProgress, periodWhere, recordedSkills, taskCounts, type InsightPeriod } from "./domain";

export async function listInsightInterns(context: InsightsContext) {
  return prisma.internshipAssignment.findMany({
    where: { ...insightAssignmentWhere(context), status: "ACTIVE" },
    select: {
      internProfile: { select: { userId: true, user: { select: { firstName: true, lastName: true } }, school: { select: { name: true } } } },
      requiredHours: true,
      attendance: { where: { status: "APPROVED" }, select: { status:true,creditedMinutes: true } },
      tasks: { where: { status: { not: "CANCELLED" } }, select: { status: true, dueAt: true } },
      workLogs: { where: { status: "APPROVED" }, select: { id: true } },
    },
    orderBy: [{ internProfile: { user: { lastName: "asc" } } }, { internProfile: { user: { firstName: "asc" } } }],
  });
}

export async function getInternInsights(context: InsightsContext, internUserId: string, period: InsightPeriod) {
  const date = periodWhere(period);
  const taskDateWhere = date ? { OR: [{ createdAt: date }, { completedAt: date }, { dueAt: date }] } : undefined;
  const row = await prisma.internshipAssignment.findFirst({
    where: insightForInternWhere(context, internUserId),
    select: {
      id:true,startDate: true, endDate: true, requiredHours: true,
      internProfile: { select: { userId: true, course: true, user: { select: { firstName: true, lastName: true } }, school: { select: { name: true } } } },
      attendance: { where: { attendanceDate: date, status: { not: "VOIDED" } }, select: { attendanceDate: true, creditedMinutes: true, classification: true }, orderBy: { attendanceDate: "asc" } },
      workLogs: { where: { workDate: date, status: "APPROVED" }, select: { workDate: true, skillsApplied: true }, orderBy: { workDate: "asc" } },
      tasks: { where: taskDateWhere, select: { status: true, dueAt: true, completedAt: true, createdAt: true } },
      evaluations: { where: { evaluationDate: date, status: { in: ["SUBMITTED", "ACKNOWLEDGED"] } }, select: { evaluationDate: true, evaluationType: true, overallScore: true, criteriaScores: true, status: true }, orderBy: { evaluationDate: "desc" } },
      feedback: { where: { createdAt: date, ...(context.kind === "INTERN" ? { visibility: { in: ["INTERN_AND_STAFF", "INTERN_ONLY"] } } : { visibility: { in: ["INTERN_AND_STAFF", "STAFF_ONLY"] } }) }, select: { title: true, content: true, feedbackType: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 5 },
      portfolio: { select: { skills: true } },
    },
  });
  if (!row) return null;
  const credited=await prisma.attendance.aggregate({where:{assignmentId:row.id,status:"APPROVED"},_sum:{creditedMinutes:true}});
  const tasks = taskCounts(row.tasks);
  const attendance = attendanceCounts(row.attendance);
  const hours = hoursProgress(row.requiredHours, credited._sum.creditedMinutes??0);
  const latestEvaluation = row.evaluations[0] ? { ...row.evaluations[0], criteria: criteriaFromJson(row.evaluations[0].criteriaScores) } : null;
  const skills = recordedSkills([row.portfolio?.skills, ...row.workLogs.map((item) => item.skillsApplied)]);
  const activity = new Map<string, { attendance: number; workLogs: number; tasks: number }>();
  const add = (dateValue: Date, key: "attendance" | "workLogs" | "tasks") => { const day = dateValue.toISOString().slice(0, 10); const item = activity.get(day) ?? { attendance: 0, workLogs: 0, tasks: 0 }; item[key] += 1; activity.set(day, item); };
  row.attendance.forEach((item) => add(item.attendanceDate, "attendance"));
  row.workLogs.forEach((item) => add(item.workDate, "workLogs"));
  row.tasks.filter((item) => item.status === "COMPLETED" && item.completedAt).forEach((item) => add(item.completedAt!, "tasks"));
  return { ...row, hours, attendanceSummary: attendance, taskSummary: tasks, latestEvaluation, skills, activity: [...activity].sort(([a], [b]) => a.localeCompare(b)).map(([dateValue, counts]) => ({ date: dateValue, ...counts })) };
}
