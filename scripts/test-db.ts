import "dotenv/config";

import { prisma } from "@/lib/prisma";

async function main(): Promise<void> {
  // Guard against accidental default-configuration reads by broad test globs.
  if (
    process.env.GATEA_TARGET_ENV !== "test" ||
    process.env.GATEA_ENVIRONMENT_VERIFIED !== "1" ||
    process.env.GATEA_RUN_ID !== "gatea-20261103-2318" ||
    new URL(process.env.GATEA_BASE_URL ?? "").hostname !== "127.0.0.1" ||
    new URL(process.env.GATEA_BASE_URL ?? "").port !== "3100" ||
    new URL(process.env.DATABASE_URL ?? "").hostname !== "127.0.0.1" ||
    new URL(process.env.DATABASE_URL ?? "").port !== "54322" ||
    new URL(process.env.DIRECT_URL ?? "").hostname !== "127.0.0.1" ||
    new URL(process.env.DIRECT_URL ?? "").port !== "54322"
  ) throw new Error("Database diagnostic refused outside the verified isolated Gate A environment.");
  const [users, schools, companies, assignments] = await Promise.all([
    prisma.user.count(),
    prisma.school.count(),
    prisma.company.count(),
    prisma.internshipAssignment.count(),
  ]);

  console.log(`users: ${users}`);
  console.log(`schools: ${schools}`);
  console.log(`companies: ${companies}`);
  console.log(`internship_assignments: ${assignments}`);
  console.log("Database connection successful.");
}

main()
  .catch((error: unknown) => {
    console.error("Database test failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });