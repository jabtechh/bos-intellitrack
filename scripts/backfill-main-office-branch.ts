import { pathToFileURL } from "node:url";
import { prisma } from "../src/lib/prisma";
import { BO_COFFEE_OFFICE_CODE } from "../src/lib/organization/bo-coffee";

export async function backfillMainOfficeBranch(args: string[]) {
  if (args.some(arg => !["--apply", "--associate-assignments"].includes(arg))) throw new Error("Use only --apply and/or --associate-assignments.");
  const apply = args.includes("--apply"), associate = args.includes("--associate-assignments");
  const companies = await prisma.company.findMany({ where: { companyCode: BO_COFFEE_OFFICE_CODE } });
  if (companies.length !== 1) throw new Error("Cannot uniquely resolve the existing Bo’s Coffee company.");
  const company = companies[0];
  const matches = await prisma.branch.findMany({ where: { companyId: company.id, name: { equals: "Main Office", mode: "insensitive" } } });
  if (matches.length > 1) throw new Error("Main Office Branch is ambiguous.");
  const where = { companyId: company.id, branchId: null };
  const count = associate ? await prisma.internshipAssignment.count({ where }) : 0;
  console.log(`${apply ? "APPLY" : "DRY RUN"}: ${matches.length ? "Reuse" : "Create"} Main Office; ${associate ? count : 0} unassigned Main Office company assignments ${apply ? "eligible" : "would be associated"}.`);
  if (!apply) return;
  const updated = await prisma.$transaction(async tx => {
    const branch = matches[0] ?? await tx.branch.upsert({ where: { companyId_name: { companyId: company.id, name: "Main Office" } }, update: {}, create: { companyId: company.id, name: "Main Office", address: company.addressLine, latitude: company.latitude, longitude: company.longitude, geofenceRadiusMeters: company.geofenceRadiusMeters, timezone: company.timezone } });
    if (!branch.isActive && associate) throw new Error("Main Office is inactive; review before associating assignments.");
    return associate ? (await tx.internshipAssignment.updateMany({ where, data: { branchId: branch.id } })).count : 0;
  });
  console.log(`Main Office ready; ${updated} assignments associated. Existing Branch relationships preserved.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  backfillMainOfficeBranch(process.argv.slice(2)).catch(() => { console.error("Backfill stopped safely. Verify company resolution, Branch uniqueness, and migration readiness. No credentials are logged."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}
