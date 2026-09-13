import type { PrismaClient } from "@/generated/prisma/client";

export function branchCompatibility(reader: Pick<PrismaClient, "$queryRaw" | "internshipAssignment">) {
  async function available(): Promise<boolean> {
  const rows = await reader.$queryRaw<{ available: boolean }[]>`
    SELECT (
      EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'internship_assignments' AND column_name = 'branch_id')
      AND EXISTS (SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema() AND table_name = 'branches')
    ) AS available
  `;
  return rows[0]?.available === true;
  }
  async function assignment(assignmentId: string) {
    if (!await available()) return null;
    const row = await reader.internshipAssignment.findUnique({ where: { id: assignmentId }, select: { branch: true } });
    return row?.branch ?? null;
  }
  return { available, assignment };
}
