import "server-only";

import { prisma } from "@/lib/prisma";
import { portfolioAssignmentWhere, type PortfolioContext } from "./authorization";
import { buildAutomaticPortfolio, type AutomaticPortfolio } from "./automatic";
import { parseCompletionSnapshot, type CompletionSnapshot } from "./snapshot";
import { PORTFOLIO_ASSIGNMENT_STATUSES as PORTFOLIO_STATUSES, portfolioCandidateWhere, portfolioEvidenceMode, type PortfolioEvidenceMode } from "./scope";
import { getInternReport } from "@/lib/reports/data";

/**
 * Evidence modes (see ./scope): LIVE = active internship, current eligible evidence; SNAPSHOT = completed
 * internship with its saved completion snapshot; LEGACY_ON_DEMAND = completed before automatic snapshots
 * existed, compiled on demand and honestly labelled (no saved snapshot is claimed).
 */
export type { PortfolioEvidenceMode };

const assignmentSelect = {
  id: true,
  status: true,
  positionTitle: true,
  startDate: true,
  endDate: true,
  completedAt: true,
  requiredHours: true,
  company: { select: { name: true } },
  internProfile: { select: { userId: true } },
  portfolio: true,
} as const;

/**
 * Resolves the Portfolio assignment. A client-supplied `candidateId` is only a candidate: it is
 * re-authorized against the signed-in Intern's own profile and the approved Main Office scope, and an
 * unauthorized or unknown candidate yields null (callers respond 404) instead of falling back to another
 * internship. Without a candidate, the active internship is preferred, then the most recent completed one.
 */
export async function getPortfolioAssignment(context: PortfolioContext, candidateId?: string | null) {
  const where = { ...portfolioAssignmentWhere(context), status: { in: [...PORTFOLIO_STATUSES] } };
  if (candidateId !== undefined && candidateId !== null) {
    const candidate = portfolioCandidateWhere(context.profileId, candidateId);
    return candidate ? prisma.internshipAssignment.findFirst({ where: candidate, select: assignmentSelect }) : null;
  }
  return await prisma.internshipAssignment.findFirst({ where: { ...where, status: "ACTIVE" }, select: assignmentSelect, orderBy: { startDate: "desc" } })
    ?? await prisma.internshipAssignment.findFirst({ where: { ...where, status: "COMPLETED" }, select: assignmentSelect, orderBy: [{ endDate: "desc" }, { id: "asc" }] });
}

export type PortfolioAssignment = NonNullable<Awaited<ReturnType<typeof getPortfolioAssignment>>>;

export async function getPortfolioSource(context: PortfolioContext, candidateId?: string | null) {
  const assignment = await getPortfolioAssignment(context, candidateId);
  if (!assignment) return null;
  const report = await getInternReport(context, assignment.internProfile.userId, {}, assignment.id);
  if (!report) return null;
  const snapshot: CompletionSnapshot | null = assignment.status === "COMPLETED" ? parseCompletionSnapshot(assignment.portfolio?.sourceSnapshot, assignment.id) : null;
  const mode = portfolioEvidenceMode(assignment, assignment.portfolio?.sourceSnapshot);
  const evidence: AutomaticPortfolio = snapshot ? snapshot.evidence : buildAutomaticPortfolio(report);
  return { assignment, report, snapshot, mode, evidence };
}

export type PortfolioArchiveEntry = {
  assignmentId: string;
  status: (typeof PORTFOLIO_STATUSES)[number];
  title: string;
  companyName: string;
  positionTitle: string | null;
  startDate: Date;
  endDate: Date;
  completedAt: Date | null;
  creditedMinutes: number;
  requiredHours: number | null;
  mode: PortfolioEvidenceMode;
  portfolioStatus: string | null;
  snapshotAt: string | null;
  /** DEC-2026-021: the internship's own certificate, when one was issued. */
  certificateStatus: string | null;
};

/** Every active and completed internship of the signed-in Intern, each with its own Portfolio. */
export async function listPortfolioArchive(context: PortfolioContext): Promise<PortfolioArchiveEntry[]> {
  const rows = await prisma.internshipAssignment.findMany({
    where: { ...portfolioAssignmentWhere(context), status: { in: [...PORTFOLIO_STATUSES] } },
    select: { ...assignmentSelect, certificate: { select: { status: true } }, attendance: { where: { status: "APPROVED" }, select: { creditedMinutes: true } } },
    orderBy: [{ startDate: "desc" }, { id: "asc" }],
  });
  return rows
    .map((row) => {
      const status = row.status as PortfolioArchiveEntry["status"];
      const snapshot = status === "COMPLETED" ? parseCompletionSnapshot(row.portfolio?.sourceSnapshot, row.id) : null;
      return {
        assignmentId: row.id,
        status,
        title: row.portfolio?.title ?? `${row.positionTitle?.trim() || "Internship"} Portfolio`,
        companyName: row.company.name,
        positionTitle: row.positionTitle,
        startDate: row.startDate,
        endDate: row.endDate,
        completedAt: row.completedAt,
        // A saved completion snapshot is authoritative for its own credited hours.
        creditedMinutes: snapshot ? snapshot.evidence.creditedMinutes : row.attendance.reduce((sum, a) => sum + a.creditedMinutes, 0),
        requiredHours: row.requiredHours,
        mode: portfolioEvidenceMode(row, row.portfolio?.sourceSnapshot),
        portfolioStatus: row.portfolio?.status ?? null,
        snapshotAt: snapshot?.completedAt ?? null,
        certificateStatus: row.certificate?.status ?? null,
      };
    })
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "ACTIVE" ? -1 : 1));
}

export function portfolioHref(assignmentId: string, path: "" | "/edit" | "/pdf" = "") {
  return `/portfolio${path}?assignment=${encodeURIComponent(assignmentId)}`;
}
