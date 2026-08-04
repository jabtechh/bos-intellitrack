"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePortfolioViewer, portfolioAssignmentWhere } from "@/lib/portfolio/authorization";
import { portfolioInputSchema } from "@/lib/portfolio/domain";

export async function savePortfolio(formData: FormData) {
  const c = await requirePortfolioViewer();
  if (c.kind !== "INTERN") redirect("/portfolio");
  const parsed = portfolioInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/portfolio/edit?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your portfolio details.")}`);
  const assignment = await prisma.internshipAssignment.findFirst({ where: portfolioAssignmentWhere(c), select: { id: true } });
  if (!assignment) redirect("/portfolio/edit?error=No active internship was found.");
  const x = parsed.data;
  await prisma.portfolio.upsert({ where: { assignmentId: assignment.id }, create: { assignmentId: assignment.id, title: x.title, professionalSummary: x.professionalSummary || null, skills: x.skills, achievements: x.achievements, selectedWork: x.selectedWork, reflection: x.reflection || null, status: "DRAFT", aiGenerated: false }, update: { title: x.title, professionalSummary: x.professionalSummary || null, skills: x.skills, achievements: x.achievements, selectedWork: x.selectedWork, reflection: x.reflection || null, status: "DRAFT", aiGenerated: false, aiProvider: null, aiModel: null, aiGeneratedAt: null, evaluationSummary: null, exportedPdfPath: null, exportedAt: null, versionNumber: { increment: 1 } } });
  redirect("/portfolio?saved=1");
}
