import "dotenv/config";

import { prisma } from "@/lib/prisma";

async function main(): Promise<void> {
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