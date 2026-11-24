// DEC-2026-020 / DEC-2026-021 — the COMPLETED transition and its Portfolio snapshot are one unit of work, and
// a Certificate of Completion is issued in the same transaction when the intern already meets the three checks
// (hours, daily Work Logs, Getting started). Call only inside the caller's database transaction: any failure
// throws, so the transaction rolls back.
import type { Prisma } from "@/generated/prisma/client";
import type { InternshipStatus } from "@/generated/prisma/enums";
import { CertificateIssueError, issueCertificateInTransaction } from "@/lib/certificates/issue";
import { persistCompletionPortfolio, PortfolioSnapshotError } from "@/lib/portfolio/snapshot";

export class AssignmentChangedError extends Error {}

export type CompletionDeps = {
  persist: typeof persistCompletionPortfolio;
  issue: typeof issueCertificateInTransaction;
};
const defaults: CompletionDeps = { persist: persistCompletionPortfolio, issue: issueCertificateInTransaction };

export async function completeAssignmentInTransaction(
  tx: Prisma.TransactionClient,
  input: { assignmentId: string; companyId: string; fromStatus: InternshipStatus; now: Date },
  deps: Partial<CompletionDeps> = {},
) {
  const { persist, issue } = { ...defaults, ...deps };
  const updated = await tx.internshipAssignment.updateMany({
    where: { id: input.assignmentId, companyId: input.companyId, status: input.fromStatus },
    data: { status: "COMPLETED", completedAt: input.now },
  });
  if (updated.count !== 1) throw new AssignmentChangedError("The assignment changed while this action was being processed.");
  let portfolio: Awaited<ReturnType<typeof persistCompletionPortfolio>>;
  try {
    portfolio = await persist(tx, { assignmentId: input.assignmentId, completedAt: input.now });
  } catch (error) {
    throw error instanceof PortfolioSnapshotError ? error : new PortfolioSnapshotError("The internship Portfolio snapshot could not be saved.");
  }
  try {
    // Issued only when eligible; otherwise the intern keeps seeing the preview and what is missing.
    const certificate = await issue(tx, { assignmentId: input.assignmentId, now: input.now });
    return { ...portfolio, certificate };
  } catch (error) {
    throw error instanceof CertificateIssueError ? error : new CertificateIssueError("The Certificate of Completion could not be issued.");
  }
}
