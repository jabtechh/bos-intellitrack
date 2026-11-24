// DEC-2026-021 / P174 — removes ONLY the isolated demo interns created by seed-completed-intern-demo.ts.
//
//   npx tsx --env-file=.env.gatea.local scripts/cleanup-completed-intern-demo.ts
//
// Every query is keyed to a demo email, the demo tag and the demo assignment codes; protected Gate A fixtures
// are never selected.
import { rmSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { assertIsolatedEnvironment, DEMO_TAG, DEMOS } from "./seed-completed-intern-demo.ts";

async function main() {
  assertIsolatedEnvironment();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    for (const demo of DEMOS) {
      const user = await prisma.user.findFirst({ where: { email: demo.email, bio: DEMO_TAG }, select: { id: true, authId: true } });
      if (!user) { console.log(`${demo.firstName} ${demo.lastName}: not present.`); continue; }
      await prisma.$transaction(async (tx) => {
        const ids = (await tx.internshipAssignment.findMany({ where: { assignmentCode: demo.code, notes: DEMO_TAG, internProfile: { userId: user.id } }, select: { id: true } })).map((a) => a.id);
        await tx.internshipCertificate.deleteMany({ where: { assignmentId: { in: ids } } });
        await tx.portfolio.deleteMany({ where: { assignmentId: { in: ids } } });
        await tx.document.deleteMany({ where: { assignmentId: { in: ids } } });
        await tx.feedback.deleteMany({ where: { assignmentId: { in: ids } } });
        await tx.evaluation.deleteMany({ where: { assignmentId: { in: ids } } });
        await tx.task.deleteMany({ where: { assignmentId: { in: ids } } });
        await tx.workLog.deleteMany({ where: { assignmentId: { in: ids } } });
        await tx.attendanceCorrection.deleteMany({ where: { attendance: { assignmentId: { in: ids } } } });
        await tx.attendance.deleteMany({ where: { assignmentId: { in: ids } } });
        await tx.notification.deleteMany({ where: { recipientId: user.id } });
        await tx.internshipAssignment.deleteMany({ where: { id: { in: ids } } });
        await tx.internProfile.deleteMany({ where: { userId: user.id } });
        await tx.user.delete({ where: { id: user.id } });
      });
      await supabase.auth.admin.deleteUser(user.authId);
      console.log(`${demo.firstName} ${demo.lastName}: removed.`);
    }
    rmSync(".gatea/completed-intern-demo.local.json", { force: true });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Demo cleanup failed."); process.exit(1); });
