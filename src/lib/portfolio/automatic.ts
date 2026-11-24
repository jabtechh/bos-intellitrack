/**
 * Deterministic, read-only Portfolio evidence built from the canonical
 * authorized Intern report. This is NOT generative AI, does not persist
 * narrative content, and makes no inference about professional proficiency.
 *
 * The report query itself scopes to approved Attendance, submitted/approved
 * Work Logs, completed Tasks, finalized Evaluations, visible Feedback, and
 * approved Portfolio-eligible Document metadata.
 */
import { evaluationPeriodLabel, type EvaluationTypeValue } from "@/lib/evaluations/weekly-period";

export type PortfolioEvidenceSource = {
  startDate: Date;
  endDate: Date;
  status: string;
  requiredHours: number | null;
  attendance: { status: string; creditedMinutes: number; attendanceDate: Date }[];
  workLogs: { workDate: Date; title: string; description: string; skillsApplied: unknown }[];
  tasks: { title: string; description: string | null; completedAt: Date | null }[];
  evaluations: { evaluationType: string; evaluationDate: Date; periodKey?: string; periodStart?: Date | null; periodEnd?: Date | null; overallScore: unknown }[];
  feedback: unknown[];
  documents: { fileName: string; category: string; createdAt: Date }[];
};

const dateLabel = (value: Date) => value.toLocaleDateString("en-PH", { dateStyle: "medium", timeZone: "UTC" });

export function buildAutomaticPortfolio(source: PortfolioEvidenceSource) {
  const approvedAttendance = source.attendance.filter(row => row.status === "APPROVED");
  const creditedMinutes = approvedAttendance.reduce((total, row) => total + row.creditedMinutes, 0);
  const requiredMinutes = source.requiredHours === null ? null : source.requiredHours * 60;

  // Only skills explicitly entered on eligible submitted/approved Work Logs
  // are treated as documented skills. Never infer a proficiency rating.
  const recordedSkills = new Map<string, string>();
  for (const log of source.workLogs) {
    if (!Array.isArray(log.skillsApplied)) continue;
    for (const item of log.skillsApplied) {
      if (typeof item !== "string" || !item.trim()) continue;
      const skill = item.trim();
      const key = skill.toLocaleLowerCase();
      if (!recordedSkills.has(key)) recordedSkills.set(key, skill);
    }
  }

  const tasks = source.tasks.map(row => ({
    title: row.title,
    date: row.completedAt ? dateLabel(row.completedAt) : "Completion date unavailable",
    description: row.description?.trim().slice(0, 300) || null,
  }));
  const workLogs = source.workLogs.map(row => ({
    title: row.title,
    date: dateLabel(row.workDate),
    description: row.description.trim().slice(0, 300) || null,
  }));
  const evaluations = source.evaluations.map(row => ({
    title: `${row.evaluationType.charAt(0)}${row.evaluationType.slice(1).toLowerCase().replaceAll("_", " ")} evaluation`,
    date: dateLabel(row.evaluationDate),
    period: row.periodKey && ["INITIAL", "MIDTERM", "PROGRESS", "FINAL"].includes(row.evaluationType)
      ? evaluationPeriodLabel({evaluationType: row.evaluationType as EvaluationTypeValue, periodKey: row.periodKey, periodStart: row.periodStart ?? null, periodEnd: row.periodEnd ?? null}).label
      : null,
    score: row.overallScore === null ? null : Number(row.overallScore),
  }));
  const documents = source.documents.map(row => ({
    title: row.fileName,
    category: row.category.toLowerCase().replaceAll("_", " "),
    date: dateLabel(row.createdAt),
  }));

  const credits = (creditedMinutes / 60).toLocaleString("en-PH", { maximumFractionDigits: 2 });
  return {
    period: `${dateLabel(source.startDate)} – ${dateLabel(source.endDate)}`,
    status: source.status,
    creditedMinutes,
    requiredMinutes,
    remainingMinutes: requiredMinutes === null ? null : Math.max(0, requiredMinutes - creditedMinutes),
    approvedAttendanceDays: new Set(approvedAttendance.filter(row => row.creditedMinutes > 0).map(row => row.attendanceDate.toISOString().slice(0, 10))).size,
    skills: [...recordedSkills.values()].slice(0, 30),
    tasks,
    workLogs,
    evaluations,
    feedbackCount: source.feedback.length,
    documents,
    overview: `Recorded internship evidence: ${credits} approved attendance hours, ${tasks.length} completed ${tasks.length === 1 ? "Task" : "Tasks"}, ${workLogs.length} submitted Work ${workLogs.length === 1 ? "Log" : "Logs"}, and ${evaluations.length} finalized ${evaluations.length === 1 ? "Evaluation" : "Evaluations"}.`,
    hasEvidence: approvedAttendance.length > 0 || tasks.length > 0 || workLogs.length > 0 || evaluations.length > 0 || source.feedback.length > 0 || documents.length > 0,
  };
}

export type AutomaticPortfolio = ReturnType<typeof buildAutomaticPortfolio>;
