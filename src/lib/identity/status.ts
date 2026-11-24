// SERVER-ONLY MODULE — face photo state for page rendering (DEC-2026-019).
import { prisma } from "@/lib/prisma";

export type IdentityReferenceState = {
  approved: boolean;
  approvedReferenceId: string | null;
  approvedAt: Date | null;
  /** Supervisor's reason when the most recent face photo was reset. */
  resetRemarks: string | null;
};

export async function identityReferenceState(userId: string): Promise<IdentityReferenceState> {
  const latest = await prisma.identityReference.findFirst({
    where: { internProfile: { userId }, status: { in: ["APPROVED", "REJECTED"] } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, status: true, decidedAt: true, decisionRemarks: true },
  });
  const approved = latest?.status === "APPROVED" ? latest : await prisma.identityReference.findFirst({ where: { internProfile: { userId }, status: "APPROVED" }, select: { id: true, status: true, decidedAt: true, decisionRemarks: true } });
  return {
    approved: Boolean(approved),
    approvedReferenceId: approved?.id ?? null,
    approvedAt: approved?.decidedAt ?? null,
    resetRemarks: !approved && latest?.status === "REJECTED" ? latest.decisionRemarks : null,
  };
}
