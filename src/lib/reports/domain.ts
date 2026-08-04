import { z } from "zod";

export const reportPeriodSchema = z.object({
  from: z.string().date().optional().or(z.literal("")),
  to: z.string().date().optional().or(z.literal("")),
}).superRefine((x, c) => { if (x.from && x.to && x.from > x.to) c.addIssue({ code: "custom", message: "Start date must be on or before end date." }); });
export function reportPeriod(input: { from?: string; to?: string }) {
  const parsed = reportPeriodSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid report period." } as const;
  return { from: parsed.data.from ? new Date(`${parsed.data.from}T00:00:00.000Z`) : undefined, to: parsed.data.to ? new Date(`${parsed.data.to}T23:59:59.999Z`) : undefined } as const;
}
export function safePdfFilename(name: string, generated = new Date()) {
  const safe = name.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "intern";
  return `intellitrack-${safe}-${generated.toISOString().slice(0, 10)}.pdf`;
}
export const RESTRICTED_DOCUMENT_CATEGORIES = ["IDENTIFICATION", "MEDICAL_DOCUMENT"] as const;
