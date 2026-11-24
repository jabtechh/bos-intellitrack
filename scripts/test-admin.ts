import "dotenv/config";

import { createAdminClient } from "../src/lib/supabase/admin.ts";
import { prisma } from "../src/lib/prisma.ts";

async function main() {
  // Diagnostic-only: avoid unintentionally opening the default configured Auth
  // target during a wildcard regression test. Even read-only Production access
  // requires an explicit, separately authorized workflow.
  if (
    process.env.GATEA_TARGET_ENV !== "test" ||
    process.env.GATEA_ENVIRONMENT_VERIFIED !== "1" ||
    process.env.GATEA_RUN_ID !== "gatea-20261103-2318" ||
    new URL(process.env.GATEA_BASE_URL ?? "").hostname !== "127.0.0.1" ||
    new URL(process.env.GATEA_BASE_URL ?? "").port !== "3100" ||
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname !== "127.0.0.1" ||
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").port !== "54321" ||
    new URL(process.env.DATABASE_URL ?? "").hostname !== "127.0.0.1" ||
    new URL(process.env.DATABASE_URL ?? "").port !== "54322" ||
    new URL(process.env.DIRECT_URL ?? "").hostname !== "127.0.0.1" ||
    new URL(process.env.DIRECT_URL ?? "").port !== "54322"
  ) throw new Error("Auth diagnostic refused outside the verified isolated Gate A environment.");
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
