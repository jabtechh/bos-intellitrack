// DEC-2026-020 — completion-time Portfolio snapshot.
//
// When an internship assignment becomes COMPLETED, its one Portfolio row receives a
// deterministic snapshot of the eligible evidence for THAT assignment, built with the
// same canonical report selection as the authorized Intern report. The snapshot is
// system-generated: no Gemini call, no inferred proficiency, no raw selfies, identity
// data or private document contents, and never FINALIZED/approved automatically.
// Intern-authored narrative fields are never written here.
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { buildAutomaticPortfolio, type AutomaticPortfolio } from "@/lib/portfolio/automatic";
import { internReportSelect } from "@/lib/reports/select";

export const COMPLETION_SNAPSHOT_KIND = "INTELLITRACK_PORTFOLIO_COMPLETION_SNAPSHOT";
export const COMPLETION_SNAPSHOT_VERSION = 1;

export type CompletionSnapshot = {
  kind: typeof COMPLETION_SNAPSHOT_KIND;
  schemaVersion: typeof COMPLETION_SNAPSHOT_VERSION;
  assignmentId: string;
  completedAt: string;
  internship: { companyName: string; positionTitle: string | null; department: string | null; startDate: string; endDate: string; requiredHours: number | null; supervisorName: string | null };
  evidence: AutomaticPortfolio;
};

type Db = PrismaClient | Prisma.TransactionClient;

export class PortfolioSnapshotError extends Error {}

const day = (value: Date) => value.toISOString().slice(0, 10);

/** Loads the canonical eligible evidence for exactly one assignment (Intern-visible Feedback rules). */
export async function loadSnapshotSource(db: Db, assignmentId: string) {
  return db.internshipAssignment.findUnique({
    where: { id: assignmentId },
    select: { ...internReportSelect("INTERN"), id: true, positionTitle: true, department: true, completedAt: true, company: { select: { name: true } } },
  });
}

export type SnapshotSource = NonNullable<Awaited<ReturnType<typeof loadSnapshotSource>>>;

/** Pure and deterministic for a given source and completion time. */
export function buildCompletionSnapshot(source: SnapshotSource, completedAt: Date): CompletionSnapshot {
  const supervisor = source.supervisorProfile?.user;
  return {
    kind: COMPLETION_SNAPSHOT_KIND,
    schemaVersion: COMPLETION_SNAPSHOT_VERSION,
    assignmentId: source.id,
    completedAt: completedAt.toISOString(),
    internship: {
      companyName: source.company.name,
      positionTitle: source.positionTitle ?? null,
      department: source.department ?? null,
      startDate: day(source.startDate),
      endDate: day(source.endDate),
      requiredHours: source.requiredHours === null ? null : Number(source.requiredHours),
      supervisorName: supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : null,
    },
    evidence: buildAutomaticPortfolio({ ...source, requiredHours: source.requiredHours === null ? null : Number(source.requiredHours) }),
  };
}

/**
 * Accepts a stored snapshot only if it is a well-formed completion snapshot for
 * `assignmentId`. A snapshot can never be shown for a different assignment.
 */
export function parseCompletionSnapshot(value: unknown, assignmentId: string): CompletionSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const snapshot = value as Partial<CompletionSnapshot>;
  if (snapshot.kind !== COMPLETION_SNAPSHOT_KIND || snapshot.schemaVersion !== COMPLETION_SNAPSHOT_VERSION) return null;
  if (snapshot.assignmentId !== assignmentId || typeof snapshot.completedAt !== "string") return null;
  const evidence = snapshot.evidence as Partial<AutomaticPortfolio> | undefined;
  if (!snapshot.internship || !evidence || typeof evidence.creditedMinutes !== "number" || !Array.isArray(evidence.tasks) || !Array.isArray(evidence.workLogs) || !Array.isArray(evidence.skills)) return null;
  return snapshot as CompletionSnapshot;
}

export function defaultPortfolioTitle(positionTitle: string | null | undefined) {
  return `${positionTitle?.trim() || "Internship"} Portfolio`;
}

/**
 * Creates or refreshes the assignment's single Portfolio with a completion snapshot.
 * Must run inside the same transaction as the COMPLETED transition. Idempotent:
 * the unique assignmentId guarantees one row, and narrative fields are untouched.
 */
export async function persistCompletionPortfolio(db: Db, input: { assignmentId: string; completedAt: Date }) {
  const source = await loadSnapshotSource(db, input.assignmentId);
  if (!source) throw new PortfolioSnapshotError("Assignment not found for Portfolio snapshot.");
  if (source.status !== "COMPLETED") throw new PortfolioSnapshotError("Portfolio snapshots are created only for completed assignments.");
  const snapshot = buildCompletionSnapshot(source, input.completedAt);
  const sourceSnapshot = snapshot as unknown as Prisma.InputJsonValue;
  const existing = await db.portfolio.findUnique({ where: { assignmentId: input.assignmentId }, select: { id: true, status: true } });
  // A human-finalized or archived Portfolio keeps its status; system generation never claims approval.
  const status = existing && (existing.status === "FINALIZED" || existing.status === "ARCHIVED") ? existing.status : "GENERATED";
  const portfolio = await db.portfolio.upsert({
    where: { assignmentId: input.assignmentId },
    create: { assignmentId: input.assignmentId, title: defaultPortfolioTitle(source.positionTitle), sourceSnapshot, status: "GENERATED", aiGenerated: false },
    // Only system-owned fields change. Title, summary, skills, achievements, selected work and reflection are preserved.
    update: { sourceSnapshot, status },
    select: { id: true, status: true },
  });
  return { portfolioId: portfolio.id, status: portfolio.status, snapshot };
}
