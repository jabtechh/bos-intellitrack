import "dotenv/config";

import { prisma } from "@/lib/prisma";
import { BO_COFFEE_OFFICE_CODE, getBoCoffeeConfiguration } from "@/lib/organization/bo-coffee";

async function main() {
  const config = getBoCoffeeConfiguration();
  const office = await prisma.$transaction(async (tx) => {
    const existing = await tx.company.findUnique({ where: { companyCode: BO_COFFEE_OFFICE_CODE }, select: { id: true } });
    const data = { companyCode: BO_COFFEE_OFFICE_CODE, name: config.organizationName, branchName: config.officeName, addressLine: config.address, latitude: config.latitude, longitude: config.longitude, geofenceRadiusMeters: config.geofenceRadiusMeters, timezone: config.timezone, isActive: true };
    const updateRequested = process.argv.includes("--update");
    const record = existing ? updateRequested ? await tx.company.update({ where: { id: existing.id }, data }) : await tx.company.update({ where: { id: existing.id }, data: { isActive: true } }) : await tx.company.create({ data });
    await tx.company.updateMany({ where: { id: { not: record.id }, isActive: true }, data: { isActive: false } });
    return record;
  });
  console.log(`Bo’s Coffee Main Office configuration is ready (${office.id}).`);
}

main().catch((error: unknown) => { console.error("Office setup failed:", error instanceof Error ? error.message : "Unknown error"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
