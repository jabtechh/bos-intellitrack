import { z } from "zod";

export const aiDraftSchema = z.object({
  summary: z.string().trim().min(1).max(4000),
  accomplishments: z.array(z.string().trim().min(1).max(500)).max(8),
  areasForAttention: z.array(z.string().trim().min(1).max(500)).max(8),
  nextSteps: z.array(z.string().trim().min(1).max(500)).max(8),
  sourceLimitations: z.array(z.string().trim().min(1).max(500)).max(8),
});
export type AiDraft = z.infer<typeof aiDraftSchema>;
export type AiStatus = "idle"|"success"|"disabled"|"blocked"|"rate_limited"|"timeout"|"unavailable"|"invalid";
export type AiState = { status: AiStatus; message?: string; draft?: AiDraft; categories?: string[]; period?: string };
export const initialAiState: AiState = { status: "idle" };

export const aiJsonSchema = {
  type:"object", additionalProperties:false,
  required:["summary","accomplishments","areasForAttention","nextSteps","sourceLimitations"],
  properties:{
    summary:{type:"string"},
    accomplishments:{type:"array",items:{type:"string"},maxItems:8},
    areasForAttention:{type:"array",items:{type:"string"},maxItems:8},
    nextSteps:{type:"array",items:{type:"string"},maxItems:8},
    sourceLimitations:{type:"array",items:{type:"string"},maxItems:8},
  },
} as const;

export const portfolioAiDraftSchema = z.object({
  professionalSummary: z.string().trim().min(1).max(5000),
  skills: z.array(z.string().trim().min(1).max(200)).max(20),
  achievements: z.array(z.string().trim().min(1).max(500)).max(20),
  selectedWork: z.array(z.string().trim().min(1).max(500)).max(20),
  reflection: z.string().trim().min(1).max(10000),
  sourceLimitations: z.array(z.string().trim().min(1).max(500)).max(8),
});
export type PortfolioAiDraft = z.infer<typeof portfolioAiDraftSchema>;
export type PortfolioAiState = { status: AiStatus; message?: string; draft?: PortfolioAiDraft; categories?: string[]; period?: string };
export const initialPortfolioAiState: PortfolioAiState = { status:"idle" };

export const portfolioAiJsonSchema = {
  type:"object", additionalProperties:false,
  required:["professionalSummary","skills","achievements","selectedWork","reflection","sourceLimitations"],
  properties:{
    professionalSummary:{type:"string"},
    skills:{type:"array",items:{type:"string"},maxItems:20},
    achievements:{type:"array",items:{type:"string"},maxItems:20},
    selectedWork:{type:"array",items:{type:"string"},maxItems:20},
    reflection:{type:"string"},
    sourceLimitations:{type:"array",items:{type:"string"},maxItems:8},
  },
} as const;

export function parseAiDraft(text: string | undefined): AiDraft {
  if (!text?.trim()) throw new Error("EMPTY_OUTPUT");
  let value: unknown;
  try { value=JSON.parse(text); } catch { throw new Error("MALFORMED_OUTPUT"); }
  const parsed=aiDraftSchema.safeParse(value);
  if(!parsed.success) throw new Error("MALFORMED_OUTPUT");
  return parsed.data;
}

export function parsePortfolioAiDraft(text:string|undefined):PortfolioAiDraft {
  if(!text?.trim())throw new Error("EMPTY_OUTPUT");
  let value:unknown;
  try{value=JSON.parse(text)}catch{throw new Error("MALFORMED_OUTPUT")}
  const parsed=portfolioAiDraftSchema.safeParse(value);
  if(!parsed.success)throw new Error("MALFORMED_OUTPUT");
  return parsed.data;
}
