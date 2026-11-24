import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { BO_COFFEE_OFFICE_CODE } from "@/lib/organization/bo-coffee";
import { prisma } from "@/lib/prisma";

export async function requireEvaluationViewer() {
  const user = await requireCurrentUser();
  if (user.role === "INTERN") {
    const profile = await prisma.internProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (profile) return { user, kind: "INTERN" as const, profileId: profile.id };
  }
  if (user.role === "SUPERVISOR") {
    const profile = await prisma.supervisorProfile.findFirst({
      where: {
        userId: user.id,
        company: { companyCode: BO_COFFEE_OFFICE_CODE, isActive: true },
      },
      select: { id: true },
    });
    if (profile) return { user, kind: "SUPERVISOR" as const, profileId: profile.id };
  }
  if (user.role === "COORDINATOR") {
    const profile = await prisma.coordinatorProfile.findUnique({
      where: { userId: user.id },
      select: { schoolId: true },
    });
    if (profile) return { user, kind: "COORDINATOR" as const, schoolId: profile.schoolId };
  }
  redirect("/dashboard");
}

type Context = Awaited<ReturnType<typeof requireEvaluationViewer>>;

export function evaluationWhere(c: Context): Prisma.EvaluationWhereInput {
  if (c.kind === "INTERN") {
    return {
      status: { in: ["SUBMITTED", "ACKNOWLEDGED"] },
      assignment: { internProfileId: c.profileId },
    };
  }
  if (c.kind === "SUPERVISOR") {
    return { assignment: { supervisorProfileId: c.profileId } };
  }
  return {
    status: { in: ["SUBMITTED", "ACKNOWLEDGED"] },
    assignment: { internProfile: { schoolId: c.schoolId } },
  };
}

export function feedbackWhere(c: Context): Prisma.FeedbackWhereInput {
  if (c.kind === "INTERN") {
    return {
      recipientId: c.user.id,
      visibility: { in: ["INTERN_AND_STAFF", "INTERN_ONLY"] },
    };
  }
  if (c.kind === "SUPERVISOR") {
    return {
      assignment: { supervisorProfileId: c.profileId },
      visibility: { in: ["INTERN_AND_STAFF", "STAFF_ONLY"] },
    };
  }
  return { id: "__coordinator_feedback_workspace_disabled__" };
}

export async function requireSupervisorEvaluationContext() {
  const c = await requireEvaluationViewer();
  if (c.kind !== "SUPERVISOR") redirect("/evaluations");
  return c;
}
