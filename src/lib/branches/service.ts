import { branchSchemaAvailable } from "./compatibility";
import { branchOperations } from "./operations";
import { prisma } from "@/lib/prisma";
import { requireCompanyOperationsManager } from "@/lib/auth/require-company-operations-manager";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { branchSelectionError } from "./domain";

export async function requireBranchCompany() {
  await requireCompanyOperationsManager();
  const company = await prisma.company.findUnique({ where: { companyCode: BO_COFFEE_OFFICE_CODE } });
  if (!company?.isActive) throw new Error("Configure the company before managing Branches.");
  return company;
}

const operations = branchOperations(prisma, requireBranchCompany);
export async function listBranches(activeOnly = false) { await requireBranchCompany(); if (!await branchSchemaAvailable()) return []; return operations.list(activeOnly); }
export async function getBranch(id: string) { await requireBranchCompany(); if (!await branchSchemaAvailable()) return null; return operations.get(id); }
export async function saveBranch(input: unknown, id?: string) { await requireBranchCompany(); if (!await branchSchemaAvailable()) throw new Error("Branch setup is not initialized."); return operations.save(input, id); }
export async function deactivateBranch(id: string) { await requireBranchCompany(); if (!await branchSchemaAvailable()) throw new Error("Branch setup is not initialized."); return operations.deactivate(id); }

// Internal assignment validation; callers must first authorize the operation.
export async function validateAssignmentBranch(companyId: string, branchId?: string, reader: Pick<typeof prisma, "branch"> = prisma) {
  if (!await branchSchemaAvailable()) {
    if (branchId) throw new Error("Branch setup is not initialized.");
    return;
  }
  const active = await reader.branch.findMany({ where: { companyId, isActive: true }, select: { id: true } });
  const error = branchSelectionError(branchId, active);
  if (error) throw new Error(error);
}
