// DEC-2026-022 demo support: gives a few DEMO-COHORT Interns realistic issues so On track / Needs attention / At risk
// can be demonstrated. Touches only rows of the tagged demo cohort (demo_cohort=2026-11). Runs once (marker Task).
//
//   Isolated:   npx tsx --env-file=.env.gatea.local scripts/demo-cohort-issues.ts
//   Production: DEMO_COHORT_TARGET=production DEMO_COHORT_CONFIRM=create-demo-accounts-in-production \
//               npx tsx --env-file=.env scripts/demo-cohort-issues.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { cohortInterns, COHORT_TAG, resolveDemoTarget } from "./seed-demo-cohort.ts";

const MARKER = "[demo] Reconcile the weekly inventory variance";
const DAY = 86_400_000;
const manilaToday = () => { const l = new Date(Date.now() + 8 * 3_600_000); return new Date(Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate())); };
/** The `count` most recent weekdays before today (UTC-midnight dates). */
function recentWeekdays(count: number) { const out: Date[] = []; for (let d = new Date(manilaToday().getTime() - DAY); out.length < count; d = new Date(d.getTime() - DAY)) { const w = d.getUTCDay(); if (w && w !== 6) out.push(d); } return out; }

type Issue = "LATE" | "BEHIND" | "MISSING_LOGS" | "OVERDUE" | "LOW_EVAL";
const PLAN: Record<number, Issue[]> = {
  15: ["LATE"], 30: ["BEHIND"], 45: ["MISSING_LOGS", "OVERDUE"], // Ramon Villanueva / Teresita Mendoza
  16: ["MISSING_LOGS"], 17: ["LOW_EVAL"], 31: ["OVERDUE"],       // other Supervisors (company-wide view)
};

async function main() {
  const target = resolveDemoTarget();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.connection }) });
  try {
    if (await prisma.task.findFirst({ where: { title: MARKER, assignment: { notes: COHORT_TAG } }, select: { id: true } })) { console.log("Demo issues already applied. Nothing changed."); return; }
    const interns = cohortInterns();
    const summary: string[] = [];
    for (const [indexText, issues] of Object.entries(PLAN)) {
      const intern = interns[Number(indexText)];
      const assignment = await prisma.internshipAssignment.findFirst({
        where: { notes: COHORT_TAG, status: "ACTIVE", internProfile: { user: { email: intern.email, bio: COHORT_TAG } } },
        select: { id: true, supervisorProfile: { select: { userId: true } } },
      });
      if (!assignment) { summary.push(`${intern.firstName} ${intern.lastName}: not found (skipped)`); continue; }
      await prisma.$transaction(async (tx) => {
        for (const issue of issues) {
          if (issue === "LATE") {
            const days = await tx.attendance.findMany({ where: { assignmentId: assignment.id, clockIn: { not: null } }, orderBy: { attendanceDate: "desc" }, take: 4, select: { id: true } });
            await tx.attendance.updateMany({ where: { id: { in: days.map((d) => d.id) } }, data: { classification: "LATE" } });
          }
          if (issue === "BEHIND") {
            const days = recentWeekdays(15);
            const window = { assignmentId: assignment.id, attendanceDate: { gte: days.at(-1)! } };
            await tx.attendanceCorrection.deleteMany({ where: { attendance: window } });
            await tx.attendance.deleteMany({ where: window });
            await tx.workLog.deleteMany({ where: { assignmentId: assignment.id, workDate: { gte: days.at(-1)! } } });
          }
          if (issue === "MISSING_LOGS") {
            const logs = await tx.workLog.findMany({ where: { assignmentId: assignment.id }, orderBy: { workDate: "desc" }, take: 3, select: { id: true } });
            await tx.workLog.deleteMany({ where: { id: { in: logs.map((l) => l.id) } } });
          }
          if (issue === "OVERDUE") {
            await tx.task.create({ data: {
              assignmentId: assignment.id, assignedById: assignment.supervisorProfile!.userId, title: MARKER,
              description: "Compare the system count with the shelf count and explain each variance.", priority: "HIGH",
              startAt: new Date(manilaToday().getTime() - 6 * DAY), dueAt: new Date(manilaToday().getTime() - 2 * DAY), status: "IN_PROGRESS", progressPercentage: 40,
            } });
          }
          if (issue === "LOW_EVAL") {
            const latest = await tx.evaluation.findFirst({ where: { assignmentId: assignment.id, status: { in: ["SUBMITTED", "ACKNOWLEDGED"] } }, orderBy: { evaluationDate: "desc" }, select: { id: true } });
            if (latest) await tx.evaluation.update({ where: { id: latest.id }, data: { overallScore: 70, areasForImprovement: "Accuracy on the stock count slipped this week; double-check entries before submitting." } });
          }
        }
      });
      summary.push(`${intern.firstName} ${intern.lastName}: ${issues.join(" + ")}`);
    }
    // The marker Task makes the script run only once even if no OVERDUE issue applied.
    if (!(await prisma.task.findFirst({ where: { title: MARKER, assignment: { notes: COHORT_TAG } }, select: { id: true } }))) throw new Error("Marker Task was not created; check the plan.");
    console.log(`Demo issues applied${target.production ? " (PRODUCTION demo cohort)" : ""}:\n  ${summary.join("\n  ")}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Demo issues failed."); process.exit(1); });
