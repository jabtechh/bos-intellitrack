import type { Prisma } from "@/generated/prisma/client";
import { requirePortfolioViewer, portfolioAssignmentWhere, type PortfolioContext } from "@/lib/portfolio/authorization";

export const requireInsightsViewer = requirePortfolioViewer;
export type InsightsContext = PortfolioContext;

export function insightAssignmentWhere(context: InsightsContext): Prisma.InternshipAssignmentWhereInput {
  return portfolioAssignmentWhere(context);
}

export function insightForInternWhere(context: InsightsContext, internUserId: string): Prisma.InternshipAssignmentWhereInput {
  return { AND: [insightAssignmentWhere(context), { internProfile: { userId: internUserId } }] };
}
