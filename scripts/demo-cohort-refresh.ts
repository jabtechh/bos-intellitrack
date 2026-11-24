// Demo support: keeps the ACTIVE demo-cohort Interns current by adding a normal attendance day and a submitted
// Work Log for every weekday after their last attendance up to yesterday (Manila). Interns deliberately given
// "behind" issues by demo-cohort-issues.ts are left alone. Touches only the tagged demo cohort. Safe to rerun daily.
//
//   Isolated:   npx tsx --env-file=.env.gatea.local scripts/demo-cohort-refresh.ts
//   Production: DEMO_COHORT_TARGET=production DEMO_COHORT_CONFIRM=create-demo-accounts-in-production \
//               npx tsx --env-file=.env scripts/demo-cohort-refresh.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { cohortInterns, COHORT_TAG, resolveDemoTarget } from "./seed-demo-cohort.ts";
import { clockFor, workFor } from "./demo-intern-content.ts";

const SKIP_INDEXES = new Set([30]); // "behind on hours" demo Intern (see demo-cohort-issues.ts)
const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const at = (day: string, utcHour: number) => new Date(`${day}T${String(utcHour).padStart(2, "0")}:00:00.000Z`);

async function main() {
  const target = resolveDemoTarget();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.connection }) });
  const local = new Date(Date.now() + 8 * 3_600_000);
  const today = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  const skipEmails = new Set(cohortInterns().filter((i) => SKIP_INDEXES.has(i.index)).map((i) => i.email));
  try {
    const assignments = await prisma.internshipAssignment.findMany({
      where: { notes: COHORT_TAG, status: "ACTIVE", internProfile: { user: { bio: COHORT_TAG } } },
      select: { id: true, endDate: true, internProfile: { select: { user: { select: { email: true } } } }, attendance: { orderBy: { attendanceDate: "desc" }, take: 1, select: { attendanceDate: true } } },
    });
    let days = 0, interns = 0;
    for (const [n, a] of assignments.entries()) {
      if (skipEmails.has(a.internProfile.user.email) || !a.attendance[0]) continue;
      const missing: string[] = [];
      for (let d = new Date(a.attendance[0].attendanceDate.getTime() + DAY); d < today && d <= a.endDate; d = new Date(d.getTime() + DAY)) { const w = d.getUTCDay(); if (w && w !== 6) missing.push(iso(d)); }
      if (!missing.length) continue;
      await prisma.$transaction(async (tx) => {
        for (const [k, day] of missing.entries()) {
          const clock = clockFor(day, n + k + 3);
          await tx.attendance.upsert({
            where: { assignmentId_attendanceDate: { assignmentId: a.id, attendanceDate: new Date(`${day}T00:00:00.000Z`) } },
            create: { assignmentId: a.id, attendanceDate: new Date(`${day}T00:00:00.000Z`), ...clock, creditedMinutes: Math.min(480, clock.workedMinutes), status: "APPROVED" },
            update: {}, select: { id: true },
          });
          const work = workFor(n + k + 5);
          const exists = await tx.workLog.findFirst({ where: { assignmentId: a.id, workDate: new Date(`${day}T00:00:00.000Z`) }, select: { id: true } });
          if (!exists) await tx.workLog.create({ data: { assignmentId: a.id, workDate: new Date(`${day}T00:00:00.000Z`), title: work.title, description: work.description, learnings: work.learnings, skillsApplied: [...work.skills], status: "SUBMITTED", submittedAt: at(day, 9) } });
        }
      });
      days += missing.length; interns += 1;
    }
    console.log(`Demo cohort refreshed${target.production ? " (PRODUCTION)" : ""}: ${days} attendance day(s) added for ${interns} active Intern(s), up to ${iso(new Date(today.getTime() - DAY))}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Demo refresh failed."); process.exit(1); });
