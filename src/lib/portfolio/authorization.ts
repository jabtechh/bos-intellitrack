import type { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { prisma } from "@/lib/prisma";
import { portfolioScopeWhere } from "./scope";

export async function requirePortfolioViewer() {
  const user = await requireCurrentUser();
  if (user.role !== "INTERN") redirect("/dashboard");
  const profile = await prisma.internProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!profile) redirect("/dashboard");
  return { user, kind: "INTERN" as const, profileId: profile.id };
}

export type PortfolioContext = Awaited<ReturnType<typeof requirePortfolioViewer>>;

export function portfolioAssignmentWhere(c: PortfolioContext): Prisma.InternshipAssignmentWhereInput {
  return portfolioScopeWhere(c.profileId);
}

export function portfolioForInternWhere(c: PortfolioContext, internUserId: string): Prisma.InternshipAssignmentWhereInput {
  return {
    AND: [
      portfolioAssignmentWhere(c),
      { internProfile: { userId: internUserId } },
    ],
  };
}
