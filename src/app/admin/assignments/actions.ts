"use server";
import { branchSchemaAvailable } from "@/lib/branches/compatibility";
import { internshipAssignmentBaseSelect } from "@/lib/assignments/projection";


import { validateAssignmentBranch, requireBranchCompany } from "@/lib/branches/service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { verifyAssignmentEligibility } from "@/lib/assignments/eligibility";
import { assignmentInputSchema, canTransition, toDateOnly, toTime, type AssignmentInput, type AssignmentStatus } from "@/lib/assignments/validation";
import { requireCompanyOperationsManager } from "@/lib/auth/require-company-operations-manager";
import { prisma } from "@/lib/prisma";

export async function createAssignment(formData: FormData) {
  const administrator = await requireCompanyOperationsManager();
  const parsed = assignmentInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirectWithError("/admin/assignments/new", parsed.error.issues[0]?.message ?? "Review the submitted assignment.");
  const company = await requireBranchCompany();
  if (parsed.data.companyId !== company.id) redirectWithError("/admin/assignments/new", "Select the authorized company.");
  try { await validateAssignmentBranch(company.id, parsed.data.branchId); } catch { redirectWithError("/admin/assignments/new", "Select an active Branch for this internship."); }
  const errors = await verifyAssignmentEligibility(parsed.data);
  if (errors.length) redirectWithError("/admin/assignments/new", errors[0]);

  let assignmentId: string;
  try {
    const assignment = await prisma.internshipAssignment.create({
      data: {
        internProfileId: parsed.data.internProfileId, companyId: parsed.data.companyId, ...(await branchSchemaAvailable() ? { branchId: parsed.data.branchId ?? null } : {}),
        supervisorProfileId: parsed.data.supervisorProfileId, coordinatorProfileId: parsed.data.coordinatorProfileId,
        assignmentCode: parsed.data.assignmentCode, positionTitle: parsed.data.positionTitle ?? null,
        department: parsed.data.department ?? null, startDate: toDateOnly(parsed.data.startDate), endDate: toDateOnly(parsed.data.endDate),
        requiredHours: null, scheduleStartTime: toTime(parsed.data.scheduleStartTime), scheduleEndTime: toTime(parsed.data.scheduleEndTime),
        gracePeriodMinutes: parsed.data.gracePeriodMinutes, notes: parsed.data.notes ?? null,
        status: "PENDING", createdById: administrator.id,
      }, select: { id: true },
    });
    assignmentId = assignment.id;
  } catch (error) {
    const message = isUniqueError(error) ? "That assignment code is already in use, or the intern already has an active assignment." : "The assignment could not be created.";
    redirectWithError("/admin/assignments/new", message);
  }
  redirect(`/admin/assignments/${assignmentId}`);
}

export async function activateAssignment(formData: FormData) { await transitionAssignment(formData, "ACTIVE"); }
export async function cancelAssignment(formData: FormData) { await transitionAssignment(formData, "CANCELLED", true); }
export async function completeAssignment(formData: FormData) { await transitionAssignment(formData, "COMPLETED"); }
export async function terminateAssignment(formData: FormData) { await transitionAssignment(formData, "TERMINATED", true); }

async function transitionAssignment(formData: FormData, target: AssignmentStatus, needsConfirmation = false) {
  await requireCompanyOperationsManager();
  const assignmentId = z.string().uuid().safeParse(formData.get("assignmentId"));
  if (!assignmentId.success) redirect("/admin/assignments");
  if (needsConfirmation && formData.get("confirmed") !== "on") redirectWithError(`/admin/assignments/${assignmentId.data}`, "Confirm this lifecycle action before continuing.");

  try {
    await prisma.$transaction(async (tx) => {
      const assignment = await tx.internshipAssignment.findUnique({ select: internshipAssignmentBaseSelect,  where: { id: assignmentId.data } });
      if (!assignment) throw new LifecycleError("Assignment not found.");
      if (!canTransition(assignment.status, target)) throw new LifecycleError(`A ${assignment.status.toLowerCase()} assignment cannot be changed to ${target.toLowerCase()}.`);
      if (target === "ACTIVE") {
        const input: AssignmentInput = {
          assignmentCode: assignment.assignmentCode, internProfileId: assignment.internProfileId, companyId: assignment.companyId,
          supervisorProfileId: assignment.supervisorProfileId, coordinatorProfileId: assignment.coordinatorProfileId,
          positionTitle: assignment.positionTitle ?? undefined, department: assignment.department ?? undefined,
          startDate: dateValue(assignment.startDate), endDate: dateValue(assignment.endDate),
          scheduleStartTime: timeValue(assignment.scheduleStartTime), scheduleEndTime: timeValue(assignment.scheduleEndTime),
          gracePeriodMinutes: assignment.gracePeriodMinutes, notes: assignment.notes ?? undefined,
        };
        const parsed = assignmentInputSchema.safeParse(input);
        if (!parsed.success) throw new LifecycleError("The assignment dates or schedule are no longer valid.");
        const errors = await verifyAssignmentEligibility(parsed.data, tx as unknown as typeof prisma, assignment.id);
        if (errors.length) throw new LifecycleError(errors[0]);
      }
      const updated = await tx.internshipAssignment.updateMany({
        where: { id: assignment.id, status: assignment.status },
        data: { status: target, ...(target === "ACTIVE" ? { activatedAt: new Date() } : {}), ...(target === "COMPLETED" ? { completedAt: new Date() } : {}) },
      });
      if (updated.count !== 1) throw new LifecycleError("The assignment changed while this action was being processed. Review its current status and try again.");
    });
  } catch (error) {
    const message = error instanceof LifecycleError ? error.message : isUniqueError(error) ? "The intern already has another active assignment." : "The assignment status could not be changed.";
    redirectWithError(`/admin/assignments/${assignmentId.data}`, message);
  }
  revalidatePath("/admin"); revalidatePath("/admin/assignments"); revalidatePath(`/admin/assignments/${assignmentId.data}`);
  redirect(`/admin/assignments/${assignmentId.data}?updated=1`);
}

class LifecycleError extends Error {}
function isUniqueError(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"; }
function redirectWithError(path: string, message: string): never { redirect(`${path}?error=${encodeURIComponent(message)}`); }
function dateValue(value: Date) { return value.toISOString().slice(0, 10); }
function timeValue(value: Date | null) { return value ? `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}` : undefined; }
