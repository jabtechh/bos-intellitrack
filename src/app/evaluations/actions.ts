"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireEvaluationViewer, requireSupervisorEvaluationContext } from "@/lib/evaluations/authorization";
import { asDate, evaluationInputSchema, feedbackInputSchema, parseCriteria } from "@/lib/evaluations/domain";
import { resolveEvaluationPeriod } from "@/lib/evaluations/period-for-save";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function refresh(id?: string) {
  revalidatePath("/evaluations");
  revalidatePath("/evaluations/review");
  revalidatePath("/insights");
  revalidatePath("/reports");
  revalidatePath("/portfolio");
  revalidatePath("/feedback");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/evaluations/${id}`);
}

async function assignmentFor(supervisorProfileId: string, internUserId: string) {
  return prisma.internshipAssignment.findFirst({
    where: {
      status: "ACTIVE",
      supervisorProfileId,
      internProfile: { userId: internUserId, user: { isActive: true } },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      company: { select: { timezone: true } },
      internProfile: { select: { userId: true } },
    },
  });
}

function duplicateMessage(type: "INITIAL" | "MIDTERM" | "PROGRESS" | "FINAL") {
  return type === "PROGRESS"
    ? "A weekly progress evaluation already exists for the selected week, including draft or voided records. Open the existing evaluation instead."
    : `A ${type.toLowerCase()} evaluation already exists for this internship assignment.`;
}

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error &&
    (error.code === "P2002" || error.code === "23505"));
}

export async function createEvaluation(formData: FormData) {
  const c = await requireSupervisorEvaluationContext();
  const parsed = evaluationInputSchema.safeParse(Object.fromEntries(formData.entries()));
  const criteria = parseCriteria(formData);
  if (!parsed.success) fail("/evaluations/new", parsed.error.issues[0]?.message ?? "Review the evaluation.");
  if (!criteria.success) fail("/evaluations/new", criteria.error.issues[0]?.message ?? "Review the criteria.");

  const assignment = await assignmentFor(c.profileId, parsed.data.internUserId);
  if (!assignment) fail("/evaluations/new", "Select a directly supervised active Intern.");
  const period = resolveEvaluationPeriod({
    evaluationType: parsed.data.evaluationType,
    weekDate: String(formData.get("weekDate") ?? ""),
    periodStart: parsed.data.periodStart,
    periodEnd: parsed.data.periodEnd,
    assignment: { startDate: assignment.startDate, endDate: assignment.endDate, companyTimezone: assignment.company.timezone },
    now: new Date(),
  });
  if (!period.ok) fail("/evaluations/new", period.message);

  let id: string;
  try {
    const row = await prisma.evaluation.create({
      data: {
        id: randomUUID(),
        assignmentId: assignment.id,
        evaluatorId: c.user.id,
        evaluationType: parsed.data.evaluationType,
        periodKey: period.periodKey,
        evaluationDate: asDate(parsed.data.evaluationDate)!,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        criteriaScores: criteria.data,
        overallScore: parsed.data.overallScore,
        strengths: parsed.data.strengths,
        areasForImprovement: parsed.data.areasForImprovement,
        comments: parsed.data.comments,
        status: "DRAFT",
      },
    });
    id = row.id;
  } catch (error) {
    if (isUniqueConflict(error)) fail("/evaluations/new", duplicateMessage(parsed.data.evaluationType));
    fail("/evaluations/new", "The evaluation could not be saved. Review the details and try again.");
  }
  refresh(id);
  redirect(`/evaluations/${id}`);
}

export async function updateEvaluation(formData: FormData) {
  const c = await requireSupervisorEvaluationContext();
  const id = String(formData.get("evaluationId") ?? "");
  const editPath = `/evaluations/${id}/edit`;
  const parsed = evaluationInputSchema.safeParse(Object.fromEntries(formData.entries()));
  const criteria = parseCriteria(formData);
  if (!parsed.success) fail(editPath, parsed.error.issues[0]?.message ?? "Review the evaluation.");
  if (!criteria.success) fail(editPath, criteria.error.issues[0]?.message ?? "Review the criteria.");

  const assignment = await assignmentFor(c.profileId, parsed.data.internUserId);
  if (!assignment) fail(editPath, "Select a directly supervised active Intern.");
  const period = resolveEvaluationPeriod({
    evaluationType: parsed.data.evaluationType,
    weekDate: String(formData.get("weekDate") ?? ""),
    periodStart: parsed.data.periodStart,
    periodEnd: parsed.data.periodEnd,
    assignment: { startDate: assignment.startDate, endDate: assignment.endDate, companyTimezone: assignment.company.timezone },
    now: new Date(),
  });
  if (!period.ok) fail(editPath, period.message);
  try {
    const result = await prisma.evaluation.updateMany({
      where: {
        id,
        status: "DRAFT",
        evaluatorId: c.user.id,
        assignment: { supervisorProfileId: c.profileId, status: "ACTIVE" },
      },
      data: {
        assignmentId: assignment.id,
        evaluationType: parsed.data.evaluationType,
        periodKey: period.periodKey,
        evaluationDate: asDate(parsed.data.evaluationDate)!,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        criteriaScores: criteria.data,
        overallScore: parsed.data.overallScore,
        strengths: parsed.data.strengths,
        areasForImprovement: parsed.data.areasForImprovement,
        comments: parsed.data.comments,
      },
    });
    if (result.count !== 1) fail(editPath, "Only your directly supervised active draft can be edited.");
  } catch (error) {
    if (isUniqueConflict(error)) fail(editPath, duplicateMessage(parsed.data.evaluationType));
    // Next.js redirects are control-flow errors; never swallow a redirect
    // originating in the guarded count check.
    if (error && typeof error === "object" && "digest" in error &&
        typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) throw error;
    fail(editPath, "The evaluation could not be updated. Review the details and try again.");
  }
  refresh(id);
  redirect(`/evaluations/${id}`);
}

export async function finalizeEvaluation(formData: FormData) {
  const c = await requireSupervisorEvaluationContext();
  const id = String(formData.get("evaluationId") ?? "");
  const result = await prisma.evaluation.updateMany({
    where: { id, status: "DRAFT", evaluatorId: c.user.id, assignment: { supervisorProfileId: c.profileId } },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });
  if (result.count !== 1) fail(`/evaluations/${id}`, "This evaluation is unavailable or already finalized.");
  refresh(id);
  redirect(`/evaluations/${id}`);
}

export async function acknowledgeEvaluation(formData: FormData) {
  const c = await requireEvaluationViewer();
  if (c.kind !== "INTERN") redirect("/evaluations");
  const id = String(formData.get("evaluationId") ?? "");
  const result = await prisma.evaluation.updateMany({
    where: { id, status: "SUBMITTED", assignment: { internProfileId: c.profileId } },
    data: { status: "ACKNOWLEDGED", acknowledgedById: c.user.id, acknowledgedAt: new Date() },
  });
  if (result.count !== 1) redirect("/evaluations");
  refresh(id);
  redirect(`/evaluations/${id}`);
}

export async function createFeedback(formData: FormData) {
  const c = await requireSupervisorEvaluationContext();
  const parsed = feedbackInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) fail("/feedback/new", parsed.error.issues[0]?.message ?? "Review the feedback.");
  const assignment = await assignmentFor(c.profileId, parsed.data.internUserId);
  if (!assignment) fail("/feedback/new", "Select a directly supervised active Intern.");
  await prisma.feedback.create({
    data: {
      id: randomUUID(), assignmentId: assignment.id,
      authorId: c.user.id, recipientId: assignment.internProfile.userId,
      feedbackType: parsed.data.feedbackType, visibility: parsed.data.visibility,
      title: parsed.data.title || null, content: parsed.data.content,
    },
  });
  refresh();
  redirect("/feedback");
}

export async function markFeedbackRead(formData: FormData) {
  const c = await requireEvaluationViewer();
  if (c.kind !== "INTERN") redirect("/feedback");
  const id = String(formData.get("feedbackId") ?? "");
  await prisma.feedback.updateMany({
    where: { id, recipientId: c.user.id, isRead: false, visibility: { in: ["INTERN_AND_STAFF", "INTERN_ONLY"] } },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath(`/feedback/${id}`);
  revalidatePath("/feedback");
}
