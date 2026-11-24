// Removes ONLY the isolated demo cohort created by seed-demo-cohort.ts (rows tagged demo_cohort=2026-11).
//
//   npx tsx --env-file=.env.gatea.local scripts/cleanup-demo-cohort.ts
//
// Every query is keyed to the cohort tag; protected Gate A fixtures are never selected.
import { rmSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { COHORT_TAG, resolveDemoTarget } from "./seed-demo-cohort.ts";

async function main() {
  const target = resolveDemoTarget();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.connection }) });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const users = await prisma.user.findMany({ where: { bio: COHORT_TAG }, select: { id: true, authId: true } });
    const userIds = users.map((u) => u.id);
    const ids = (await prisma.internshipAssignment.findMany({ where: { notes: COHORT_TAG }, select: { id: true } })).map((a) => a.id);
    await prisma.$transaction(async (tx) => {
      // Face-photo records (DEC-2026-019) block intern profile deletion, so remove them first.
      const profileScope = { internProfile: { userId: { in: userIds } } };
      await tx.identityVerificationAttempt.deleteMany({ where: profileScope });
      await tx.identityReferenceEvent.deleteMany({ where: { reference: profileScope } });
      await tx.identityReference.updateMany({ where: profileScope, data: { replacesId: null } });
      await tx.identityReference.deleteMany({ where: profileScope });
      await tx.identityCaptureSession.deleteMany({ where: { userId: { in: userIds } } });
      await tx.internshipCertificate.deleteMany({ where: { assignmentId: { in: ids } } });
      await tx.portfolio.deleteMany({ where: { assignmentId: { in: ids } } });
      await tx.document.deleteMany({ where: { assignmentId: { in: ids } } });
      await tx.feedback.deleteMany({ where: { assignmentId: { in: ids } } });
      await tx.evaluation.deleteMany({ where: { assignmentId: { in: ids } } });
      await tx.task.deleteMany({ where: { assignmentId: { in: ids } } });
      await tx.workLog.deleteMany({ where: { assignmentId: { in: ids } } });
      await tx.attendanceCorrection.deleteMany({ where: { attendance: { assignmentId: { in: ids } } } });
      await tx.attendance.deleteMany({ where: { assignmentId: { in: ids } } });
      await tx.notification.deleteMany({ where: { recipientId: { in: userIds } } });
      await tx.internshipAssignment.deleteMany({ where: { id: { in: ids } } });
      await tx.internProfile.deleteMany({ where: { userId: { in: userIds } } });
      await tx.supervisorProfile.deleteMany({ where: { userId: { in: userIds } } });
      await tx.coordinatorProfile.deleteMany({ where: { userId: { in: userIds } } });
      await tx.representativeProfile.deleteMany({ where: { userId: { in: userIds } } });
      await tx.adminProfile.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds }, bio: COHORT_TAG } });
      await tx.school.deleteMany({ where: { schoolCode: { startsWith: "DEMO-" }, addressLine: COHORT_TAG } });
    }, { timeout: 120_000 });
    for (const user of users) await supabase.auth.admin.deleteUser(user.authId).catch(() => undefined);
    rmSync(target.credentials, { force: true });
    console.log(`Demo cohort removed: ${users.length} accounts, ${ids.length} internships.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Demo cohort cleanup failed."); process.exit(1); });
