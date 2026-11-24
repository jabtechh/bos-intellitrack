"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePortfolioViewer } from "@/lib/portfolio/authorization";
import { getPortfolioAssignment, portfolioHref } from "@/lib/portfolio/source";
import { portfolioInputSchema } from "@/lib/portfolio/domain";

export async function savePortfolio(formData: FormData) {
  const c = await requirePortfolioViewer();
  if (c.kind !== "INTERN") redirect("/portfolio");
  // DEC-2026-020: the hidden assignment ID is only a candidate. It is re-authorized against this Intern's own
  // Main Office internships, so a narrative can never be saved onto another internship or another Intern.
  const candidate = formData.get("assignmentId");
  const assignment = await getPortfolioAssignment(c, typeof candidate === "string" && candidate ? candidate : null);
  if (!assignment) redirect("/portfolio/edit?error=No eligible internship record was found.");
  const editPath = portfolioHref(assignment.id, "/edit");
  const parsed = portfolioInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${editPath}&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your portfolio details.")}`);
  const x = parsed.data;
  // Saving personal writing never touches the system-owned completion snapshot (sourceSnapshot) and never
  // downgrades a system-generated or finalized Portfolio's status.
  const keepStatus = assignment.portfolio && assignment.portfolio.status !== "DRAFT" && assignment.portfolio.sourceSnapshot !== null;
  await prisma.portfolio.upsert({ where: { assignmentId: assignment.id }, create: { assignmentId: assignment.id, title: x.title, professionalSummary: x.professionalSummary || null, skills: x.skills, achievements: x.achievements, selectedWork: x.selectedWork, reflection: x.reflection || null, status: "DRAFT", aiGenerated: false }, update: { title: x.title, professionalSummary: x.professionalSummary || null, skills: x.skills, achievements: x.achievements, selectedWork: x.selectedWork, reflection: x.reflection || null, ...(keepStatus ? {} : { status: "DRAFT" as const }), aiGenerated: false, aiProvider: null, aiModel: null, aiGeneratedAt: null, evaluationSummary: null, exportedPdfPath: null, exportedAt: null, versionNumber: { increment: 1 } } });
  redirect(`${portfolioHref(assignment.id)}&saved=1`);
}
