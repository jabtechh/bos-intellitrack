import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { prisma } from "@/lib/prisma";

export async function requireDocumentViewer() {
  const user = await requireCurrentUser();
  if (user.role === "INTERN") {
    const profile = await prisma.internProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (profile) return { user, kind: "INTERN" as const, profileId: profile.id };
  }
  if (user.role === "SUPERVISOR") {
    const profile = await prisma.supervisorProfile.findFirst({
      where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } },
      select: { id: true },
    });
    if (profile) return { user, kind: "SUPERVISOR" as const, profileId: profile.id };
  }
  if (user.role === "COORDINATOR") {
    const profile = await prisma.coordinatorProfile.findUnique({ where: { userId: user.id }, select: { schoolId: true } });
    if (profile) return { user, kind: "COORDINATOR" as const, schoolId: profile.schoolId };
  }
  if (user.role === "REPRESENTATIVE") {
    const profile = await prisma.representativeProfile.findFirst({
      where: { userId: user.id, company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true } },
      select: { companyId: true },
    });
    if (profile) return { user, kind: "REPRESENTATIVE" as const, companyId: profile.companyId };
  }
  redirect("/dashboard");
}

type C = Awaited<ReturnType<typeof requireDocumentViewer>>;

export function documentWhere(c: C): Prisma.DocumentWhereInput {
  if (c.kind === "INTERN") return { assignment: { internProfileId: c.profileId }, status: { not: "ARCHIVED" } };
  if (c.kind === "SUPERVISOR") return { assignment: { supervisorProfileId: c.profileId }, status: { not: "ARCHIVED" } };
  if (c.kind === "COORDINATOR") {
    return {
      assignment: { internProfile: { schoolId: c.schoolId } },
      category: { notIn: ["IDENTIFICATION", "MEDICAL_DOCUMENT"] },
      status: { not: "ARCHIVED" },
    };
  }
  return { assignment: { companyId: c.companyId } };
}

export function canManageDocuments(c: C) {
  return c.kind === "REPRESENTATIVE";
}
