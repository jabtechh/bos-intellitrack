import { z } from "zod";

const list = z.string().trim().max(4000).transform((value) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 30));
export const portfolioInputSchema = z.object({
  title: z.string().trim().min(1, "Portfolio title is required.").max(255),
  professionalSummary: z.string().trim().max(5000),
  skills: list,
  achievements: list,
  selectedWork: list,
  reflection: z.string().trim().max(10000),
});

export function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export function portfolioCompleteness(value: { title: string; professionalSummary: string | null; skills: unknown; achievements: unknown; selectedWork: unknown; reflection: string | null } | null) {
  if (!value) return { completed: 0, total: 6 };
  const completed = [value.title, value.professionalSummary, ...[value.skills, value.achievements, value.selectedWork].map((x) => textList(x).length ? "yes" : ""), value.reflection].filter(Boolean).length;
  return { completed, total: 6 };
}
