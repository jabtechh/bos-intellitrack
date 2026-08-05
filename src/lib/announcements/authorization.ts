import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import type { AnnouncementAudience } from "@/generated/prisma/enums";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { prisma } from "@/lib/prisma";

export type AnnouncementViewer =
  | { user: { id: string; role: "ADMIN" }; kind: "ADMIN" }
  | { user: { id: string; role: "REPRESENTATIVE" }; kind: "REPRESENTATIVE"; companyId: string }
  | { user: { id: string; role: "INTERN" }; kind: "INTERN"; schoolId: string; companyId: string | null }
  | { user: { id: string; role: "SUPERVISOR" }; kind: "SUPERVISOR"; companyId: string }
  | { user: { id: string; role: "COORDINATOR" }; kind: "COORDINATOR"; schoolId: string };

export async function requireAnnouncementViewer(): Promise<AnnouncementViewer> {
  const user = await requireCurrentUser();

  if (user.role === "ADMIN") {
    const company = await prisma.company.findFirst({
      where: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true },
      select: { id: true },
    });
    if (!company) redirect("/dashboard");
    return { user: { id: user.id, role: "ADMIN" }, kind: "ADMIN" };
  }

  if (user.role === "REPRESENTATIVE") {
    const profile = await prisma.representativeProfile.findFirst({
      where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } },
      select: { companyId: true },
    });
    if (!profile) redirect("/dashboard");
    return { user: { id: user.id, role: "REPRESENTATIVE" }, kind: "REPRESENTATIVE", companyId: profile.companyId };
  }

  if (user.role === "INTERN") {
    const profile = await prisma.internProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, schoolId: true },
    });
    if (!profile) redirect("/dashboard");
    const assignment = await prisma.internshipAssignment.findFirst({
      where: { status: "ACTIVE", internProfileId: profile.id },
      select: { companyId: true },
    });
    return {
      user: { id: user.id, role: "INTERN" },
      kind: "INTERN",
      schoolId: profile.schoolId,
      companyId: assignment?.companyId ?? null,
    };
  }

  if (user.role === "SUPERVISOR") {
    const profile = await prisma.supervisorProfile.findFirst({
      where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } },
      select: { companyId: true },
    });
    if (!profile) redirect("/dashboard");
    return { user: { id: user.id, role: "SUPERVISOR" }, kind: "SUPERVISOR", companyId: profile.companyId };
  }

  if (user.role === "COORDINATOR") {
    const profile = await prisma.coordinatorProfile.findUnique({
      where: { userId: user.id },
      select: { schoolId: true },
    });
    if (!profile) redirect("/dashboard");
    return { user: { id: user.id, role: "COORDINATOR" }, kind: "COORDINATOR", schoolId: profile.schoolId };
  }

  redirect("/dashboard");
}

export function canManageAnnouncements(c: AnnouncementViewer): boolean {
  return c.kind === "ADMIN" || c.kind === "REPRESENTATIVE";
}

export function announcementManageWhere(c: AnnouncementViewer): Prisma.AnnouncementWhereInput {
  if (c.kind === "ADMIN") return {};
  if (c.kind === "REPRESENTATIVE") return { companyId: c.companyId };
  return {};
}

export function announcementReaderWhere(c: AnnouncementViewer): Prisma.AnnouncementWhereInput {
  const now = new Date();
  const base: Prisma.AnnouncementWhereInput = {
    status: "PUBLISHED",
    publishedAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };

  if (c.kind === "ADMIN") {
    return base;
  }

  const audienceConditions: Prisma.AnnouncementWhereInput[] = [{ audience: "ALL_USERS" }];

  if (c.kind === "INTERN") {
    audienceConditions.push({ audience: "INTERNS" });
    audienceConditions.push({ audience: "SCHOOL", schoolId: c.schoolId });
    if (c.companyId) audienceConditions.push({ audience: "COMPANY", companyId: c.companyId });
  }

  if (c.kind === "SUPERVISOR") {
    audienceConditions.push({ audience: "SUPERVISORS" });
    audienceConditions.push({ audience: "COMPANY", companyId: c.companyId });
  }

  if (c.kind === "COORDINATOR") {
    audienceConditions.push({ audience: "COORDINATORS" });
    audienceConditions.push({ audience: "SCHOOL", schoolId: c.schoolId });
  }

  if (c.kind === "REPRESENTATIVE") {
    audienceConditions.push({ audience: "REPRESENTATIVES" });
    audienceConditions.push({ audience: "COMPANY", companyId: c.companyId });
  }

  return { ...base, OR: audienceConditions };
}

export function audienceMatchesRole(
  audience: AnnouncementAudience,
  c: AnnouncementViewer,
): boolean {
  if (audience === "ALL_USERS") return true;
  if (c.kind === "ADMIN") return true;

  if (audience === "INTERNS") return c.kind === "INTERN";
  if (audience === "SUPERVISORS") return c.kind === "SUPERVISOR";
  if (audience === "COORDINATORS") return c.kind === "COORDINATOR";
  if (audience === "REPRESENTATIVES") return c.kind === "REPRESENTATIVE";
  if (audience === "ADMINISTRATORS") return false;

  if (audience === "SCHOOL") {
    if (c.kind === "INTERN" || c.kind === "COORDINATOR") return true;
    return false;
  }

  if (audience === "COMPANY") {
    if (c.kind === "SUPERVISOR" || c.kind === "REPRESENTATIVE") return true;
    if (c.kind === "INTERN" && c.companyId) return true;
    return false;
  }

  return false;
}