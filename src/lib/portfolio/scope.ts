// DEC-2026-020 — pure Portfolio scope rules shared by the app and its tests.
import type { Prisma } from "@/generated/prisma/client";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { parseCompletionSnapshot } from "./snapshot";

/** Internships that own a Portfolio in the archive. */
export const PORTFOLIO_ASSIGNMENT_STATUSES = ["ACTIVE", "COMPLETED"] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The signed-in Intern's own internships in the approved Bo's Coffee Main Office scope. */
export function portfolioScopeWhere(internProfileId: string): Prisma.InternshipAssignmentWhereInput {
  return { internProfileId, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } };
}

/**
 * A client-supplied assignment ID is only a candidate. It matches only when it is one of the Intern's own
 * active/completed Main Office internships; anything else (malformed, another Intern's, another company's)
 * returns null so the caller responds 404 rather than substituting a different internship.
 */
export function portfolioCandidateWhere(internProfileId: string, candidateId: unknown): Prisma.InternshipAssignmentWhereInput | null {
  if (typeof candidateId !== "string" || !UUID.test(candidateId)) return null;
  return { AND: [portfolioScopeWhere(internProfileId), { status: { in: [...PORTFOLIO_ASSIGNMENT_STATUSES] } }, { id: candidateId }] };
}

export type PortfolioEvidenceMode = "LIVE" | "SNAPSHOT" | "LEGACY_ON_DEMAND";

/** LIVE for the active internship; SNAPSHOT only when a valid snapshot for this exact assignment exists. */
export function portfolioEvidenceMode(assignment: { id: string; status: string }, sourceSnapshot: unknown): PortfolioEvidenceMode {
  if (assignment.status !== "COMPLETED") return "LIVE";
  return parseCompletionSnapshot(sourceSnapshot, assignment.id) ? "SNAPSHOT" : "LEGACY_ON_DEMAND";
}
