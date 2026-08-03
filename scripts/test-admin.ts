import "dotenv/config";

import { createAdminClient } from "../src/lib/supabase/admin.ts";
import { prisma } from "../src/lib/prisma.ts";

async function main() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });

  if (error) {
    throw new Error(
      `Supabase Auth Admin diagnostic failed (status ${error.status ?? "unknown"}).`,
    );
  }

  console.log("Supabase Auth Admin diagnostic successful.");
  console.log(`Auth users: ${data.total ?? data.users.length}`);
  const [users, adminProfiles, internProfiles, supervisorProfiles, coordinatorProfiles, representativeProfiles, schools, companies] = await Promise.all([
    prisma.user.findMany({ select: { authId: true, role: true, isActive: true } }),
    prisma.adminProfile.count(), prisma.internProfile.count(), prisma.supervisorProfile.count(),
    prisma.coordinatorProfile.count(), prisma.representativeProfile.count(),
    prisma.school.count(), prisma.company.count(),
  ]);
  const authIds = new Set(data.users.map((user) => user.id));
  console.log(`Application users: ${users.length}`);
  console.log(`Active administrators: ${users.filter((user) => user.role === "ADMIN" && user.isActive).length}`);
  console.log(`Admin profiles: ${adminProfiles}`);
  console.log(`Other role profiles: ${internProfiles + supervisorProfiles + coordinatorProfiles + representativeProfiles}`);
  console.log(`Schools: ${schools}`);
  console.log(`Companies: ${companies}`);
  console.log(`All application users match Auth identities: ${users.every((user) => authIds.has(user.authId))}`);
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Supabase Auth Admin diagnostic failed safely.",
  );
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
