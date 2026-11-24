// SERVER-ONLY MODULE — DEC-2026-021 Amendment A: issue automatically once the intern meets all checks.
// Called when the intern opens their own dashboard or certificate pages; idempotent and race-safe.
import { prisma } from "@/lib/prisma";
import { issueCertificateInTransaction } from "./issue";

export async function ensureCertificateIssued(assignmentId: string) {
  try {
    return await prisma.$transaction((tx) => issueCertificateInTransaction(tx, { assignmentId, now: new Date() }));
  } catch (error) {
    // Two simultaneous page loads can race on the unique assignment_id; the other request issued it.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return null;
    throw error;
  }
}
