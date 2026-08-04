import { z } from "zod";

export const aiDraftSchema = z.object({
  summary: z.string().trim().min(1).max(4000),
  accomplishments: z.array(z.string().trim().min(1).max(500)).max(8),
  areasForAttention: z.array(z.string().trim().min(1).max(500)).max(8),
  nextSteps: z.array(z.string().trim().min(1).max(500)).max(8),
  sourceLimitations: z.array(z.string().trim().min(1).max(500)).max(8),
});
export type AiDraft = z.infer<typeof aiDraftSchema>;
export type AiState = { status: "idle"|"success"|"disabled"|"blocked"|"rate_limited"|"timeout"|"unavailable"|"invalid"; message?: string; draft?: AiDraft; categories?: string[]; period?: string };
export const initialAiState: AiState = { status: "idle" };
export const aiJsonSchema = { type:"object", additionalProperties:false, required:["summary","accomplishments","areasForAttention","nextSteps","sourceLimitations"], properties:{summary:{type:"string"},accomplishments:{type:"array",items:{type:"string"},maxItems:8},areasForAttention:{type:"array",items:{type:"string"},maxItems:8},nextSteps:{type:"array",items:{type:"string"},maxItems:8},sourceLimitations:{type:"array",items:{type:"string"},maxItems:8}} } as const;

export function parseAiDraft(text: string | undefined): AiDraft {
  if (!text?.trim()) throw new Error("EMPTY_OUTPUT");
  let value: unknown; try { value=JSON.parse(text); } catch { throw new Error("MALFORMED_OUTPUT"); }
  const parsed=aiDraftSchema.safeParse(value); if(!parsed.success) throw new Error("MALFORMED_OUTPUT"); return parsed.data;
}
