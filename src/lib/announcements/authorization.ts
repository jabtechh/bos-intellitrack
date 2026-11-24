import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { prisma } from "@/lib/prisma";

export type AnnouncementViewer =
  | { user: { id: string; role: "REPRESENTATIVE" }; kind: "REPRESENTATIVE"; companyId: string }
  | { user: { id: string; role: "INTERN" }; kind: "INTERN"; schoolId: string; companyId: string | null }
  | { user: { id: string; role: "SUPERVISOR" }; kind: "SUPERVISOR"; companyId: string }
  | { user: { id: string; role: "COORDINATOR" }; kind: "COORDINATOR"; schoolId: string; companyIds: string[] };

export async function requireAnnouncementViewer(): Promise<AnnouncementViewer> {
  const user = await requireCurrentUser();

  if (user.role === "REPRESENTATIVE") {
    const profile = await prisma.representativeProfile.findFirst({
      where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } },
      select: { companyId: true },
    });
    if (profile) return { user: { id: user.id, role: "REPRESENTATIVE" }, kind: "REPRESENTATIVE", companyId: profile.companyId };
  }

  if (user.role === "INTERN") {
    const profile = await prisma.internProfile.findUnique({ where: { userId: user.id }, select: { id: true, schoolId: true } });
    if (!profile) redirect("/dashboard");
    const assignment = await prisma.internshipAssignment.findFirst({ where: { status: "ACTIVE", internProfileId: profile.id }, select: { companyId: true } });
    return { user: { id: user.id, role: "INTERN" }, kind: "INTERN", schoolId: profile.schoolId, companyId: assignment?.companyId ?? null };
  }

  if (user.role === "SUPERVISOR") {
    const profile = await prisma.supervisorProfile.findFirst({
      where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } },
      select: { companyId: true },
    });
    if (profile) return { user: { id: user.id, role: "SUPERVISOR" }, kind: "SUPERVISOR", companyId: profile.companyId };
  }

  if (user.role === "COORDINATOR") {
    const profile = await prisma.coordinatorProfile.findUnique({
      where: { userId: user.id },
      select: { schoolId: true, assignments: { where: { status: "ACTIVE" }, select: { companyId: true } } },
    });
    if (profile) {
      const companyIds=[...new Set(profile.assignments.map(row=>row.companyId))];
      return { user: { id: user.id, role: "COORDINATOR" }, kind: "COORDINATOR", schoolId: profile.schoolId, companyIds };
    }
  }

  redirect("/dashboard");
}

export function canManageAnnouncements(c: AnnouncementViewer): boolean {
  return c.kind === "REPRESENTATIVE";
}

export function announcementManageWhere(c: AnnouncementViewer): Prisma.AnnouncementWhereInput {
  return c.kind === "REPRESENTATIVE" ? { companyId: c.companyId } : { id: "__not_manageable__" };
}

export function announcementReaderWhere(c: AnnouncementViewer): Prisma.AnnouncementWhereInput {
  const now = new Date();
  const base = {
    status: "PUBLISHED" as const,
    publishedAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };

  const audiences: Prisma.AnnouncementWhereInput[] = [];
  if (c.kind === "INTERN") {
    if (c.companyId) {
      audiences.push({ audience: "ALL_USERS", companyId: c.companyId });
      audiences.push({ audience: "INTERNS", companyId: c.companyId });
      audiences.push({ audience: "COMPANY", companyId: c.companyId });
    }
    audiences.push({ audience: "SCHOOL", schoolId: c.schoolId });
  } else if (c.kind === "SUPERVISOR") {
    audiences.push({ audience: "ALL_USERS", companyId: c.companyId });
    audiences.push({ audience: "SUPERVISORS", companyId: c.companyId });
    audiences.push({ audience: "COMPANY", companyId: c.companyId });
  } else if (c.kind === "REPRESENTATIVE") {
    audiences.push({ audience: "ALL_USERS", companyId: c.companyId });
    audiences.push({ audience: "REPRESENTATIVES", companyId: c.companyId });
    audiences.push({ audience: "COMPANY", companyId: c.companyId });
  } else {
    if (c.companyIds.length) audiences.push({ audience: "ALL_USERS", companyId: { in: c.companyIds } });
    audiences.push({ audience: "SCHOOL", schoolId: c.schoolId });
    audiences.push({ audience: "COORDINATORS", schoolId: c.schoolId });
  }
  return { ...base, AND: [{ OR: audiences.length ? audiences : [{ id: "__none__" }] }] };
}
