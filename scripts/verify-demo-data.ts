import { config } from "dotenv";
import { prisma } from "@/lib/prisma";
import { DEMO_DATA_IDENTITIES } from "@/lib/demo/data";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  if (process.env.INTELLITRACK_TARGET_ENV?.trim().toLowerCase() !== "demo") throw new Error("Demo verification requires INTELLITRACK_TARGET_ENV=demo.");
  const emails = DEMO_DATA_IDENTITIES.map((identity) => identity.email);
  const assignmentScope = { internProfile: { user: { email: { in: emails } } } };
  const [users, attendance, workLogs, tasks, evaluations, feedback] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], where: { email: { in: emails } }, _count: { _all: true } }),
    prisma.attendance.count({ where: { assignment: assignmentScope } }),
    prisma.workLog.count({ where: { assignment: assignmentScope } }),
    prisma.task.count({ where: { assignment: assignmentScope } }),
    prisma.evaluation.count({ where: { assignment: assignmentScope } }),
    prisma.feedback.count({ where: { assignment: assignmentScope } }),
  ]);
  const roleCount = (role: string) => users.find((row) => row.role === role)?._count._all ?? 0;
  const counts = { users: users.reduce((sum, row) => sum + row._count._all, 0), interns: roleCount("INTERN"), supervisors: roleCount("SUPERVISOR"), coordinators: roleCount("COORDINATOR"), representatives: roleCount("REPRESENTATIVE"), attendance, workLogs, tasks, evaluations, feedback };
  for (const [label, count] of Object.entries(counts)) console.log(`${label}: ${count}`);
}

main().catch(() => { console.error("Demo data verification failed safely."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
