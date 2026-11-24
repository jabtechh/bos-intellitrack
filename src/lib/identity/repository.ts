// Prisma implementation of the identity repository. Accepts either the app
// client or an interactive-transaction client (used by rollback-only tests).
import type { IdentityRepository } from "@/lib/identity/service";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export type IdentityDb = PrismaClient | Prisma.TransactionClient;

export function prismaIdentityRepository(db: IdentityDb): IdentityRepository {
  const transact = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => ("$transaction" in db && typeof db.$transaction === "function" ? (db as PrismaClient).$transaction(fn) : fn(db));
  const referenceSelect = { id: true, internProfileId: true, status: true, storagePath: true, replacesId: true } as const;
  return {
    async createSession(row) { await db.identityCaptureSession.create({ data: row }); },
    async findSession(id) { return db.identityCaptureSession.findUnique({ where: { id }, select: { id: true, userId: true, purpose: true, secretHash: true, expiresAt: true, consumedAt: true } }); },
    async consumeSession(id, now) {
      const result = await db.identityCaptureSession.updateMany({ where: { id, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
      return result.count === 1;
    },
    async findReferences(internProfileId, statuses) {
      return db.identityReference.findMany({ where: { internProfileId, status: { in: statuses } }, select: referenceSelect, orderBy: { createdAt: "desc" } });
    },
    async findReferenceScope(referenceId) {
      const row = await db.identityReference.findUnique({
        where: { id: referenceId },
        select: { ...referenceSelect, internProfile: { select: { userId: true, assignments: { where: { status: "ACTIVE" }, select: { supervisorProfile: { select: { userId: true } } } } } } },
      });
      if (!row) return null;
      const { internProfile, ...reference } = row;
      return { reference, internUserId: internProfile.userId, assignedSupervisorUserIds: internProfile.assignments.flatMap((a) => (a.supervisorProfile ? [a.supervisorProfile.userId] : [])) };
    },
    async activateReference({ reference, expectedCurrentId, enrolledByUserId, now, remarks }) {
      return transact(async (tx) => {
        const internProfileId = reference.internProfileId;
        // Legacy PENDING rows (created before automatic enrollment) are retired with the old photo.
        const current = await tx.identityReference.findMany({ where: { internProfileId, status: { in: ["APPROVED", "PENDING"] } }, select: { id: true, status: true, storagePath: true } });
        const approvedId = current.find((row) => row.status === "APPROVED")?.id ?? null;
        if (approvedId !== expectedCurrentId) return { ok: false, supersededPaths: [] };
        for (const row of current) {
          const retired = await tx.identityReference.updateMany({ where: { id: row.id, status: row.status }, data: { status: "SUPERSEDED", decidedById: null, decidedAt: now } });
          if (retired.count !== 1) throw new Error("concurrent identity change");
          await tx.identityReferenceEvent.create({ data: { referenceId: row.id, internProfileId, actorUserId: null, action: "SUPERSEDED", remarks: `Replaced by ${reference.id}` } });
        }
        await tx.identityReference.create({ data: { ...reference, status: "APPROVED", decidedById: null, decidedAt: now, decisionRemarks: remarks } });
        await tx.identityReferenceEvent.create({ data: { referenceId: reference.id, internProfileId, actorUserId: enrolledByUserId, action: expectedCurrentId ? "REPLACEMENT_REQUESTED" : "ENROLLED", remarks: null } });
        await tx.identityReferenceEvent.create({ data: { referenceId: reference.id, internProfileId, actorUserId: null, action: "APPROVED", remarks } });
        return { ok: true, supersededPaths: current.map((row) => row.storagePath) };
      });
    },
    async revokeReference({ referenceId, actorUserId, now, remarks }) {
      return transact(async (tx) => {
        const target = await tx.identityReference.findUnique({ where: { id: referenceId }, select: { internProfileId: true } });
        if (!target) return false;
        const updated = await tx.identityReference.updateMany({ where: { id: referenceId, status: "APPROVED" }, data: { status: "REJECTED", decidedById: actorUserId, decidedAt: now, decisionRemarks: remarks } });
        if (updated.count !== 1) return false;
        await tx.identityReferenceEvent.create({ data: { referenceId, internProfileId: target.internProfileId, actorUserId, action: "REJECTED", remarks } });
        return true;
      });
    },
    async recordAttempt(row) { return (await db.identityVerificationAttempt.create({ data: row, select: { id: true } })).id; },
    async linkAttempt(attemptId, attendanceId) { await db.identityVerificationAttempt.update({ where: { id: attemptId }, data: { attendanceId } }); },
  };
}
