"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/require-current-user";
import { workmateEligible, workmateFeedbackInputSchema } from "@/lib/feedback/domain";
import { prisma } from "@/lib/prisma";

function fail(message:string):never {
  redirect(`/feedback/workmate/new?error=${encodeURIComponent(message)}`);
}

export async function createWorkmateFeedback(formData:FormData) {
  const user = await requireCurrentUser();
  if (user.role !== "INTERN") redirect("/dashboard");

  const parsed = workmateFeedbackInputSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Review the feedback.");

  const actor = await prisma.internProfile.findUnique({
    where: { userId: user.id },
    select: {
      assignments: {
        where: { status: "ACTIVE" },
        orderBy: { activatedAt: "desc" },
        take: 1,
        select: { id:true, supervisorProfileId:true, startDate:true, endDate:true, status:true, internProfile:{select:{userId:true}} },
      },
    },
  });
  const actorAssignment = actor?.assignments[0];
  if (!actorAssignment) fail("No active internship relationship is available.");

  const recipientAssignment = await prisma.internshipAssignment.findFirst({
    where: {
      status: "ACTIVE",
      supervisorProfileId: actorAssignment.supervisorProfileId,
      internProfile: { userId: parsed.data.recipientUserId, user: { isActive: true } },
      startDate: { lte: actorAssignment.endDate },
      endDate: { gte: actorAssignment.startDate },
    },
    select: { id:true, supervisorProfileId:true, startDate:true, endDate:true, status:true, internProfile:{select:{userId:true}} },
  });

  if (!recipientAssignment || !workmateEligible(
    { userId: actorAssignment.internProfile.userId, status: actorAssignment.status, supervisorProfileId: actorAssignment.supervisorProfileId, startDate: actorAssignment.startDate, endDate: actorAssignment.endDate },
    { userId: recipientAssignment.internProfile.userId, status: recipientAssignment.status, supervisorProfileId: recipientAssignment.supervisorProfileId, startDate: recipientAssignment.startDate, endDate: recipientAssignment.endDate },
  )) fail("That Intern is not an eligible workmate for this internship.");

  await prisma.feedback.create({
    data: {
      id: randomUUID(),
      assignmentId: recipientAssignment.id,
      authorId: user.id,
      recipientId: recipientAssignment.internProfile.userId,
      feedbackType: parsed.data.feedbackType,
      visibility: "INTERN_AND_STAFF",
      title: parsed.data.title || null,
      content: parsed.data.content,
    },
  });

  revalidatePath("/feedback");
  revalidatePath("/insights");
  revalidatePath("/portfolio");
  redirect("/feedback?shared=1");
}
